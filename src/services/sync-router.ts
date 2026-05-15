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

  await postTransactions({
    project: params.project,
    serverProfiles: params.serverProfiles,
    operations: [params.operation],
  });

  return {
    mode: "server",
    success: true,
    detail: "Synced with configured server",
  };
}
