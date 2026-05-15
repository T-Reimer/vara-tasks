import type { EditorContent, TaskRecord, TaskStatus } from "../models/types";
import { loadJSON, saveJSON } from "./storage";

function storageKey(projectId: string): string {
  return `vara.tasks.${projectId}`;
}

/** Resolve effective status for tasks that predate the status field. */
export function effectiveStatus(task: TaskRecord): TaskStatus {
  return task.status ?? (task.completed ? "done" : "todo");
}

export function listTasks(projectId: string): TaskRecord[] {
  return loadJSON<TaskRecord[]>(storageKey(projectId), []);
}

export function listRootTasks(projectId: string): TaskRecord[] {
  return listTasks(projectId).filter((t) => t.parentTaskId === null);
}

export function listChildTasks(
  projectId: string,
  parentTaskId: string,
): TaskRecord[] {
  return listTasks(projectId).filter((t) => t.parentTaskId === parentTaskId);
}

export function getTask(projectId: string, taskId: string): TaskRecord | null {
  return listTasks(projectId).find((t) => t.id === taskId) ?? null;
}

export function createTask(input: {
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description?: EditorContent;
  dueBy?: string;
  status?: TaskStatus;
}): TaskRecord {
  const now = new Date().toISOString();
  const status = input.status ?? "todo";
  const task: TaskRecord = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    parentTaskId: input.parentTaskId,
    title: input.title.trim(),
    description: input.description,
    completed: status === "done",
    status,
    dueBy: input.dueBy,
    createdAt: now,
    updatedAt: now,
    syncStatus: "pending",
  };

  const tasks = listTasks(input.projectId);
  tasks.push(task);
  saveJSON(storageKey(input.projectId), tasks);
  return task;
}

export function updateTask(
  projectId: string,
  taskId: string,
  changes: Partial<
    Pick<
      TaskRecord,
      "title" | "description" | "completed" | "dueBy" | "syncStatus" | "status"
    >
  >,
): TaskRecord | null {
  const tasks = loadJSON<TaskRecord[]>(storageKey(projectId), []);
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return null;

  // Keep status and completed in sync
  let resolvedChanges = { ...changes };
  if (changes.status !== undefined && changes.completed === undefined) {
    resolvedChanges.completed = changes.status === "done";
  } else if (changes.completed !== undefined && changes.status === undefined) {
    resolvedChanges.status = changes.completed ? "done" : "todo";
  }

  const existing = tasks[index]!;
  const updated: TaskRecord = {
    ...existing,
    status: effectiveStatus(existing),
    ...resolvedChanges,
    updatedAt: new Date().toISOString(),
  };
  tasks[index] = updated;
  saveJSON(storageKey(projectId), tasks);
  return updated;
}

export function deleteTask(projectId: string, taskId: string): boolean {
  const tasks = loadJSON<TaskRecord[]>(storageKey(projectId), []);
  const withoutTask = tasks.filter((t) => t.id !== taskId);
  const withoutChildren = withoutTask.filter(
    (t) => !isDescendant(t, taskId, tasks),
  );
  if (withoutChildren.length === tasks.length) return false;
  saveJSON(storageKey(projectId), withoutChildren);
  return true;
}

function isDescendant(
  task: TaskRecord,
  ancestorId: string,
  allTasks: TaskRecord[],
): boolean {
  if (task.parentTaskId === null) return false;
  if (task.parentTaskId === ancestorId) return true;
  const parent = allTasks.find((t) => t.id === task.parentTaskId);
  if (!parent) return false;
  return isDescendant(parent, ancestorId, allTasks);
}

export function toggleTaskComplete(
  projectId: string,
  taskId: string,
): TaskRecord | null {
  const task = getTask(projectId, taskId);
  if (!task) return null;
  return updateTask(projectId, taskId, {
    completed: !task.completed,
    syncStatus: "pending",
  });
}

export function searchTasks(projectId: string, query: string): TaskRecord[] {
  const lower = query.toLowerCase();
  return listTasks(projectId).filter(
    (t) =>
      t.title.toLowerCase().includes(lower) ||
      extractEditorText(t.description).toLowerCase().includes(lower),
  );
}

function extractEditorText(content?: EditorContent): string {
  if (!content?.blocks) return "";
  return content.blocks
    .map((b) => {
      const d = b.data as Record<string, unknown>;
      if (typeof d.text === "string") return d.text;
      if (Array.isArray(d.items))
        return (d.items as Array<{ content?: string } | string>)
          .map((i) => (typeof i === "string" ? i : (i.content ?? "")))
          .join(" ");
      return "";
    })
    .join(" ");
}
