import type {
  Label,
  LabelAssignment,
  LabelType,
  TargetType,
} from "../models/types";
import { loadJSON, saveJSON } from "./storage";

const GLOBAL_LABELS_KEY = "vara.labels.global";

function projectLabelsKey(projectId: string): string {
  return `vara.labels.${projectId}`;
}

function assignmentsKey(projectId: string): string {
  return `vara.label-assignments.${projectId}`;
}

// ─── Label CRUD ────────────────────────────────────────────────────────────

export function listGlobalLabels(): Label[] {
  return loadJSON<Label[]>(GLOBAL_LABELS_KEY, []);
}

export function listProjectLabels(projectId: string): Label[] {
  return loadJSON<Label[]>(projectLabelsKey(projectId), []);
}

export function listAllLabels(projectId: string): Label[] {
  return [...listGlobalLabels(), ...listProjectLabels(projectId)];
}

export function getLabel(labelId: string, projectId?: string): Label | null {
  const global = listGlobalLabels().find((l) => l.id === labelId);
  if (global) return global;
  if (projectId)
    return listProjectLabels(projectId).find((l) => l.id === labelId) ?? null;
  return null;
}

export function createLabel(input: {
  projectId: string | null;
  title: string;
  type: LabelType;
  color: string;
  options?: string[];
}): Label {
  const now = new Date().toISOString();
  const label: Label = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    title: input.title.trim(),
    type: input.type,
    color: input.color,
    options: input.type === "dropdown" ? (input.options ?? []) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (input.projectId === null) {
    const labels = listGlobalLabels();
    labels.push(label);
    saveJSON(GLOBAL_LABELS_KEY, labels);
  } else {
    const labels = listProjectLabels(input.projectId);
    labels.push(label);
    saveJSON(projectLabelsKey(input.projectId), labels);
  }

  return label;
}

export function updateLabel(
  labelId: string,
  changes: Partial<Pick<Label, "title" | "color" | "options">>,
  projectId?: string,
): Label | null {
  const applyUpdate = (
    labels: Label[],
  ): { updated: Label | null; next: Label[] } => {
    const index = labels.findIndex((l) => l.id === labelId);
    if (index === -1) return { updated: null, next: labels };
    const updated: Label = {
      ...labels[index],
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    const next = [...labels];
    next[index] = updated;
    return { updated, next };
  };

  {
    const globals = listGlobalLabels();
    const { updated, next } = applyUpdate(globals);
    if (updated) {
      saveJSON(GLOBAL_LABELS_KEY, next);
      return updated;
    }
  }

  if (projectId) {
    const projLabels = listProjectLabels(projectId);
    const { updated, next } = applyUpdate(projLabels);
    if (updated) {
      saveJSON(projectLabelsKey(projectId), next);
      return updated;
    }
  }

  return null;
}

export function deleteLabel(labelId: string, projectId?: string): boolean {
  const globals = listGlobalLabels();
  const nextGlobals = globals.filter((l) => l.id !== labelId);
  if (nextGlobals.length !== globals.length) {
    saveJSON(GLOBAL_LABELS_KEY, nextGlobals);
    return true;
  }

  if (projectId) {
    const projLabels = listProjectLabels(projectId);
    const nextProj = projLabels.filter((l) => l.id !== labelId);
    if (nextProj.length !== projLabels.length) {
      saveJSON(projectLabelsKey(projectId), nextProj);
      return true;
    }
  }

  return false;
}

// ─── Label Assignments ─────────────────────────────────────────────────────

export function listAssignments(projectId: string): LabelAssignment[] {
  return loadJSON<LabelAssignment[]>(assignmentsKey(projectId), []);
}

export function getAssignmentsForTarget(
  projectId: string,
  targetId: string,
): LabelAssignment[] {
  return listAssignments(projectId).filter((a) => a.targetId === targetId);
}

export function setLabelValue(
  projectId: string,
  labelId: string,
  targetId: string,
  targetType: TargetType,
  value: string,
): LabelAssignment {
  const assignments = listAssignments(projectId);
  const existing = assignments.findIndex(
    (a) => a.labelId === labelId && a.targetId === targetId,
  );

  const assignment: LabelAssignment = { labelId, targetId, targetType, value };

  if (existing === -1) {
    assignments.push(assignment);
  } else {
    assignments[existing] = assignment;
  }

  saveJSON(assignmentsKey(projectId), assignments);
  return assignment;
}

export function removeLabelValue(
  projectId: string,
  labelId: string,
  targetId: string,
): boolean {
  const assignments = listAssignments(projectId);
  const next = assignments.filter(
    (a) => !(a.labelId === labelId && a.targetId === targetId),
  );
  if (next.length === assignments.length) return false;
  saveJSON(assignmentsKey(projectId), next);
  return true;
}

export function filterTasksByLabel(
  projectId: string,
  taskIds: string[],
  filters: { labelId: string; value: string }[],
): string[] {
  if (filters.length === 0) return taskIds;
  const assignments = listAssignments(projectId);

  return taskIds.filter((taskId) =>
    filters.every(({ labelId, value }) =>
      assignments.some(
        (a) =>
          a.targetId === taskId && a.labelId === labelId && a.value === value,
      ),
    ),
  );
}
