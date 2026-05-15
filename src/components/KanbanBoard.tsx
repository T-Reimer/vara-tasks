import { For, Show, type Component } from "solid-js";
import { A } from "@solidjs/router";
import type { TaskRecord, TaskStatus } from "../models/types";
import { effectiveStatus } from "../services/tasks";
import LabelBadge from "./LabelBadge";
import type { Label, LabelAssignment } from "../models/types";

export interface KanbanColumn {
  status: TaskStatus;
  label: string;
  colorClass: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { status: "todo", label: "To-Do", colorClass: "todo" },
  { status: "in_progress", label: "In Progress", colorClass: "in_progress" },
  { status: "review", label: "Review", colorClass: "review" },
  { status: "done", label: "Done", colorClass: "done" },
];

interface KanbanBoardProps {
  tasks: TaskRecord[];
  projectId: string;
  labels: Label[];
  getAssignments: (taskId: string) => LabelAssignment[];
  onStatusChange: (task: TaskRecord, newStatus: TaskStatus) => void;
  onDelete: (task: TaskRecord) => void;
  onAddTask?: (status: TaskStatus) => void;
}

const KanbanBoard: Component<KanbanBoardProps> = (props) => {
  const tasksByStatus = (status: TaskStatus) =>
    props.tasks.filter((t) => effectiveStatus(t) === status);

  return (
    <div class="kanban-board">
      <For each={KANBAN_COLUMNS}>
        {(col) => {
          const colTasks = () => tasksByStatus(col.status);

          return (
            <div class="kanban-column">
              <div class="kanban-column-header">
                <span class="col-title">{col.label}</span>
                <span class="col-count">{colTasks().length}</span>
              </div>

              <For each={colTasks()}>
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
                    <div class="kanban-card">
                      <A
                        href={`/projects/${props.projectId}/tasks/${task.id}`}
                        class={`kanban-card-title ${task.completed ? "completed" : ""}`}
                      >
                        {task.title}
                      </A>

                      <div class="kanban-card-meta">
                        <Show when={task.dueBy}>
                          <span>
                            <i class="fas fa-calendar-alt me-1" />
                            {task.dueBy}
                          </span>
                        </Show>
                        <Show when={taskLabels().length > 0}>
                          <For each={taskLabels()}>
                            {({ label, assignment }) => (
                              <LabelBadge
                                label={label}
                                assignment={assignment}
                              />
                            )}
                          </For>
                        </Show>
                      </div>

                      <div class="kanban-card-footer">
                        {/* Status selector */}
                        <select
                          class="form-select form-select-sm"
                          style={{
                            "font-size": "0.72rem",
                            padding: "0.15rem 1.25rem 0.15rem 0.4rem",
                            width: "auto",
                          }}
                          value={effectiveStatus(task)}
                          onChange={(e) =>
                            props.onStatusChange(
                              task,
                              e.currentTarget.value as TaskStatus,
                            )
                          }
                        >
                          <For each={KANBAN_COLUMNS}>
                            {(c) => <option value={c.status}>{c.label}</option>}
                          </For>
                        </select>

                        <button
                          type="button"
                          class="btn btn-outline-danger btn-sm btn-icon"
                          title="Delete task"
                          onClick={(e) => {
                            e.stopPropagation();
                            props.onDelete(task);
                          }}
                        >
                          <i class="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  );
                }}
              </For>

              <Show when={props.onAddTask}>
                <button
                  class="kanban-add"
                  onClick={() => props.onAddTask?.(col.status)}
                >
                  <i class="fas fa-plus" />
                  Add task
                </button>
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
};

export default KanbanBoard;
