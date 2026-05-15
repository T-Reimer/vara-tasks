import { createSignal, For, onCleanup, Show, type Component } from "solid-js";
import { A, useNavigate, useParams } from "@solidjs/router";
import type { TaskRecord, TaskStatus } from "../models/types";
import { getProject } from "../services/projects";
import {
  createTask,
  deleteTask,
  effectiveStatus,
  getTask,
  listChildTasks,
  toggleTaskComplete,
  updateTask,
} from "../services/tasks";
import { enqueueTaskOp } from "../services/sync-queue";
import { scheduleSyncDebounced } from "../services/sync-engine";
import LabelAssigner from "../components/LabelAssigner";
import AttachmentHub from "../components/AttachmentHub";
import EditorJSField from "../components/EditorJSField";
import TaskSubtaskList from "../components/TaskSubtaskList";
import type { EditorContent } from "../models/types";
import { KANBAN_COLUMNS } from "../components/KanbanBoard";

const AUTO_SAVE_DELAY = 800;

const TaskPage: Component = () => {
  const params = useParams();
  const navigate = useNavigate();
  const projectId = () => params.projectId!;
  const taskId = () => params.taskId!;

  const project = () => getProject(projectId());
  const [task, setTask] = createSignal<TaskRecord | null>(
    getTask(projectId(), taskId()),
  );
  const [subtasks, setSubtasks] = createSignal<TaskRecord[]>([]);
  const [editTitle, setEditTitle] = createSignal(task()?.title ?? "");
  const [editDueBy, setEditDueBy] = createSignal(task()?.dueBy ?? "");
  const [editDescription, setEditDescription] = createSignal<
    EditorContent | undefined
  >(task()?.description);
  const [newSubtaskTitle, setNewSubtaskTitle] = createSignal("");
  const [saveStatus, setSaveStatus] = createSignal<
    "saved" | "saving" | "error" | ""
  >("");

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let clearSaveStatusTimer: ReturnType<typeof setTimeout> | null = null;

  onCleanup(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (clearSaveStatusTimer) clearTimeout(clearSaveStatusTimer);
  });

  const refresh = () => {
    setTask(getTask(projectId(), taskId()));
    setSubtasks(listChildTasks(projectId(), taskId()));
  };

  refresh();

  const triggerSave = (changes: Parameters<typeof updateTask>[2]) => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    setSaveStatus("saving");
    autoSaveTimer = setTimeout(() => {
      const updated = updateTask(projectId(), taskId(), {
        ...changes,
        syncStatus: "pending",
      });
      if (updated) {
        enqueueTaskOp({
          operationType: "update",
          projectId: projectId(),
          taskId: taskId(),
          content: updated,
        });
        scheduleSyncDebounced();
        refresh();
        setSaveStatus("saved");
        if (clearSaveStatusTimer) clearTimeout(clearSaveStatusTimer);
        clearSaveStatusTimer = setTimeout(() => setSaveStatus(""), 1500);
      } else {
        setSaveStatus("error");
      }
    }, AUTO_SAVE_DELAY);
  };

  const handleTitleChange = (value: string) => {
    setEditTitle(value);
    triggerSave({ title: value.trim() || task()?.title || "" });
  };

  const handleDueByChange = (value: string) => {
    setEditDueBy(value);
    triggerSave({ dueBy: value || undefined });
  };

  const handleDescriptionChange = (content: EditorContent) => {
    setEditDescription(content);
    triggerSave({ description: content });
  };

  const handleStatusChange = (status: TaskStatus) => {
    const updated = updateTask(projectId(), taskId(), {
      status,
      syncStatus: "pending",
    });
    if (updated) {
      enqueueTaskOp({
        operationType: "update",
        projectId: projectId(),
        taskId: taskId(),
        content: updated,
      });
      scheduleSyncDebounced();
      refresh();
    }
  };

  const addSubtask = (e: SubmitEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle().trim()) return;
    const sub = createTask({
      projectId: projectId(),
      parentTaskId: taskId(),
      title: newSubtaskTitle().trim(),
    });
    enqueueTaskOp({
      operationType: "create",
      projectId: projectId(),
      taskId: sub.id,
      content: sub,
    });
    scheduleSyncDebounced();
    setNewSubtaskTitle("");
    refresh();
  };

  const toggleSubtask = (sub: TaskRecord) => {
    const updated = toggleTaskComplete(projectId(), sub.id);
    if (updated) {
      enqueueTaskOp({
        operationType: "update",
        projectId: projectId(),
        taskId: sub.id,
        content: updated,
      });
      scheduleSyncDebounced();
    }
    refresh();
  };

  const removeSubtask = (sub: TaskRecord) => {
    if (!confirm(`Delete "${sub.title}"?`)) return;
    enqueueTaskOp({
      operationType: "delete",
      projectId: projectId(),
      taskId: sub.id,
    });
    deleteTask(projectId(), sub.id);
    scheduleSyncDebounced();
    refresh();
  };

  const deleteThisTask = () => {
    if (!confirm("Delete this task and all its subtasks?")) return;
    enqueueTaskOp({
      operationType: "delete",
      projectId: projectId(),
      taskId: taskId(),
    });
    deleteTask(projectId(), taskId());
    scheduleSyncDebounced();
    navigate(`/projects/${projectId()}`);
  };

  if (!task()) {
    return (
      <div class="page-content">
        <div class="alert alert-danger">Task not found.</div>
        <A
          href={`/projects/${projectId()}`}
          class="btn btn-outline-secondary btn-sm"
        >
          <i class="fas fa-arrow-left me-1" />
          Back
        </A>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div class="page-header">
        <nav aria-label="breadcrumb" class="flex-grow-1">
          <ol class="breadcrumb mb-0" style={{ "font-size": "0.85rem" }}>
            <li class="breadcrumb-item">
              <A href="/">
                <i class="fas fa-house" />
              </A>
            </li>
            <li class="breadcrumb-item">
              <A href={`/projects/${projectId()}`}>
                {project()?.title ?? "Project"}
              </A>
            </li>
            <li
              class="breadcrumb-item active text-truncate"
              style={{ "max-width": "200px" }}
            >
              {task()?.title}
            </li>
          </ol>
        </nav>
        <div class="page-header-actions">
          <Show when={saveStatus()}>
            <span
              class={`small ${saveStatus() === "error" ? "text-danger" : "text-muted"}`}
            >
              <Show
                when={saveStatus() === "saved"}
                fallback={
                  <Show
                    when={saveStatus() === "error"}
                    fallback={
                      <>
                        <i class="fas fa-circle-notch fa-spin me-1" />
                        Saving…
                      </>
                    }
                  >
                    <i class="fas fa-triangle-exclamation me-1" />
                    Save failed
                  </Show>
                }
              >
                <i class="fas fa-check text-success me-1" />
                Saved
              </Show>
            </span>
          </Show>
          <button
            class="btn btn-outline-danger btn-sm btn-icon"
            title="Delete task"
            onClick={deleteThisTask}
          >
            <i class="fas fa-trash" />
          </button>
        </div>
      </div>

      {/* Content - vertical scroll, no tabs */}
      <div class="page-content">
        {/* Title */}
        <div class="task-field">
          <label for="task-title-input">Title</label>
          <input
            id="task-title-input"
            class="task-title-input"
            value={editTitle()}
            onInput={(e) => handleTitleChange(e.currentTarget.value)}
            placeholder="Task title…"
          />
        </div>

        {/* Status + Due date row */}
        <div class="row g-3 mb-4">
          <div class="col-auto">
            <div class="task-field">
              <label>Status</label>
              <select
                class="form-select form-select-sm"
                value={effectiveStatus(task()!)}
                onChange={(e) =>
                  handleStatusChange(e.currentTarget.value as TaskStatus)
                }
                style={{ width: "auto" }}
              >
                <For each={KANBAN_COLUMNS}>
                  {(col) => <option value={col.status}>{col.label}</option>}
                </For>
              </select>
            </div>
          </div>
          <div class="col-auto">
            <div class="task-field">
              <label>Due date</label>
              <input
                type="date"
                class="form-control form-control-sm"
                value={editDueBy()}
                onChange={(e) => handleDueByChange(e.currentTarget.value)}
                style={{ width: "auto" }}
              />
            </div>
          </div>
          <Show when={project()?.connectionMode !== "local"}>
            <div class="col-auto">
              <div class="task-field">
                <label>Sync</label>
                <span class={`sync-dot ${task()?.syncStatus}`}>
                  {task()?.syncStatus}
                </span>
              </div>
            </div>
          </Show>
        </div>

        {/* Labels */}
        <div class="task-field mb-4">
          <label>
            <i class="fas fa-tags me-1" />
            Labels
          </label>
          <LabelAssigner
            projectId={projectId()}
            targetId={taskId()}
            targetType="task"
            onChanged={refresh}
          />
        </div>

        <hr class="section-divider" />

        {/* Description */}
        <div class="task-field mb-4">
          <label>
            <i class="fas fa-align-left me-1" />
            Description
          </label>
          <EditorJSField
            value={editDescription()}
            onChange={handleDescriptionChange}
          />
        </div>

        <hr class="section-divider" />

        {/* Subtasks */}
        <TaskSubtaskList
          projectId={projectId()}
          subtasks={subtasks()}
          newSubtaskTitle={newSubtaskTitle()}
          onNewSubtaskInput={setNewSubtaskTitle}
          onAddSubtask={addSubtask}
          onToggle={toggleSubtask}
          onDelete={removeSubtask}
        />

        <hr class="section-divider" />

        {/* Attachments */}
        <div class="mb-4">
          <h2 class="h6 mb-3">
            <i class="fas fa-paperclip me-2 text-muted" />
            Attachments
          </h2>
          <AttachmentHub
            projectId={projectId()}
            taskId={taskId()}
            uploadTaskId={taskId()}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskPage;
