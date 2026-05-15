import type { ProjectRecord, ServerProfile, SyncOperation } from "../models/types";
import { postTransactions } from "./api";

export async function routeSyncOperation(params: {
  project: ProjectRecord;
  serverProfiles: ServerProfile[];
  operation: SyncOperation;
}): Promise<{ mode: "local" | "server"; success: boolean; detail: string }> {
  if (params.project.connectionMode === "local") {
    return {
      mode: "local",
      success: true,
      detail: "Local-only project; remote sync skipped",
    };
  }

  try {
    await postTransactions({
      project: params.project,
      serverProfiles: params.serverProfiles,
      operations: [params.operation],
    });
  } catch (error) {
    return {
      mode: "server",
      success: false,
      detail: error instanceof Error ? error.message : "Sync failed",
    };
  }

  return {
    mode: "server",
    success: true,
    detail: "Synced with configured server",
  };
}
