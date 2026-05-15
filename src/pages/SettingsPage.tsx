import { createSignal, For, type Component } from "solid-js";
import {
  createServerProfile,
  listServerProfiles,
  parseServerJoinPayload,
  updateServerProfileName,
} from "../services/server-config";
import { fetchServerJoinPayload, loginToServer } from "../services/api";
import type { ServerProfile } from "../models/types";

const SettingsPage: Component = () => {
  const [servers, setServers] =
    createSignal<ServerProfile[]>(listServerProfiles());
  const [serverUrl, setServerUrl] = createSignal(
    typeof window !== "undefined" ? window.location.origin : "",
  );
  const [serverCode, setServerCode] = createSignal("");
  const [deviceName, setDeviceName] = createSignal("Web Client");
  const [joinPayloadText, setJoinPayloadText] = createSignal("");
  const [generatedPayload, setGeneratedPayload] = createSignal("");
  const [renameDrafts, setRenameDrafts] = createSignal<Record<string, string>>(
    Object.fromEntries(listServerProfiles().map((s) => [s.id, s.name])),
  );
  const [message, setMessage] = createSignal("");

  const refresh = () => {
    const updated = listServerProfiles();
    setServers(updated);
    setRenameDrafts(Object.fromEntries(updated.map((s) => [s.id, s.name])));
  };

  const addServer = async (e: SubmitEvent) => {
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
      createServerProfile({
        baseUrl: serverUrl(),
        authToken: login.token,
        userId: login.userId,
      });
      setServerUrl(typeof window !== "undefined" ? window.location.origin : "");
      setServerCode("");
      refresh();
      setMessage("Server added.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add server.");
    }
  };

  const importServer = (e: SubmitEvent) => {
    e.preventDefault();
    try {
      const payload = parseServerJoinPayload(joinPayloadText());
      createServerProfile({
        baseUrl: payload.serverUrl,
        authToken: payload.token,
        userId: payload.userId,
      });
      setJoinPayloadText("");
      refresh();
      setMessage("Server imported.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Invalid payload.");
    }
  };

  const saveName = (serverId: string) => {
    updateServerProfileName(serverId, renameDrafts()[serverId] ?? "");
    refresh();
    setMessage("Name saved.");
  };

  const generatePayload = async (server: ServerProfile) => {
    try {
      const payload = await fetchServerJoinPayload({ server });
      setGeneratedPayload(JSON.stringify(payload, null, 2));
      setMessage("Payload generated — share to add a new device.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed.");
    }
  };

  return (
    <div>
      <div class="page-header">
        <h1 class="page-title">
          <i
            class="fas fa-gear me-2 text-muted"
            style={{ "font-size": "1rem" }}
          />
          Settings
        </h1>
      </div>

      <div class="page-content">
        {message() && (
          <div class="alert alert-info py-2 d-flex align-items-center gap-2 mb-4">
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

        {/* Add Server */}
        <div class="vara-card mb-4">
          <h2 class="h6 mb-3">
            <i class="fas fa-server me-2 text-primary" />
            Add Server via Code
          </h2>
          <form onSubmit={addServer} class="row g-2">
            <div class="col-12">
              <label class="form-label small">Server URL</label>
              <input
                class="form-control form-control-sm"
                placeholder="https://server.example.com"
                value={serverUrl()}
                onInput={(e) => setServerUrl(e.currentTarget.value)}
              />
            </div>
            <div class="col-12">
              <label class="form-label small">Auth code</label>
              <input
                class="form-control form-control-sm"
                placeholder="One-time auth code"
                value={serverCode()}
                onInput={(e) => setServerCode(e.currentTarget.value)}
              />
            </div>
            <div class="col-12">
              <label class="form-label small">Device name</label>
              <input
                class="form-control form-control-sm"
                placeholder="Device name (optional)"
                value={deviceName()}
                onInput={(e) => setDeviceName(e.currentTarget.value)}
              />
            </div>
            <div class="col-12">
              <button class="btn btn-primary btn-sm" type="submit">
                <i class="fas fa-plug me-1" />
                Connect
              </button>
            </div>
          </form>
        </div>

        {/* Import via payload */}
        <div class="vara-card mb-4">
          <h2 class="h6 mb-3">
            <i class="fas fa-qrcode me-2 text-primary" />
            Import via QR / Text Payload
          </h2>
          <form onSubmit={importServer} class="row g-2">
            <div class="col-12">
              <textarea
                class="form-control form-control-sm"
                rows={3}
                placeholder={`{"serverUrl":"...","token":"...","userId":"..."}`}
                value={joinPayloadText()}
                onInput={(e) => setJoinPayloadText(e.currentTarget.value)}
              />
            </div>
            <div class="col-12">
              <button class="btn btn-outline-secondary btn-sm" type="submit">
                <i class="fas fa-file-import me-1" />
                Import
              </button>
            </div>
          </form>
        </div>

        {/* Configured Servers */}
        <h2 class="h6 mb-3">
          <i class="fas fa-server me-2 text-muted" />
          Configured Servers ({servers().length})
        </h2>

        <For each={servers()}>
          {(server) => (
            <div class="vara-card mb-3">
              <div class="input-group input-group-sm mb-2">
                <input
                  class="form-control"
                  value={renameDrafts()[server.id] ?? server.name}
                  onInput={(e) =>
                    setRenameDrafts((d) => ({
                      ...d,
                      [server.id]: e.currentTarget.value,
                    }))
                  }
                />
                <button
                  class="btn btn-outline-secondary"
                  type="button"
                  onClick={() => saveName(server.id)}
                >
                  <i class="fas fa-floppy-disk me-1" />
                  Save
                </button>
              </div>
              <div class="small text-muted mb-1">
                <i class="fas fa-link me-1" />
                {server.baseUrl}
              </div>
              <div class="small text-muted mb-1">
                <i class="fas fa-user me-1" />
                {server.userId}
              </div>
              <div class="small text-muted mb-2">
                <i class="fas fa-clock me-1" />
                {new Date(server.lastAuthenticatedAt).toLocaleString()}
              </div>
              <button
                class="btn btn-sm btn-outline-primary"
                onClick={() => generatePayload(server)}
              >
                <i class="fas fa-share-nodes me-1" />
                Share payload
              </button>
            </div>
          )}
        </For>

        {servers().length === 0 && (
          <p class="text-muted small">No servers configured.</p>
        )}

        {generatedPayload() && (
          <div class="mt-3">
            <label class="form-label small text-muted">
              <i class="fas fa-key me-1" />
              Join payload (share to add device)
            </label>
            <textarea
              class="form-control form-control-sm"
              rows={5}
              readOnly
              value={generatedPayload()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
