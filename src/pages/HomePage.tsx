import { createMemo, createSignal, For, Show, type Component } from "solid-js";
import { A } from "@solidjs/router";
import type { ConnectionMode } from "../models/types";
import {
  createProject,
  deleteProject,
  listProjects,
} from "../services/projects";
import { listServerProfiles } from "../services/server-config";
import { loginToServer } from "../services/api";
import { createServerProfile } from "../services/server-config";
import SyncStatus from "../components/SyncStatus";
import OfflineIndicator from "../components/OfflineIndicator";

const HomePage: Component = () => {
  const [projects, setProjects] = createSignal(listProjects());
  const [servers, setServers] = createSignal(listServerProfiles());

  const [title, setTitle] = createSignal("");
  const [dueBy, setDueBy] = createSignal("");
  const [mode, setMode] = createSignal<ConnectionMode>("local");
  const [selectedServerId, setSelectedServerId] = createSignal(
    servers()[0]?.id ?? "",
  );
  const [message, setMessage] = createSignal("");

  const [serverUrl, setServerUrl] = createSignal("");
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
    createProject({
      title: title().trim(),
      connectionMode: mode(),
      serverId: mode() === "server" ? selectedServerId() : null,
      dueBy: dueBy() || undefined,
    });
    setTitle("");
    setDueBy("");
    refreshAll();
    setMessage("Project created.");
  };

  const handleAddServer = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!serverUrl().trim() || !serverCode().trim()) {
      setMessage("Server URL and code are required.");
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
      setServerUrl("");
      setServerCode("");
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

  return (
    <div>
      <OfflineIndicator />
      <div class="container py-4">
        <div class="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
          <h1 class="h3 mb-0">Vara Tasks</h1>
          <div class="d-flex gap-2 align-items-center">
            <SyncStatus />
            <A href="/settings" class="btn btn-outline-secondary btn-sm">
              ⚙ Settings
            </A>
            <A href="/labels" class="btn btn-outline-secondary btn-sm">
              🏷 Labels
            </A>
          </div>
        </div>

        {message() && <div class="alert alert-info py-2">{message()}</div>}

        <div class="row g-4">
          {/* Create Project */}
          <div class="col-12 col-lg-5">
            <div class="card">
              <div class="card-body">
                <h2 class="h5">New Project</h2>
                <form onSubmit={handleCreate} class="row g-2">
                  <div class="col-12">
                    <input
                      class="form-control"
                      placeholder="Project title"
                      value={title()}
                      onInput={(e) => setTitle(e.currentTarget.value)}
                    />
                  </div>
                  <div class="col-12">
                    <label class="form-label small mb-1">
                      Due by (optional)
                    </label>
                    <input
                      type="date"
                      class="form-control"
                      value={dueBy()}
                      onInput={(e) => setDueBy(e.currentTarget.value)}
                    />
                  </div>
                  <div class="col-12">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="radio"
                        name="mode"
                        id="local"
                        checked={mode() === "local"}
                        onChange={() => setMode("local")}
                      />
                      <label class="form-check-label" for="local">
                        Local-only
                      </label>
                    </div>
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="radio"
                        name="mode"
                        id="server"
                        checked={mode() === "server"}
                        onChange={() => setMode("server")}
                      />
                      <label class="form-check-label" for="server">
                        Server-backed
                      </label>
                    </div>
                  </div>
                  <Show when={mode() === "server"}>
                    <div class="col-12">
                      <select
                        class="form-select"
                        value={selectedServerId()}
                        onChange={(e) =>
                          setSelectedServerId(e.currentTarget.value)
                        }
                      >
                        <option value="">Select server…</option>
                        <For each={servers()}>
                          {(s) => <option value={s.id}>{s.name}</option>}
                        </For>
                      </select>
                    </div>
                  </Show>
                  <div class="col-12">
                    <button
                      class="btn btn-primary"
                      type="submit"
                      disabled={!canCreate()}
                    >
                      Create Project
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Add Server (collapsed) */}
            <div class="card mt-3">
              <div class="card-body">
                <h2 class="h5">Add Server</h2>
                <form onSubmit={handleAddServer} class="row g-2">
                  <div class="col-12">
                    <input
                      class="form-control"
                      placeholder="https://server.example.com"
                      value={serverUrl()}
                      onInput={(e) => setServerUrl(e.currentTarget.value)}
                    />
                  </div>
                  <div class="col-12">
                    <input
                      class="form-control"
                      placeholder="One-time auth code"
                      value={serverCode()}
                      onInput={(e) => setServerCode(e.currentTarget.value)}
                    />
                  </div>
                  <div class="col-12">
                    <input
                      class="form-control"
                      placeholder="Device name"
                      value={deviceName()}
                      onInput={(e) => setDeviceName(e.currentTarget.value)}
                    />
                  </div>
                  <div class="col-12">
                    <button
                      class="btn btn-outline-primary btn-sm"
                      type="submit"
                    >
                      Add Server &amp; Log In
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Project List */}
          <div class="col-12 col-lg-7">
            <h2 class="h5 mb-3">Projects ({projects().length})</h2>
            <Show when={projects().length === 0}>
              <p class="text-muted">
                No projects yet. Create one to get started.
              </p>
            </Show>
            <div class="list-group">
              <For each={projects()}>
                {(project) => (
                  <div class="list-group-item list-group-item-action d-flex align-items-start gap-3">
                    <div class="flex-grow-1 overflow-hidden">
                      <A
                        href={`/projects/${project.id}`}
                        class="text-decoration-none stretched-link-override"
                      >
                        <div class="fw-semibold">{project.title}</div>
                      </A>
                      <div class="small text-muted">
                        {project.connectionMode === "local"
                          ? "Local-only"
                          : "Server-backed"}
                        {project.dueBy && ` · Due ${project.dueBy}`}
                      </div>
                    </div>
                    <div class="d-flex gap-1 align-items-center">
                      <span
                        class={`badge ${project.syncStatus === "synced" ? "text-bg-success" : project.syncStatus === "error" ? "text-bg-danger" : "text-bg-warning"}`}
                      >
                        {project.syncStatus}
                      </span>
                      <A
                        href={`/projects/${project.id}`}
                        class="btn btn-outline-primary btn-sm"
                      >
                        Open
                      </A>
                      <button
                        type="button"
                        class="btn btn-outline-danger btn-sm"
                        onClick={() => removeProject(project.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
