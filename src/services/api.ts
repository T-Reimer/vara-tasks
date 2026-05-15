import type {
  ProjectRecord,
  ServerJoinPayload,
  ServerProfile,
  SyncFileEntry,
  SyncOperation,
} from "../models/types";

interface TransactionResult {
  path: string;
  success: boolean;
  mtime: number;
  conflict: boolean;
  error?: string;
}

interface TransactionsResponse {
  results: TransactionResult[];
}

interface SyncChangesResponse {
  files: SyncFileEntry[];
}

interface LoginResponse {
  token: string;
  expiresIn: number;
  userId: string;
}

export async function loginToServer(params: {
  baseUrl: string;
  code: string;
  deviceName: string;
}): Promise<LoginResponse> {
  const baseUrl = params.baseUrl.trim().replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: params.code,
      clientId: crypto.randomUUID(),
      deviceName: params.deviceName,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed (${response.status})`);
  }

  return (await response.json()) as LoginResponse;
}

export async function fetchServerJoinPayload(params: {
  server: ServerProfile;
}): Promise<ServerJoinPayload> {
  const response = await fetch(`${params.server.baseUrl}/api/auth/qrcode`, {
    headers: {
      Authorization: `Bearer ${params.server.authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to generate QR payload (${response.status})`);
  }

  return (await response.json()) as ServerJoinPayload;
}

export function resolveServerProfile(
  project: ProjectRecord,
  serverProfiles: ServerProfile[],
): ServerProfile | null {
  if (project.connectionMode !== "server" || !project.serverId) {
    return null;
  }

  return serverProfiles.find((item) => item.id === project.serverId) ?? null;
}

export function resolveServerUrl(
  project: ProjectRecord,
  serverProfiles: ServerProfile[],
): string | null {
  return resolveServerProfile(project, serverProfiles)?.baseUrl ?? null;
}

export async function postTransactions(params: {
  project: ProjectRecord;
  serverProfiles: ServerProfile[];
  operations: SyncOperation[];
}): Promise<TransactionsResponse> {
  const profile = resolveServerProfile(params.project, params.serverProfiles);
  if (!profile) {
    throw new Error("No server configured for this project");
  }

  const response = await fetch(`${profile.baseUrl}/api/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${profile.authToken}`,
    },
    body: JSON.stringify({ operations: params.operations }),
  });

  if (!response.ok) {
    throw new Error(`Server request failed (${response.status})`);
  }

  return (await response.json()) as TransactionsResponse;
}

export async function getSyncChanges(params: {
  server: ServerProfile;
  since: number;
  paths?: string[];
}): Promise<SyncChangesResponse> {
  const url = new URL(`${params.server.baseUrl}/api/sync`);
  url.searchParams.set("since", String(params.since));
  if (params.paths?.length) {
    url.searchParams.set("paths", JSON.stringify(params.paths));
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${params.server.authToken}` },
  });

  if (!response.ok) {
    throw new Error(`Sync fetch failed (${response.status})`);
  }

  return (await response.json()) as SyncChangesResponse;
}

export async function getFile(params: {
  server: ServerProfile;
  path: string;
}): Promise<unknown> {
  const response = await fetch(
    `${params.server.baseUrl}/api/files/${encodeURIComponent(params.path)}`,
    {
      headers: { Authorization: `Bearer ${params.server.authToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(`File fetch failed (${response.status})`);
  }

  return response.json();
}

