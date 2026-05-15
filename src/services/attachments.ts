import type { AttachmentIndex, AttachmentMeta } from "../models/types";
import { loadJSON, saveJSON } from "./storage";

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

function metaKey(projectId: string): string {
  return `vara.attachments.${projectId}`;
}

function indexKey(projectId: string): string {
  return `vara.attachment-index.${projectId}`;
}

function blobKey(projectId: string, attachmentId: string): string {
  return `vara.blob.${projectId}.${attachmentId}`;
}

// ─── Metadata ──────────────────────────────────────────────────────────────

export function listAttachments(projectId: string): AttachmentMeta[] {
  return loadJSON<AttachmentMeta[]>(metaKey(projectId), []);
}

export function getAttachment(
  projectId: string,
  attachmentId: string,
): AttachmentMeta | null {
  return listAttachments(projectId).find((a) => a.id === attachmentId) ?? null;
}

export function listAttachmentsForTask(
  projectId: string,
  taskId: string,
): AttachmentMeta[] {
  const index = loadJSON<AttachmentIndex>(indexKey(projectId), {});
  const all = listAttachments(projectId);
  const attachmentIds = new Set<string>();
  for (const [attachId, taskIds] of Object.entries(index)) {
    if (taskIds.includes(taskId)) {
      attachmentIds.add(attachId);
    }
  }
  return all.filter((a) => attachmentIds.has(a.id));
}

// ─── Blob Storage ──────────────────────────────────────────────────────────

export function storeBlob(
  projectId: string,
  attachmentId: string,
  base64: string,
): void {
  localStorage.setItem(blobKey(projectId, attachmentId), base64);
}

export function loadBlob(
  projectId: string,
  attachmentId: string,
): string | null {
  return localStorage.getItem(blobKey(projectId, attachmentId));
}

export function removeBlob(projectId: string, attachmentId: string): void {
  localStorage.removeItem(blobKey(projectId, attachmentId));
}

// ─── File ingestion ────────────────────────────────────────────────────────

export async function ingestFile(
  projectId: string,
  file: File,
  taskId?: string,
): Promise<AttachmentMeta> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("File exceeds 4MB limit");
  }

  const base64 = await fileToBase64(file);
  const now = new Date().toISOString();

  const meta: AttachmentMeta = {
    id: crypto.randomUUID(),
    projectId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    uploadedAt: now,
    syncStatus: "pending",
  };

  // Store blob first so metadata is never committed for a missing blob.
  storeBlob(projectId, meta.id, base64);
  let metadataSaved = false;

  try {
    const metas = listAttachments(projectId);
    metas.push(meta);
    saveJSON(metaKey(projectId), metas);
    metadataSaved = true;

    if (taskId) {
      linkAttachmentToTask(projectId, meta.id, taskId);
    }
  } catch (error) {
    try {
      if (!metadataSaved) {
        removeBlob(projectId, meta.id);
      }
      const index = loadJSON<AttachmentIndex>(indexKey(projectId), {});
      if (index[meta.id]) {
        if (metadataSaved) {
          index[meta.id] = index[meta.id].filter((id) => id !== taskId);
          if (index[meta.id].length === 0) {
            delete index[meta.id];
          }
        } else {
          delete index[meta.id];
        }
        saveJSON(indexKey(projectId), index);
      }
    } catch {
      // Best effort cleanup only.
    }
    throw error;
  }

  return meta;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getObjectUrl(
  projectId: string,
  meta: AttachmentMeta,
): string | null {
  const base64 = loadBlob(projectId, meta.id);
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: meta.mimeType });
  return URL.createObjectURL(blob);
}

// ─── Index (attachment ↔ task) ─────────────────────────────────────────────

export function linkAttachmentToTask(
  projectId: string,
  attachmentId: string,
  taskId: string,
): void {
  const index = loadJSON<AttachmentIndex>(indexKey(projectId), {});
  const taskIds = index[attachmentId] ?? [];
  if (!taskIds.includes(taskId)) {
    index[attachmentId] = [...taskIds, taskId];
    saveJSON(indexKey(projectId), index);
  }
}

export function unlinkAttachmentFromTask(
  projectId: string,
  attachmentId: string,
  taskId: string,
): void {
  const index = loadJSON<AttachmentIndex>(indexKey(projectId), {});
  if (index[attachmentId]) {
    index[attachmentId] = index[attachmentId].filter((id) => id !== taskId);
    saveJSON(indexKey(projectId), index);
  }
}

export function getLinkedTasks(
  projectId: string,
  attachmentId: string,
): string[] {
  const index = loadJSON<AttachmentIndex>(indexKey(projectId), {});
  return index[attachmentId] ?? [];
}

export function deleteAttachment(
  projectId: string,
  attachmentId: string,
): boolean {
  const metas = listAttachments(projectId);
  const next = metas.filter((a) => a.id !== attachmentId);
  if (next.length === metas.length) return false;
  saveJSON(metaKey(projectId), next);
  removeBlob(projectId, attachmentId);

  const index = loadJSON<AttachmentIndex>(indexKey(projectId), {});
  delete index[attachmentId];
  saveJSON(indexKey(projectId), index);

  return true;
}

export function updateAttachmentSyncStatus(
  projectId: string,
  attachmentId: string,
  syncStatus: AttachmentMeta["syncStatus"],
): void {
  const metas = loadJSON<AttachmentMeta[]>(metaKey(projectId), []);
  const index = metas.findIndex((a) => a.id === attachmentId);
  if (index !== -1) {
    metas[index] = { ...metas[index], syncStatus };
    saveJSON(metaKey(projectId), metas);
  }
}
