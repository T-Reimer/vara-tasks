import { For, Show, type Component } from "solid-js";
import { A } from "@solidjs/router";
import type { TaskRecord } from "../models/types";

interface TaskSubtaskListProps {
  projectId: string;
  subtasks: TaskRecord[];
  newSubtaskTitle: string;
  onNewSubtaskInput: (value: string) => void;
  onAddSubtask: (e: SubmitEvent) => void;
  onToggle: (sub: TaskRecord) => void;
  onDelete: (sub: TaskRecord) => void;
}

const TaskSubtaskList: Component<TaskSubtaskListProps> = (props) => {
  return (
    <div class="mb-4">
      <h2 class="h6 mb-3">
        <i class="fas fa-list-check me-2 text-muted" />
        Subtasks
        <Show when={props.subtasks.length > 0}>
          <span
            class="badge text-bg-secondary ms-2"
            style={{ "font-size": "0.7rem" }}
          >
            {props.subtasks.length}
          </span>
        </Show>
      </h2>

      <form class="add-row mb-3" onSubmit={props.onAddSubtask}>
        <input
          class="form-control form-control-sm"
          placeholder="Add subtask…"
          value={props.newSubtaskTitle}
          onInput={(e) => props.onNewSubtaskInput(e.currentTarget.value)}
        />
        <button
          class="btn btn-primary btn-sm"
          type="submit"
          disabled={!props.newSubtaskTitle.trim()}
        >
          <i class="fas fa-plus" />
        </button>
      </form>

      <Show when={props.subtasks.length === 0}>
        <p class="text-muted small">No subtasks yet.</p>
      </Show>

      <For each={props.subtasks}>
        {(sub) => (
          <div class="task-list-item">
            <input
              type="checkbox"
              class="form-check-input mt-1 flex-shrink-0"
              checked={sub.completed}
              onChange={() => props.onToggle(sub)}
            />
            <A
              href={`/projects/${props.projectId}/tasks/${sub.id}`}
              class={`task-title-link flex-grow-1 ${sub.completed ? "completed" : ""}`}
            >
              {sub.title}
            </A>
            <div class="task-actions">
              <button
                type="button"
                class="btn btn-outline-danger btn-sm btn-icon"
                onClick={() => props.onDelete(sub)}
              >
                <i class="fas fa-trash" />
              </button>
            </div>
          </div>
        )}
      </For>
    </div>
  );
};

export default TaskSubtaskList;
