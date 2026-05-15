import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
  onMount,
  For,
  Show,
  type Component,
  type JSX,
} from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { listProjects } from "../services/projects";
import {
  getSyncState,
  subscribeSyncState,
  type SyncState,
} from "../services/sync-engine";
import type { ProjectRecord } from "../models/types";

interface AppLayoutProps {
  children: JSX.Element;
}

const AppLayout: Component<AppLayoutProps> = (props) => {
  const [sidebarOpen, setSidebarOpen] = createSignal(false);
  const [projects, setProjects] = createSignal<ProjectRecord[]>(listProjects());
  const [syncState, setSyncState] = createSignal<SyncState>(getSyncState());
  const location = useLocation();

  onMount(() => {
    const unsub = subscribeSyncState((s) => setSyncState(s));
    onCleanup(unsub);
  });

  // Refresh project list when location changes
  const pathname = () => location.pathname;
  createEffect(() => {
    pathname(); // track dependency
    setProjects(listProjects());
  });

  const localProjects = createMemo(() =>
    projects().filter((p) => p.connectionMode === "local"),
  );
  const serverProjects = createMemo(() =>
    projects().filter((p) => p.connectionMode === "server"),
  );

  const syncBadge = createMemo(() => {
    const s = syncState();
    if (!s.isOnline) return { cls: "text-bg-secondary", label: "Offline" };
    if (s.isSyncing) return { cls: "text-bg-info", label: "Syncing…" };
    if (s.failed > 0)
      return { cls: "text-bg-danger", label: `${s.failed} failed` };
    if (s.pending > 0)
      return { cls: "text-bg-warning", label: `${s.pending} pending` };
    return { cls: "text-bg-success", label: "Synced" };
  });

  const isProjectActive = (id: string) =>
    pathname().startsWith(`/projects/${id}`);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div class="app-layout">
      {/* Mobile Top Bar */}
      <div class="app-topbar">
        <button
          class="topbar-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <i class="fas fa-bars" />
        </button>
        <span class="topbar-title">Vara Tasks</span>
        <div class="ms-auto d-flex align-items-center gap-2">
          <span class={`badge ${syncBadge().cls}`}>{syncBadge().label}</span>
          <A
            href="/settings"
            class="btn btn-sm btn-outline-secondary btn-icon"
            aria-label="Open settings"
            title="Settings"
          >
            <i class="fas fa-gear" />
          </A>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <div
        class={`sidebar-overlay ${sidebarOpen() ? "overlay-visible" : ""}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <nav class={`app-sidebar ${sidebarOpen() ? "sidebar-open" : ""}`}>
        <div class="sidebar-header">
          <button
            class="sidebar-hamburger"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <i class="fas fa-bars" />
          </button>
          <div class="sidebar-logo">
            <i class="fas fa-check-double text-primary" />
            Vara Tasks
          </div>
          <div class="ms-auto d-none d-md-flex align-items-center gap-2">
            <span
              class={`badge ${syncBadge().cls}`}
              title={syncState().lastError ?? undefined}
            >
              {syncBadge().label}
            </span>
          </div>
        </div>

        <div class="sidebar-nav">
          <A
            href="/"
            class="sidebar-link"
            classList={{ active: pathname() === "/" }}
            onClick={closeSidebar}
          >
            <i class="fas fa-list-check" />
            All Projects
          </A>

          {/* Local Projects */}
          <Show when={localProjects().length > 0}>
            <div class="sidebar-section">
              <span class="sidebar-section-label">
                <i class="fas fa-hard-drive me-1" />
                Local
              </span>
            </div>
            <For each={localProjects()}>
              {(p) => (
                <A
                  href={`/projects/${p.id}`}
                  class={`sidebar-project-link ${isProjectActive(p.id) ? "active" : ""}`}
                  onClick={closeSidebar}
                >
                  <span class="project-dot" style={{ background: "#9ca3af" }} />
                  <span
                    class="flex-grow-1"
                    style={{
                      overflow: "hidden",
                      "text-overflow": "ellipsis",
                      "white-space": "nowrap",
                    }}
                  >
                    {p.title}
                  </span>
                </A>
              )}
            </For>
          </Show>

          {/* Server Projects */}
          <Show when={serverProjects().length > 0}>
            <div class="sidebar-section">
              <span class="sidebar-section-label">
                <i class="fas fa-server me-1" />
                Server
              </span>
            </div>
            <For each={serverProjects()}>
              {(p) => (
                <A
                  href={`/projects/${p.id}`}
                  class={`sidebar-project-link ${isProjectActive(p.id) ? "active" : ""}`}
                  onClick={closeSidebar}
                >
                  <span
                    class="project-dot"
                    style={{
                      background:
                        p.syncStatus === "synced"
                          ? "#22c55e"
                          : p.syncStatus === "error"
                            ? "#ef4444"
                            : "#f59e0b",
                    }}
                  />
                  <span
                    class="flex-grow-1"
                    style={{
                      overflow: "hidden",
                      "text-overflow": "ellipsis",
                      "white-space": "nowrap",
                    }}
                  >
                    {p.title}
                  </span>
                </A>
              )}
            </For>
          </Show>
        </div>

        <div class="sidebar-footer">
          <A
            href="/labels"
            class="sidebar-link"
            classList={{ active: pathname() === "/labels" }}
            onClick={closeSidebar}
          >
            <i class="fas fa-tags" />
            Labels
          </A>
          <A
            href="/settings"
            class="sidebar-link"
            classList={{ active: pathname() === "/settings" }}
            onClick={closeSidebar}
          >
            <i class="fas fa-gear" />
            Settings
          </A>
        </div>
      </nav>

      {/* Main Content */}
      <main class="app-main">
        {/* Offline bar */}
        <Show when={!syncState().isOnline}>
          <div class="offline-bar">
            <i class="fas fa-wifi-slash" />
            You're offline — changes will sync when reconnected.
          </div>
        </Show>
        {props.children}
      </main>
    </div>
  );
};

export default AppLayout;
