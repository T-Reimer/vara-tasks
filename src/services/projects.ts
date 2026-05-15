import type {
  ConnectionMode,
  EditorContent,
  ProjectRecord,
} from "../models/types";
import { loadJSON, saveJSON } from "./storage";

const PROJECT_STORAGE_KEY = "vara.projects";

export function listProjects(): ProjectRecord[] {
  const projects = loadJSON<ProjectRecord[]>(PROJECT_STORAGE_KEY, []);
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProject(id: string): ProjectRecord | null {
  return listProjects().find((p) => p.id === id) ?? null;
}

export function createProject(input: {
  title: string;
  connectionMode: ConnectionMode;
  serverId: string | null;
  description?: EditorContent;
  dueBy?: string;
}): ProjectRecord {
  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    connectionMode: input.connectionMode,
    serverId: input.serverId,
    description: input.description,
    dueBy: input.dueBy,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  };

  const projects = loadJSON<ProjectRecord[]>(PROJECT_STORAGE_KEY, []);
  projects.push(project);
  saveJSON(PROJECT_STORAGE_KEY, projects);
  return project;
}

export function updateProject(
  id: string,
  changes: Partial<
    Pick<ProjectRecord, "title" | "description" | "dueBy" | "syncStatus">
  >,
): ProjectRecord | null {
  const projects = loadJSON<ProjectRecord[]>(PROJECT_STORAGE_KEY, []);
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const updated: ProjectRecord = {
    ...projects[index],
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  projects[index] = updated;
  saveJSON(PROJECT_STORAGE_KEY, projects);
  return updated;
}

export function deleteProject(id: string): boolean {
  const projects = loadJSON<ProjectRecord[]>(PROJECT_STORAGE_KEY, []);
  const next = projects.filter((p) => p.id !== id);
  if (next.length === projects.length) return false;
  saveJSON(PROJECT_STORAGE_KEY, next);
  return true;
}
