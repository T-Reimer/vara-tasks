import { createSignal, For, Show, type Component } from "solid-js";
import { A, useNavigate, useParams } from "@solidjs/router";
import type { TaskRecord } from "../models/types";
import { getProject } from "../services/projects";
import {
  createTask,
  deleteTask,
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
import type { EditorContent } from "../models/types";
import OfflineIndicator from "../components/OfflineIndicator";

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
  const [editing, setEditing] = createSignal(false);
  const [editTitle, setEditTitle] = createSignal(task()?.title ?? "");
  const [editDueBy, setEditDueBy] = createSignal(task()?.dueBy ?? "");
  const [editDescription, setEditDescription] = createSignal<
    EditorContent | undefined
  >(task()?.description);
  const [newSubtaskTitle, setNewSubtaskTitle] = createSignal("");
  const [activeTab, setActiveTab] = createSignal<
    "detail" | "subtasks" | "attachments"
  >("detail");
  const [message, setMessage] = createSignal("");

  const refresh = () => {
    setTask(getTask(projectId(), taskId()));
    setSubtasks(listChildTasks(projectId(), taskId()));
  };

  refresh();

  const saveEdits = () => {
    const updated = updateTask(projectId(), taskId(), {
      title: editTitle().trim() || task()!.title,
      dueBy: editDueBy() || undefined,
      description: editDescription(),
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
    }
    setEditing(false);
    refresh();
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
      <div class="container py-4">
        <div class="alert alert-danger">Task not found.</div>
        <A href={`/projects/${projectId()}`} class="btn btn-outline-secondary">
          ← Back
        </A>
      </div>
    );
  }

  return (
    <div>
      <OfflineIndicator />
      <div class="container py-4">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" class="mb-3">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <A href="/">Home</A>
            </li>
            <li class="breadcrumb-item">
              <A href={`/projects/${projectId()}`}>
                {project()?.title ?? "Project"}
              </A>
            </li>
            <li class="breadcrumb-item active">{task()?.title}</li>
          </ol>
        </nav>

        {message() && <div class="alert alert-info py-2">{message()}</div>}

        {/* Title area */}
        <Show
          when={!editing()}
          fallback={
            <div class="mb-3">
              <input
                class="form-control form-control-lg mb-2"
                value={editTitle()}
                onInput={(e) => setEditTitle(e.currentTarget.value)}
              />
              <label class="form-label small">Due by</label>
              <input
                type="date"
                class="form-control mb-2"
                value={editDueBy()}
                onInput={(e) => setEditDueBy(e.currentTarget.value)}
              />
              <label class="form-label small">Description</label>
              <EditorJSField
                value={editDescription()}
                onChange={(c) => setEditDescription(c)}
              />
              <div class="d-flex gap-2 mt-2">
                <button class="btn btn-primary" onClick={saveEdits}>
                  Save
                </button>
                <button
                  class="btn btn-outline-secondary"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          }
        >
          <div class="d-flex align-items-start gap-3 mb-3 flex-wrap">
            <div class="flex-grow-1">
              <h1
                class={`h3 mb-1 ${task()?.completed ? "text-muted text-decoration-line-through" : ""}`}
              >
                {task()?.title}
              </h1>
              {task()?.dueBy && (
                <div class="small text-muted">Due {task()?.dueBy}</div>
              )}
            </div>
            <div class="d-flex gap-2">
              <button
                class="btn btn-outline-primary btn-sm"
                onClick={() => setEditing(true)}
              >
                ✏ Edit
              </button>
              <button
                class="btn btn-outline-danger btn-sm"
                onClick={deleteThisTask}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </Show>

        {/* Labels */}
        <div class="mb-3">
          <label class="form-label small fw-semibold">Labels</label>
          <LabelAssigner
            projectId={projectId()}
            targetId={taskId()}
            targetType="task"
            onChanged={() => setMessage("Labels updated.")}
          />
        </div>

        {/* Tabs */}
        <ul class="nav nav-tabs mb-3">
          {(["detail", "subtasks", "attachments"] as const).map((tab) => (
            <li class="nav-item">
              <button
                class={`nav-link ${activeTab() === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === "subtasks" && subtasks().length > 0
                  ? ` (${subtasks().length})`
                  : ""}
              </button>
            </li>
          ))}
        </ul>

        {/* Detail */}
        <Show when={activeTab() === "detail"}>
          <Show
            when={task()?.description?.blocks?.length}
            fallback={<p class="text-muted">No description.</p>}
          >
            <EditorJSField value={task()?.description} readOnly />
          </Show>
          <div class="mt-2">
            <span
              class={`badge ${task()?.syncStatus === "synced" ? "text-bg-success" : "text-bg-warning"}`}
            >
              {task()?.syncStatus}
            </span>
          </div>
        </Show>

        {/* Subtasks */}
        <Show when={activeTab() === "subtasks"}>
          <form class="input-group mb-3" onSubmit={addSubtask}>
            <input
              class="form-control"
              placeholder="New subtask…"
              value={newSubtaskTitle()}
              onInput={(e) => setNewSubtaskTitle(e.currentTarget.value)}
            />
            <button
              class="btn btn-primary"
              type="submit"
              disabled={!newSubtaskTitle().trim()}
            >
              Add
            </button>
          </form>

          <Show when={subtasks().length === 0}>
            <p class="text-muted">No subtasks yet.</p>
          </Show>

          <ul class="list-group list-group-flush">
            <For each={subtasks()}>
              {(sub) => (
                <li class="list-group-item px-0">
                  <div class="d-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      class="form-check-input"
                      checked={sub.completed}
                      onChange={() => toggleSubtask(sub)}
                    />
                    <A
                      href={`/projects/${projectId()}/tasks/${sub.id}`}
                      class={`flex-grow-1 text-decoration-none ${sub.completed ? "text-muted text-decoration-line-through" : ""}`}
                    >
                      {sub.title}
                    </A>
                    <button
                      type="button"
                      class="btn btn-outline-danger btn-sm"
                      onClick={() => removeSubtask(sub)}
                    >
                      🗑
                    </button>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </Show>

        {/* Attachments */}
        <Show when={activeTab() === "attachments"}>
          <AttachmentHub
            projectId={projectId()}
            taskId={taskId()}
            uploadTaskId={taskId()}
          />
        </Show>
      </div>
    </div>
  );
};

export default TaskPage;
