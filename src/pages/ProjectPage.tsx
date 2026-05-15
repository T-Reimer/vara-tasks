import { createSignal, For, Show, type Component } from "solid-js";
import { A, useNavigate, useParams } from "@solidjs/router";
import type { Label, LabelAssignment, TaskRecord } from "../models/types";
import { getProject, updateProject, deleteProject } from "../services/projects";
import {
  createTask,
  listRootTasks,
  listChildTasks,
  searchTasks,
  toggleTaskComplete,
  deleteTask,
} from "../services/tasks";
import {
  getAssignmentsForTarget,
  listAllLabels,
  filterTasksByLabel,
} from "../services/labels";
import { enqueueTaskOp } from "../services/sync-queue";
import { scheduleSyncDebounced } from "../services/sync-engine";
import SyncStatus from "../components/SyncStatus";
import OfflineIndicator from "../components/OfflineIndicator";
import SearchBar from "../components/SearchBar";
import LabelManager from "../components/LabelManager";
import LabelAssigner from "../components/LabelAssigner";
import LabelBadge from "../components/LabelBadge";
import AttachmentHub from "../components/AttachmentHub";

const ProjectPage: Component = () => {
  const params = useParams();
  const navigate = useNavigate();
  const projectId = () => params.id!;

  const [project, setProject] = createSignal(getProject(projectId()));
  const [tasks, setTasks] = createSignal<TaskRecord[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [activeTab, setActiveTab] = createSignal<
    "tasks" | "attachments" | "labels"
  >("tasks");
  const [newTaskTitle, setNewTaskTitle] = createSignal("");
  const [labelFilter, setLabelFilter] = createSignal<
    { labelId: string; value: string }[]
  >([]);
  const [message, setMessage] = createSignal("");

  const labels = () => listAllLabels(projectId());

  const refresh = () => {
    setProject(getProject(projectId()));
    if (searchQuery()) {
      setTasks(searchTasks(projectId(), searchQuery()));
    } else {
      setTasks(listRootTasks(projectId()));
    }
  };

  refresh();

  const filteredTasks = () => {
    const filters = labelFilter();
    if (filters.length === 0) return tasks();
    const ids = filterTasksByLabel(
      projectId(),
      tasks().map((t) => t.id),
      filters,
    );
    return tasks().filter((t) => ids.includes(t.id));
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    refresh();
  };

  const addTask = (e: SubmitEvent) => {
    e.preventDefault();
    if (!newTaskTitle().trim()) return;
    const task = createTask({
      projectId: projectId(),
      parentTaskId: null,
      title: newTaskTitle().trim(),
    });
    enqueueTaskOp({
      operationType: "create",
      projectId: projectId(),
      taskId: task.id,
      content: task,
    });
    scheduleSyncDebounced();
    setNewTaskTitle("");
    refresh();
  };

  const toggleComplete = (task: TaskRecord) => {
    const updated = toggleTaskComplete(projectId(), task.id);
    if (updated) {
      enqueueTaskOp({
        operationType: "update",
        projectId: projectId(),
        taskId: task.id,
        content: updated,
      });
      scheduleSyncDebounced();
    }
    refresh();
  };

  const removeTask = (task: TaskRecord) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    enqueueTaskOp({
      operationType: "delete",
      projectId: projectId(),
      taskId: task.id,
    });
    deleteTask(projectId(), task.id);
    scheduleSyncDebounced();
    refresh();
  };

  const deleteThisProject = () => {
    if (!confirm("Delete this project and all its data?")) return;
    deleteProject(projectId());
    navigate("/");
  };

  if (!project()) {
    return (
      <div class="container py-4">
        <div class="alert alert-danger">Project not found.</div>
        <A href="/" class="btn btn-outline-secondary">
          ← Back
        </A>
      </div>
    );
  }

  return (
    <div>
      <OfflineIndicator />
      <div class="container py-4">
        {/* Header */}
        <div class="d-flex align-items-start gap-3 mb-4 flex-wrap">
          <A href="/" class="btn btn-outline-secondary btn-sm mt-1">
            ← Back
          </A>
          <div class="flex-grow-1">
            <h1 class="h3 mb-0">{project()?.title}</h1>
            <div class="small text-muted">
              {project()?.connectionMode === "local"
                ? "Local-only"
                : "Server-backed"}
              {project()?.dueBy && ` · Due ${project()?.dueBy}`}
            </div>
          </div>
          <div class="d-flex gap-2 align-items-center">
            <SyncStatus />
            <button
              class="btn btn-outline-danger btn-sm"
              onClick={deleteThisProject}
            >
              🗑 Delete
            </button>
          </div>
        </div>

        {message() && <div class="alert alert-info py-2">{message()}</div>}

        {/* Tabs */}
        <ul class="nav nav-tabs mb-3">
          {(["tasks", "attachments", "labels"] as const).map((tab) => (
            <li class="nav-item">
              <button
                class={`nav-link ${activeTab() === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            </li>
          ))}
        </ul>

        {/* Tasks tab */}
        <Show when={activeTab() === "tasks"}>
          <div class="mb-3">
            <SearchBar placeholder="Search tasks…" onSearch={handleSearch} />
          </div>

          {/* Label filter */}
          <Show when={labels().length > 0}>
            <div class="mb-3 d-flex flex-wrap gap-2 align-items-center">
              <span class="small text-muted">Filter:</span>
              <For each={labels()}>
                {(label) => {
                  const isActive = () =>
                    labelFilter().some((f) => f.labelId === label.id);
                  const opts = label.options ?? ["true"];
                  return (
                    <div class="dropdown">
                      <button
                        class={`btn btn-sm ${isActive() ? "btn-primary" : "btn-outline-secondary"}`}
                        type="button"
                        data-bs-toggle="dropdown"
                      >
                        {label.title}
                      </button>
                      <ul class="dropdown-menu">
                        <For each={opts}>
                          {(opt) => (
                            <li>
                              <button
                                class="dropdown-item"
                                onClick={() => {
                                  setLabelFilter((f) => {
                                    const without = f.filter(
                                      (x) => x.labelId !== label.id,
                                    );
                                    return [
                                      ...without,
                                      { labelId: label.id, value: opt },
                                    ];
                                  });
                                }}
                              >
                                {opt}
                              </button>
                            </li>
                          )}
                        </For>
                        <li>
                          <hr class="dropdown-divider" />
                        </li>
                        <li>
                          <button
                            class="dropdown-item"
                            onClick={() =>
                              setLabelFilter((f) =>
                                f.filter((x) => x.labelId !== label.id),
                              )
                            }
                          >
                            Clear
                          </button>
                        </li>
                      </ul>
                    </div>
                  );
                }}
              </For>
              <Show when={labelFilter().length > 0}>
                <button
                  class="btn btn-sm btn-outline-danger"
                  onClick={() => setLabelFilter([])}
                >
                  Clear all filters
                </button>
              </Show>
            </div>
          </Show>

          {/* Add task */}
          <form class="input-group mb-3" onSubmit={addTask}>
            <input
              class="form-control"
              placeholder="New task…"
              value={newTaskTitle()}
              onInput={(e) => setNewTaskTitle(e.currentTarget.value)}
            />
            <button
              class="btn btn-primary"
              type="submit"
              disabled={!newTaskTitle().trim()}
            >
              Add Task
            </button>
          </form>

          <Show when={filteredTasks().length === 0}>
            <p class="text-muted">No tasks yet.</p>
          </Show>

          <ul class="list-group list-group-flush">
            <For each={filteredTasks()}>
              {(task) => {
                const assignments = () =>
                  getAssignmentsForTarget(projectId(), task.id, "task");
                const childCount = () =>
                  listChildTasks(projectId(), task.id).length;

                return (
                  <li class="list-group-item px-0">
                    <div class="d-flex align-items-start gap-2">
                      <input
                        type="checkbox"
                        class="form-check-input mt-1"
                        checked={task.completed}
                        onChange={() => toggleComplete(task)}
                      />
                      <div class="flex-grow-1">
                        <A
                          href={`/projects/${projectId()}/tasks/${task.id}`}
                          class={`fw-semibold text-decoration-none ${task.completed ? "text-muted text-decoration-line-through" : ""}`}
                        >
                          {task.title}
                        </A>
                        <div class="small text-muted">
                          {task.dueBy && `Due ${task.dueBy} · `}
                          {childCount() > 0 && `${childCount()} subtask(s) · `}
                          <span
                            class={`badge ${task.syncStatus === "synced" ? "text-bg-success" : "text-bg-warning"}`}
                            style={{ "font-size": "0.65rem" }}
                          >
                            {task.syncStatus}
                          </span>
                        </div>
                        <div class="d-flex flex-wrap gap-1 mt-1">
                          <For each={assignments()}>
                            {(a) => {
                              const label = labels().find(
                                (l) => l.id === a.labelId,
                              );
                              return label ? (
                                <LabelBadge label={label} assignment={a} />
                              ) : null;
                            }}
                          </For>
                        </div>
                      </div>
                      <div class="d-flex gap-1">
                        <A
                          href={`/projects/${projectId()}/tasks/${task.id}`}
                          class="btn btn-outline-secondary btn-sm"
                        >
                          Open
                        </A>
                        <button
                          type="button"
                          class="btn btn-outline-danger btn-sm"
                          onClick={() => removeTask(task)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>

        {/* Attachments tab */}
        <Show when={activeTab() === "attachments"}>
          <AttachmentHub projectId={projectId()} />
        </Show>

        {/* Labels tab */}
        <Show when={activeTab() === "labels"}>
          <h2 class="h5 mb-3">Project Labels</h2>
          <LabelManager
            projectId={projectId()}
            onChanged={() => setMessage("Labels updated.")}
          />
        </Show>
      </div>
    </div>
  );
};

export default ProjectPage;
