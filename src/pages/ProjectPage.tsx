import { createMemo, createSignal, For, Show, type Component } from "solid-js";
import { A, useNavigate, useParams } from "@solidjs/router";
import type {
  TaskRecord,
  TaskStatus,
} from "../models/types";
import { getProject, deleteProject } from "../services/projects";
import {
  createTask,
  deleteTask,
  listRootTasks,
  searchTasks,
  toggleTaskComplete,
  updateTask,
} from "../services/tasks";
import {
  getAssignmentsForTarget,
  listAllLabels,
  filterTasksByLabel,
} from "../services/labels";
import { enqueueTaskOp } from "../services/sync-queue";
import { scheduleSyncDebounced } from "../services/sync-engine";
import AttachmentHub from "../components/AttachmentHub";
import KanbanBoard from "../components/KanbanBoard";
import ProjectTaskList from "../components/ProjectTaskList";
import PromptModal from "../components/PromptModal";

type ViewMode = "list" | "kanban";

const VIEW_PREF_KEY = "vara.view-mode";

const ProjectPage: Component = () => {
  const params = useParams();
  const navigate = useNavigate();
  const projectId = () => params.id!;

  const [project, setProject] = createSignal(getProject(projectId()));
  const [tasks, setTasks] = createSignal<TaskRecord[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchVisible, setSearchVisible] = createSignal(false);
  const [viewMode, setViewMode] = createSignal<ViewMode>(
    (localStorage.getItem(VIEW_PREF_KEY) as ViewMode) ?? "list",
  );
  const [newTaskTitle, setNewTaskTitle] = createSignal("");
  const [newTaskStatus, setNewTaskStatus] = createSignal<TaskStatus>("todo");
  const [labelFilter, setLabelFilter] = createSignal<
    { labelId: string; value: string }[]
  >([]);
  const [promptStatus, setPromptStatus] = createSignal<TaskStatus | null>(null);

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

  const filteredTasks = createMemo(() => {
    const filters = labelFilter();
    if (filters.length === 0) return tasks();
    const ids = filterTasksByLabel(
      projectId(),
      tasks().map((t) => t.id),
      filters,
    );
    return tasks().filter((t) => ids.includes(t.id));
  });

  const setView = (v: ViewMode) => {
    setViewMode(v);
    localStorage.setItem(VIEW_PREF_KEY, v);
  };

  const addTask = (e: SubmitEvent) => {
    e.preventDefault();
    if (!newTaskTitle().trim()) return;
    const task = createTask({
      projectId: projectId(),
      parentTaskId: null,
      title: newTaskTitle().trim(),
      status: newTaskStatus(),
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

  const addTaskWithStatus = (status: TaskStatus) => {
    setPromptStatus(status);
  };

  const handlePromptConfirm = (title: string) => {
    const status = promptStatus()!;
    setPromptStatus(null);
    const task = createTask({
      projectId: projectId(),
      parentTaskId: null,
      title,
      status,
    });
    enqueueTaskOp({
      operationType: "create",
      projectId: projectId(),
      taskId: task.id,
      content: task,
    });
    scheduleSyncDebounced();
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

  const changeStatus = (task: TaskRecord, status: TaskStatus) => {
    const updated = updateTask(projectId(), task.id, {
      status,
      syncStatus: "pending",
    });
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
      <div class="page-content">
        <div class="alert alert-danger">Project not found.</div>
        <A href="/" class="btn btn-outline-secondary btn-sm">
          <i class="fas fa-arrow-left me-1" />
          Back
        </A>
      </div>
    );
  }

  return (
    <div>
      <PromptModal
        show={promptStatus() !== null}
        heading="Add task"
        placeholder="Task title…"
        onConfirm={handlePromptConfirm}
        onCancel={() => setPromptStatus(null)}
      />
      {/* Page Header */}
      <div class="page-header">
        <div class="flex-grow-1 min-w-0">
          <h1 class="page-title">{project()?.title}</h1>
          <div class="d-flex align-items-center gap-2 mt-1">
            <span
              class={`mode-badge ${project()?.connectionMode === "local" ? "local" : "server"}`}
            >
              <i
                class={`fas ${project()?.connectionMode === "local" ? "fa-hard-drive" : "fa-server"} me-1`}
              />
              {project()?.connectionMode === "local" ? "Local" : "Server"}
            </span>
            <Show when={project()?.dueBy}>
              <span class="small text-muted">
                <i class="fas fa-calendar me-1" />
                {project()?.dueBy}
              </span>
            </Show>
            <Show when={project()?.connectionMode !== "local"}>
              <span class={`sync-dot ${project()?.syncStatus}`}>
                {project()?.syncStatus}
              </span>
            </Show>
          </div>
        </div>
        <div class="page-header-actions">
          <button
            class="btn btn-outline-danger btn-sm btn-icon"
            title="Delete project"
            onClick={deleteThisProject}
          >
            <i class="fas fa-trash" />
          </button>
          <A
            href={`/projects/${projectId()}/settings`}
            class="btn btn-outline-secondary btn-sm btn-icon"
            title="Project settings"
          >
            <i class="fas fa-sliders" />
          </A>
        </div>
      </div>

      {/* Toolbar */}
      <div class="page-toolbar">
        {/* View toggle */}
        <button
          class={`view-toggle-btn ${viewMode() === "list" ? "active" : ""}`}
          title="List view"
          onClick={() => setView("list")}
        >
          <i class="fas fa-list" />
        </button>
        <button
          class={`view-toggle-btn ${viewMode() === "kanban" ? "active" : ""}`}
          title="Kanban view"
          onClick={() => setView("kanban")}
        >
          <i class="fas fa-columns" />
        </button>

        <div
          class="vr mx-1"
          style={{ height: "24px", "align-self": "center" }}
        />

        {/* Search */}
        <Show
          when={searchVisible()}
          fallback={
            <button
              class="btn btn-sm btn-outline-secondary btn-icon"
              title="Search tasks"
              onClick={() => setSearchVisible(true)}
            >
              <i class="fas fa-magnifying-glass" />
            </button>
          }
        >
          <div class="search-inline">
            <i class="fas fa-magnifying-glass" />
            <input
              type="text"
              placeholder="Search tasks…"
              value={searchQuery()}
              onInput={(e) => {
                setSearchQuery(e.currentTarget.value);
                refresh();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchQuery("");
                  setSearchVisible(false);
                  refresh();
                }
              }}
              autofocus
            />
            <Show when={searchQuery()}>
              <button
                class="btn btn-link btn-sm p-0 ms-1"
                onClick={() => {
                  setSearchQuery("");
                  setSearchVisible(false);
                  refresh();
                }}
              >
                <i class="fas fa-xmark text-muted" />
              </button>
            </Show>
          </div>
        </Show>

        {/* Label filter */}
        <Show when={labels().length > 0}>
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
                    <i class="fas fa-filter me-1" />
                    {label.title}
                  </button>
                  <ul class="dropdown-menu">
                    <For each={opts}>
                      {(opt) => (
                        <li>
                          <button
                            class="dropdown-item small"
                            onClick={() =>
                              setLabelFilter((f) => [
                                ...f.filter((x) => x.labelId !== label.id),
                                { labelId: label.id, value: opt },
                              ])
                            }
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
                        class="dropdown-item small text-muted"
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
              <i class="fas fa-filter-circle-xmark" />
            </button>
          </Show>
        </Show>

        <div class="ms-auto" />

        {/* Add task (in list view only) */}
        <Show when={viewMode() === "list"}>
          <form class="d-flex gap-1" onSubmit={addTask}>
            <input
              class="form-control form-control-sm"
              placeholder="New task…"
              style={{ width: "160px" }}
              value={newTaskTitle()}
              onInput={(e) => setNewTaskTitle(e.currentTarget.value)}
            />
            <button
              class="btn btn-primary btn-sm"
              type="submit"
              disabled={!newTaskTitle().trim()}
            >
              <i class="fas fa-plus" />
            </button>
          </form>
        </Show>
      </div>

      {/* Content */}
      <div class="page-content">
        {/* Kanban View */}
        <Show when={viewMode() === "kanban"}>
          <KanbanBoard
            tasks={filteredTasks()}
            projectId={projectId()}
            labels={labels()}
            getAssignments={(taskId) =>
              getAssignmentsForTarget(projectId(), taskId, "task")
            }
            onStatusChange={changeStatus}
            onDelete={removeTask}
            onAddTask={addTaskWithStatus}
          />
        </Show>

        {/* List View */}
        <Show when={viewMode() === "list"}>
          <ProjectTaskList
            tasks={filteredTasks()}
            projectId={projectId()}
            labels={labels()}
            getAssignments={(taskId) =>
              getAssignmentsForTarget(projectId(), taskId, "task")
            }
            onToggleComplete={toggleComplete}
            onDelete={removeTask}
          />
        </Show>

        <hr class="section-divider" />

        {/* Attachments Section */}
        <div class="mb-4">
          <h2 class="h6 mb-3">
            <i class="fas fa-paperclip me-2 text-muted" />
            Attachments
          </h2>
          <AttachmentHub projectId={projectId()} />
        </div>
      </div>
    </div>
  );
};

export default ProjectPage;
