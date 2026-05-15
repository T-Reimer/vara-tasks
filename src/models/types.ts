export type ConnectionMode = "local" | "server";

export type LabelType = "text" | "date" | "dropdown";

export type SyncStatus = "synced" | "pending" | "error";

export type OperationType = "create" | "update" | "delete";

export type TargetType = "project" | "task";

export interface ServerProfile {
  id: string;
  name: string;
  baseUrl: string;
  authToken: string;
  userId: string;
  lastAuthenticatedAt: string;
  createdAt: string;
}

export interface ServerJoinPayload {
  serverUrl: string;
  token: string;
  userId: string;
  expiresAt?: string;
}

/** EditorJS output block format */
export interface EditorBlock {
  type: string;
  data: Record<string, unknown>;
}

export interface EditorContent {
  blocks: EditorBlock[];
}

export interface ProjectRecord {
  id: string;
  title: string;
  description?: EditorContent;
  connectionMode: ConnectionMode;
  serverId: string | null;
  dueBy?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface TaskRecord {
  id: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description?: EditorContent;
  completed: boolean;
  dueBy?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface AttachmentMeta {
  id: string;
  projectId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  syncStatus: SyncStatus;
  /** base64-encoded blob stored locally */
  localBlob?: string;
}

/** Maps attachmentId → taskId[] */
export type AttachmentIndex = Record<string, string[]>;

export interface Label {
  id: string;
  /** null means global label */
  projectId: string | null;
  title: string;
  type: LabelType;
  color: string;
  options?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LabelAssignment {
  labelId: string;
  targetId: string;
  targetType: TargetType;
  value: string;
}

export interface SyncQueueItem {
  id: string;
  operationType: OperationType;
  entityType: "project" | "task" | "attachment" | "label";
  entityId: string;
  projectId: string;
  path: string;
  content?: unknown;
  mtime: number;
  timestamp: string;
  retries: number;
  lastError?: string;
}

export interface SyncOperation {
  type: OperationType;
  path: string;
  content?: unknown;
  mtime: number;
  clientId: string;
}

export interface SyncFileEntry {
  path: string;
  mtime: number;
  size: number;
  hash: string;
}
