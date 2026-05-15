import { createSignal, For, type Component } from "solid-js";
import { A } from "@solidjs/router";
import type { ServerProfile } from "../models/types";
import {
  createServerProfile,
  listServerProfiles,
  parseServerJoinPayload,
  updateServerProfileName,
} from "../services/server-config";
import { fetchServerJoinPayload, loginToServer } from "../services/api";

const SettingsPage: Component = () => {
  const [servers, setServers] =
    createSignal<ServerProfile[]>(listServerProfiles());
  const [serverUrl, setServerUrl] = createSignal("");
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
      setServerUrl("");
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
      setMessage("Payload generated — share this to add a new device.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed.");
    }
  };

  return (
    <div class="container py-4">
      <div class="d-flex align-items-center gap-3 mb-4">
        <A href="/" class="btn btn-outline-secondary btn-sm">
          ← Back
        </A>
        <h1 class="h3 mb-0">Settings</h1>
      </div>

      {message() && <div class="alert alert-info py-2">{message()}</div>}

      <div class="row g-4">
        <div class="col-12 col-md-6">
          <div class="card">
            <div class="card-body">
              <h2 class="h5">Add Server via Code</h2>
              <form onSubmit={addServer} class="row g-2">
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
                    placeholder="Device name (optional)"
                    value={deviceName()}
                    onInput={(e) => setDeviceName(e.currentTarget.value)}
                  />
                </div>
                <div class="col-12">
                  <button class="btn btn-primary btn-sm" type="submit">
                    Add &amp; Log In
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div class="card mt-3">
            <div class="card-body">
              <h2 class="h5">Import via QR / Text Payload</h2>
              <form onSubmit={importServer} class="row g-2">
                <div class="col-12">
                  <textarea
                    class="form-control"
                    rows={4}
                    placeholder={`{"serverUrl":"...","token":"...","userId":"..."}`}
                    value={joinPayloadText()}
                    onInput={(e) => setJoinPayloadText(e.currentTarget.value)}
                  />
                </div>
                <div class="col-12">
                  <button
                    class="btn btn-outline-secondary btn-sm"
                    type="submit"
                  >
                    Import
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div class="col-12 col-md-6">
          <h2 class="h5 mb-3">Configured Servers ({servers().length})</h2>
          <For each={servers()}>
            {(server) => (
              <div class="card mb-3">
                <div class="card-body py-2 px-3">
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
                      Save
                    </button>
                  </div>
                  <div class="small text-muted">{server.baseUrl}</div>
                  <div class="small text-muted">User: {server.userId}</div>
                  <div class="small text-muted">
                    Last auth:{" "}
                    {new Date(server.lastAuthenticatedAt).toLocaleString()}
                  </div>
                  <div class="mt-2">
                    <button
                      class="btn btn-sm btn-outline-primary"
                      onClick={() => generatePayload(server)}
                    >
                      Generate Join Payload
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
          {servers().length === 0 && (
            <p class="text-muted small">No servers configured.</p>
          )}

          {generatedPayload() && (
            <div class="mt-3">
              <label class="form-label small text-muted">
                Join payload (share to add device)
              </label>
              <textarea
                class="form-control"
                rows={6}
                readOnly
                value={generatedPayload()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
