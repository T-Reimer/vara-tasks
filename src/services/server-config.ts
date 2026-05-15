import type { ServerJoinPayload, ServerProfile } from "../models/types";
import { loadJSON, saveJSON } from "./storage";

const SERVER_STORAGE_KEY = "vara.serverProfiles";

export function listServerProfiles(): ServerProfile[] {
  return loadJSON<ServerProfile[]>(SERVER_STORAGE_KEY, []);
}

export function createServerProfile(input: {
  baseUrl: string;
  authToken: string;
  userId: string;
  name?: string;
}): ServerProfile {
  const now = new Date().toISOString();
  const normalizedBaseUrl = input.baseUrl.trim().replace(/\/$/, "");
  const profiles = listServerProfiles();
  const existing = profiles.find(
    (profile) => profile.baseUrl === normalizedBaseUrl && profile.userId === input.userId,
  );

  const profile: ServerProfile = existing
    ? {
        ...existing,
        authToken: input.authToken,
        name: input.name?.trim() || existing.name,
        lastAuthenticatedAt: now,
      }
    : {
        id: crypto.randomUUID(),
        name: input.name?.trim() || inferServerName(normalizedBaseUrl),
        baseUrl: normalizedBaseUrl,
        authToken: input.authToken,
        userId: input.userId,
        lastAuthenticatedAt: now,
        createdAt: now,
      };

  const nextProfiles = existing
    ? profiles.map((item) => (item.id === existing.id ? profile : item))
    : [...profiles, profile];
  saveJSON(SERVER_STORAGE_KEY, nextProfiles);
  return profile;
}

export function updateServerProfileName(serverId: string, name: string): ServerProfile | null {
  const profiles = listServerProfiles();
  const trimmed = name.trim();
  const existing = profiles.find((profile) => profile.id === serverId);
  if (!existing || !trimmed) {
    return null;
  }

  const updated: ServerProfile = { ...existing, name: trimmed };
  saveJSON(
    SERVER_STORAGE_KEY,
    profiles.map((profile) => (profile.id === serverId ? updated : profile)),
  );
  return updated;
}

export function parseServerJoinPayload(raw: string): ServerJoinPayload {
  const parsed = JSON.parse(raw) as Partial<ServerJoinPayload>;
  const serverUrl = parsed.serverUrl?.trim().replace(/\/$/, "");
  const token = parsed.token?.trim();
  const userId = parsed.userId?.trim();

  if (!serverUrl || !token || !userId) {
    throw new Error("Payload must include serverUrl, token, and userId.");
  }

  return {
    serverUrl,
    token,
    userId,
    expiresAt: parsed.expiresAt,
  };
}

function inferServerName(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return "Unnamed Server";
  }
}
