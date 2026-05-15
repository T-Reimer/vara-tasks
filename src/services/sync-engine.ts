import type { SyncQueueItem } from "../models/types";
import { getSyncChanges, postTransactions } from "./api";
import { getClientId } from "./client-id";
import { getProject, updateProject } from "./projects";
import { listServerProfiles } from "./server-config";
import { dequeueMany, failedCount, incrementRetry, nextBatch, pendingCount } from "./sync-queue";
import { updateTask } from "./tasks";

const LAST_SYNC_KEY = "vara.last-sync-ts";

export function getLastSyncTs(): number {
  const raw = localStorage.getItem(LAST_SYNC_KEY);
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setLastSyncTs(ts: number): void {
  localStorage.setItem(LAST_SYNC_KEY, String(ts));
}

// ─── Debounce ──────────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;

type SyncListener = (state: SyncState) => void;
const listeners = new Set<SyncListener>();

export interface SyncState {
  isSyncing: boolean;
  pending: number;
  failed: number;
  lastError: string | null;
  lastSyncAt: number;
  isOnline: boolean;
}

let currentState: SyncState = {
  isSyncing: false,
  pending: pendingCount(),
  failed: failedCount(),
  lastError: null,
  lastSyncAt: getLastSyncTs(),
  isOnline: navigator.onLine,
};

function emit(patch: Partial<SyncState>): void {
  currentState = { ...currentState, ...patch };
  for (const listener of listeners) {
    listener(currentState);
  }
}

export function getSyncState(): SyncState {
  return currentState;
}

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => listeners.delete(listener);
}

// ─── Network Monitoring ────────────────────────────────────────────────────

window.addEventListener("online", () => {
  emit({ isOnline: true });
  scheduleSyncDebounced();
});

window.addEventListener("offline", () => {
  emit({ isOnline: false });
});

// ─── Public API ────────────────────────────────────────────────────────────

export function scheduleSyncDebounced(): void {
  if (!navigator.onLine) return;
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runSync();
  }, 5000);
}

export async function runSync(): Promise<void> {
  if (isSyncing) return;
  const isOnline = navigator.onLine;

  isSyncing = true;
  emit({ isSyncing: true, lastError: null });

  try {
    await pushPending({ allowServerPush: isOnline });
    if (isOnline) {
      await pullRemoteChanges();
      const now = Date.now();
      setLastSyncTs(now);
      emit({ lastSyncAt: now });
    }
  } catch (error) {
    emit({ lastError: error instanceof Error ? error.message : "Sync error" });
  } finally {
    isSyncing = false;
    emit({ isSyncing: false });
    recalcCounts();
  }
}

// ─── Push ──────────────────────────────────────────────────────────────────

async function pushPending(options?: { allowServerPush?: boolean }): Promise<void> {
  const batch = nextBatch(50);
  if (batch.length === 0) return;

  const serverProfiles = listServerProfiles();
  const byProject = groupBy(batch, (item) => item.projectId);

  const successful: string[] = [];

  for (const [projectId, items] of Object.entries(byProject)) {
    const project = getProject(projectId);
    if (!project || project.connectionMode !== "server") {
      // Local-only: mark all as done
      for (const item of items) {
        successful.push(item.id);
        applyServerMtime(item, item.mtime);
      }
      continue;
    }
    if (options?.allowServerPush === false) {
      continue;
    }

    const profile = serverProfiles.find((s) => s.id === project.serverId);
    if (!profile) {
      for (const item of items) {
        markEntitySyncStatus(item, "error");
        incrementRetry(item.id, "Missing server profile configuration");
      }
      continue;
    }

    const ops = items.map((item) => ({
      type: item.operationType,
      path: item.path,
      content: item.content,
      mtime: item.mtime,
      clientId: getClientId(),
    }));

    try {
      const response = await withExponentialBackoff(() =>
        postTransactions({ project, serverProfiles, operations: ops }),
      );

      for (let i = 0; i < response.results.length; i++) {
        const result = response.results[i];
        const item = items[i];
        if (!item) continue;

        if (result.success) {
          successful.push(item.id);
          // Update local mtime
          applyServerMtime(item, result.mtime);
        } else if (result.conflict) {
          // Conflict requires manual reconciliation in the current UI model.
          markEntitySyncStatus(item, "error");
          successful.push(item.id);
        } else {
          markEntitySyncStatus(item, "error");
          incrementRetry(item.id, result.error);
        }
      }
    } catch (error) {
      for (const item of items) {
        incrementRetry(
          item.id,
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }
  }

  dequeueMany(successful);
  recalcCounts();
}

// _mtime is received from the server but not stored locally — the server is the
// authoritative source for mtimes; the client uses updatedAt for ordering.
function applyServerMtime(item: SyncQueueItem, _mtime: number): void {
  markEntitySyncStatus(item, "synced");
}

function markEntitySyncStatus(
  item: SyncQueueItem,
  syncStatus: "synced" | "error",
): void {
  if (item.entityType === "project") {
    updateProject(item.projectId, { syncStatus });
  } else if (item.entityType === "task") {
    updateTask(item.projectId, item.entityId, { syncStatus });
  }
}

// ─── Pull ──────────────────────────────────────────────────────────────────

async function pullRemoteChanges(): Promise<void> {
  const since = getLastSyncTs();
  const serverProfiles = listServerProfiles();

  for (const profile of serverProfiles) {
    try {
      const { files } = await getSyncChanges({ server: profile, since });
      // Merge remote file changes into local state
      for (const file of files) {
        await applyRemoteFile(file.path, profile.id);
      }
    } catch {
      // Non-fatal: continue with next server
    }
  }
}

async function applyRemoteFile(path: string, _serverId: string): Promise<void> {
  // Lightweight: update syncStatus to reflect server has newer data
  // Full reconciliation happens when the user opens a project
  const parts = path.split("/");
  if (parts[0] === "projects" && parts[2] === "project.json" && parts[1]) {
    updateProject(parts[1], { syncStatus: "synced" });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function recalcCounts(): void {
  emit({ pending: pendingCount(), failed: failedCount() });
}

async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
): Promise<T> {
  let delay = 5000;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      await sleep(delay);
      delay = Math.min(delay * 2, 60000);
      attempt++;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (result[k] ??= []).push(item);
  }
  return result;
}
