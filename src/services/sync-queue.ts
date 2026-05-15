import type { OperationType, SyncQueueItem } from "../models/types";
import { loadJSON, saveJSON } from "./storage";

const QUEUE_KEY = "vara.sync-queue";

export function loadQueue(): SyncQueueItem[] {
  return loadJSON<SyncQueueItem[]>(QUEUE_KEY, []);
}

export function enqueue(
  item: Omit<SyncQueueItem, "id" | "timestamp" | "retries">,
): SyncQueueItem {
  const entry: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    retries: 0,
  };
  const queue = loadQueue();
  queue.push(entry);
  saveJSON(QUEUE_KEY, queue);
  return entry;
}

export function dequeue(itemId: string): void {
  const queue = loadQueue().filter((item) => item.id !== itemId);
  saveJSON(QUEUE_KEY, queue);
}

export function dequeueMany(itemIds: string[]): void {
  const ids = new Set(itemIds);
  const queue = loadQueue().filter((item) => !ids.has(item.id));
  saveJSON(QUEUE_KEY, queue);
}

export function incrementRetry(
  itemId: string,
  error?: string,
): SyncQueueItem | null {
  const queue = loadQueue();
  const index = queue.findIndex((item) => item.id === itemId);
  if (index === -1) return null;
  queue[index] = {
    ...queue[index],
    retries: queue[index].retries + 1,
    lastError: error,
  };
  saveJSON(QUEUE_KEY, queue);
  return queue[index];
}

export function nextBatch(size = 50): SyncQueueItem[] {
  return loadQueue()
    .filter((item) => item.retries < 5)
    .slice(0, size);
}

export function clearQueue(): void {
  saveJSON(QUEUE_KEY, []);
}

export function pendingCount(): number {
  return loadQueue().filter((item) => item.retries < 5).length;
}

export function failedCount(): number {
  return loadQueue().filter((item) => item.retries >= 5).length;
}

export function enqueueProjectOp(params: {
  operationType: OperationType;
  projectId: string;
  content?: unknown;
}): SyncQueueItem {
  return enqueue({
    operationType: params.operationType,
    entityType: "project",
    entityId: params.projectId,
    projectId: params.projectId,
    path: `projects/${params.projectId}/project.json`,
    content: params.content,
    mtime: Date.now(),
  });
}

export function enqueueTaskOp(params: {
  operationType: OperationType;
  projectId: string;
  taskId: string;
  content?: unknown;
}): SyncQueueItem {
  return enqueue({
    operationType: params.operationType,
    entityType: "task",
    entityId: params.taskId,
    projectId: params.projectId,
    path: `projects/${params.projectId}/tasks/${params.taskId}.json`,
    content: params.content,
    mtime: Date.now(),
  });
}
