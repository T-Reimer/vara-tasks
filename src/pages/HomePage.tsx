import { createMemo, createSignal, For, Show, type Component } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import type { ConnectionMode } from "../models/types";
import {
  createProject,
  deleteProject,
  listProjects,
} from "../services/projects";
import { listServerProfiles } from "../services/server-config";
import { loginToServer } from "../services/api";
import { createServerProfile } from "../services/server-config";

const HomePage: Component = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = createSignal(listProjects());
  const [servers, setServers] = createSignal(listServerProfiles());
  const [showNewProject, setShowNewProject] = createSignal(false);
  const [showAddServer, setShowAddServer] = createSignal(false);

  const [title, setTitle] = createSignal("");
  const [dueBy, setDueBy] = createSignal("");
  const [mode, setMode] = createSignal<ConnectionMode>("local");
  const [selectedServerId, setSelectedServerId] = createSignal(
    servers()[0]?.id ?? "",
  );
  const [message, setMessage] = createSignal("");

  const [serverUrl, setServerUrl] = createSignal(
    typeof window !== "undefined" ? window.location.origin : "",
  );
  const [serverCode, setServerCode] = createSignal("");
  const [deviceName, setDeviceName] = createSignal("Web Client");

  const canCreate = createMemo(() => {
    if (!title().trim()) return false;
    if (mode() === "server") return !!selectedServerId();
    return true;
  });

  const refreshAll = () => {
    setProjects(listProjects());
    const updatedServers = listServerProfiles();
    setServers(updatedServers);
    if (!selectedServerId() && updatedServers.length > 0) {
      setSelectedServerId(updatedServers[0]!.id);
    }
  };

  const handleCreate = (e: SubmitEvent) => {
    e.preventDefault();
    if (!canCreate()) return;
    const project = createProject({
      title: title().trim(),
      connectionMode: mode(),
      serverId: mode() === "server" ? selectedServerId() : null,
      dueBy: dueBy() || undefined,
    });
    setTitle("");
    setDueBy("");
    setShowNewProject(false);
    refreshAll();
    navigate(`/projects/${project.id}`);
  };

  const handleAddServer = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!serverUrl().trim() || !serverCode().trim()) {
      setMessage("URL and code are required.");
      return;
    }
    try {
      const login = await loginToServer({
        baseUrl: serverUrl(),
        code: serverCode(),
        deviceName: deviceName().trim() || "Web Client",
      });
      const profile = createServerProfile({
        baseUrl: serverUrl(),
        authToken: login.token,
        userId: login.userId,
      });
      setSelectedServerId(profile.id);
      setServerUrl(typeof window !== "undefined" ? window.location.origin : "");
      setServerCode("");
      setShowAddServer(false);
      refreshAll();
      setMessage("Server added.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add server.");
    }
  };

  const removeProject = (id: string) => {
    if (confirm("Delete this project and all its tasks?")) {
      deleteProject(id);
      refreshAll();
    }
  };

  const localProjects = createMemo(() =>
    projects().filter((p) => p.connectionMode === "local"),
  );
  const serverProjects = createMemo(() =>
    projects().filter((p) => p.connectionMode === "server"),
  );

  return (
    <div>
      {/* Header */}
      <div class="page-header">
        <h1 class="page-title">
          <i
            class="fas fa-folder-open me-2 text-muted"
            style={{ "font-size": "1rem" }}
          />
          All Projects
        </h1>
        <div class="page-header-actions">
          <button
            class="btn btn-sm btn-outline-secondary"
            onClick={() => setShowAddServer(!showAddServer())}
          >
            <i class="fas fa-server me-1" />
            Server
          </button>
          <button
            class="btn btn-sm btn-primary"
            onClick={() => setShowNewProject(!showNewProject())}
          >
            <i class="fas fa-plus me-1" />
            New
          </button>
        </div>
      </div>

      <div class="page-content">
        {message() && (
          <div class="alert alert-info py-2 d-flex align-items-center gap-2 mb-3">
            <i class="fas fa-circle-info" />
            {message()}
            <button
              type="button"
              class="btn-close ms-auto"
              style={{ "font-size": "0.7rem" }}
              onClick={() => setMessage("")}
            />
          </div>
        )}

        {/* New Project Form */}
        <Show when={showNewProject()}>
          <div class="vara-card mb-4">
            <h2 class="h6 mb-3">
              <i class="fas fa-plus me-2 text-primary" />
              New Project
            </h2>
            <form onSubmit={handleCreate} class="row g-2">
              <div class="col-12">
                <input
                  class="form-control form-control-sm"
                  placeholder="Project title"
                  value={title()}
                  onInput={(e) => setTitle(e.currentTarget.value)}
                  autofocus
                />
              </div>
              <div class="col-12 col-sm-6">
                <label class="form-label small mb-1">Due by (optional)</label>
                <input
                  type="date"
                  class="form-control form-control-sm"
                  value={dueBy()}
                  onInput={(e) => setDueBy(e.currentTarget.value)}
                />
              </div>
              <div class="col-12">
                <div class="d-flex gap-3">
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="radio"
                      name="newMode"
                      id="newLocal"
                      checked={mode() === "local"}
                      onChange={() => setMode("local")}
                    />
                    <label class="form-check-label small" for="newLocal">
                      <i class="fas fa-hard-drive me-1" />
                      Local
                    </label>
                  </div>
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="radio"
                      name="newMode"
                      id="newServer"
                      checked={mode() === "server"}
                      onChange={() => setMode("server")}
                    />
                    <label class="form-check-label small" for="newServer">
                      <i class="fas fa-server me-1" />
                      Server
                    </label>
                  </div>
                </div>
              </div>
              <Show when={mode() === "server"}>
                <div class="col-12">
                  <select
                    class="form-select form-select-sm"
                    value={selectedServerId()}
                    onChange={(e) => setSelectedServerId(e.currentTarget.value)}
                  >
                    <option value="">Select server…</option>
                    <For each={servers()}>
                      {(s) => <option value={s.id}>{s.name}</option>}
                    </For>
                  </select>
                </div>
              </Show>
              <div class="col-12 d-flex gap-2">
                <button
                  class="btn btn-primary btn-sm"
                  type="submit"
                  disabled={!canCreate()}
                >
                  <i class="fas fa-plus me-1" />
                  Create
                </button>
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={() => setShowNewProject(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Show>

        {/* Add Server Form */}
        <Show when={showAddServer()}>
          <div class="vara-card mb-4">
            <h2 class="h6 mb-3">
              <i class="fas fa-server me-2 text-primary" />
              Add Server
            </h2>
            <form onSubmit={handleAddServer} class="row g-2">
              <div class="col-12">
                <input
                  class="form-control form-control-sm"
                  placeholder="https://server.example.com"
                  value={serverUrl()}
                  onInput={(e) => setServerUrl(e.currentTarget.value)}
                />
              </div>
              <div class="col-12">
                <input
                  class="form-control form-control-sm"
                  placeholder="One-time auth code"
                  value={serverCode()}
                  onInput={(e) => setServerCode(e.currentTarget.value)}
                />
              </div>
              <div class="col-12">
                <input
                  class="form-control form-control-sm"
                  placeholder="Device name"
                  value={deviceName()}
                  onInput={(e) => setDeviceName(e.currentTarget.value)}
                />
              </div>
              <div class="col-12 d-flex gap-2">
                <button class="btn btn-primary btn-sm" type="submit">
                  <i class="fas fa-plug me-1" />
                  Connect
                </button>
                <button
                  class="btn btn-outline-secondary btn-sm"
                  type="button"
                  onClick={() => setShowAddServer(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </Show>

        {/* Projects list */}
        <Show when={projects().length === 0}>
          <div class="text-center py-5 text-muted">
            <i
              class="fas fa-folder-open fa-3x mb-3 d-block"
              style={{ color: "#d1d5db" }}
            />
            <p class="mb-2">No projects yet.</p>
            <button
              class="btn btn-primary btn-sm"
              onClick={() => setShowNewProject(true)}
            >
              <i class="fas fa-plus me-1" />
              Create your first project
            </button>
          </div>
        </Show>

        <Show when={localProjects().length > 0}>
          <div class="mb-4">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i
                class="fas fa-hard-drive text-muted"
                style={{ "font-size": "0.8rem" }}
              />
              <span class="sidebar-section-label">Local</span>
            </div>
            <div class="d-flex flex-column gap-2">
              <For each={localProjects()}>
                {(project) => (
                  <div class="project-card">
                    <div class="d-flex align-items-start gap-2">
                      <A
                        href={`/projects/${project.id}`}
                        class="flex-grow-1 min-w-0 text-reset text-decoration-none"
                      >
                        <div class="project-card-title">{project.title}</div>
                        <div class="project-card-meta d-flex align-items-center gap-2 flex-wrap">
                          <span class="mode-badge local">
                            <i class="fas fa-hard-drive me-1" />
                            Local
                          </span>
                          <Show when={project.dueBy}>
                            <span>
                              <i class="fas fa-calendar me-1" />
                              {project.dueBy}
                            </span>
                          </Show>
                        </div>
                      </A>
                      <button
                        type="button"
                        class="btn btn-outline-danger btn-sm btn-icon flex-shrink-0"
                        title="Delete project"
                        onClick={() => removeProject(project.id)}
                      >
                        <i class="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        <Show when={serverProjects().length > 0}>
          <div class="mb-4">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i
                class="fas fa-server text-muted"
                style={{ "font-size": "0.8rem" }}
              />
              <span class="sidebar-section-label">Server-backed</span>
            </div>
            <div class="d-flex flex-column gap-2">
              <For each={serverProjects()}>
                {(project) => (
                  <div class="project-card">
                    <div class="d-flex align-items-start gap-2">
                      <A
                        href={`/projects/${project.id}`}
                        class="flex-grow-1 min-w-0 text-reset text-decoration-none"
                      >
                        <div class="project-card-title">{project.title}</div>
                        <div class="project-card-meta d-flex align-items-center gap-2 flex-wrap">
                          <span class="mode-badge server">
                            <i class="fas fa-server me-1" />
                            Server
                          </span>
                          <span class={`sync-dot ${project.syncStatus}`}>
                            {project.syncStatus}
                          </span>
                          <Show when={project.dueBy}>
                            <span>
                              <i class="fas fa-calendar me-1" />
                              {project.dueBy}
                            </span>
                          </Show>
                        </div>
                      </A>
                      <button
                        type="button"
                        class="btn btn-outline-danger btn-sm btn-icon flex-shrink-0"
                        title="Delete project"
                        onClick={() => removeProject(project.id)}
                      >
                        <i class="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default HomePage;
