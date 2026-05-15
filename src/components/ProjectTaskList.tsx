import { For, Show, type Component } from "solid-js";
import { A } from "@solidjs/router";
import type { Label, LabelAssignment, TaskRecord } from "../models/types";
import { effectiveStatus } from "../services/tasks";
import LabelBadge from "./LabelBadge";

interface ProjectTaskListProps {
  tasks: TaskRecord[];
  projectId: string;
  labels: Label[];
  getAssignments: (taskId: string) => LabelAssignment[];
  onToggleComplete: (task: TaskRecord) => void;
  onDelete: (task: TaskRecord) => void;
}

const ProjectTaskList: Component<ProjectTaskListProps> = (props) => {
  return (
    <Show
      when={props.tasks.length > 0}
      fallback={
        <div class="text-center py-5 text-muted">
          <i
            class="fas fa-clipboard-list fa-3x mb-3 d-block"
            style={{ color: "#d1d5db" }}
          />
          <p class="mb-0">No tasks yet. Add one above.</p>
        </div>
      }
    >
      <div>
        <For each={props.tasks}>
          {(task) => {
            const assignments = () => props.getAssignments(task.id);
            const taskLabels = () =>
              assignments()
                .map((a) => ({
                  label: props.labels.find((l) => l.id === a.labelId),
                  assignment: a,
                }))
                .filter((x) => x.label !== undefined) as {
                label: Label;
                assignment: LabelAssignment;
              }[];

            return (
              <div class="task-list-item">
                <input
                  type="checkbox"
                  class="form-check-input mt-1 flex-shrink-0"
                  checked={task.completed}
                  onChange={() => props.onToggleComplete(task)}
                />
                <div class="flex-grow-1 min-w-0">
                  <A
                    href={`/projects/${props.projectId}/tasks/${task.id}`}
                    class={`task-title-link ${task.completed ? "completed" : ""}`}
                  >
                    {task.title}
                  </A>
                  <div class="task-meta">
                    <span class={`status-badge ${effectiveStatus(task)}`}>
                      {effectiveStatus(task).replace(/_/g, " ")}
                    </span>
                    <Show when={task.dueBy}>
                      <span>
                        <i class="fas fa-calendar-alt me-1" />
                        {task.dueBy}
                      </span>
                    </Show>
                    <For each={taskLabels()}>
                      {({ label, assignment }) => (
                        <LabelBadge label={label} assignment={assignment} />
                      )}
                    </For>
                  </div>
                </div>
                <div class="task-actions">
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm btn-icon"
                    title="Delete"
                    onClick={() => props.onDelete(task)}
                  >
                    <i class="fas fa-trash" />
                  </button>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
};

export default ProjectTaskList;
