import { createSignal, onCleanup, onMount, type Component } from "solid-js";
import {
  getSyncState,
  subscribeSyncState,
  type SyncState,
} from "../services/sync-engine";

const SyncStatus: Component = () => {
  const [state, setState] = createSignal<SyncState>(getSyncState());

  onMount(() => {
    const unsub = subscribeSyncState((s) => setState(s));
    onCleanup(unsub);
  });

  const badge = () => {
    const s = state();
    if (!s.isOnline) return { cls: "text-bg-secondary", label: "Offline" };
    if (s.isSyncing) return { cls: "text-bg-info", label: "Syncing…" };
    if (s.failed > 0)
      return { cls: "text-bg-danger", label: `${s.failed} failed` };
    if (s.pending > 0)
      return { cls: "text-bg-warning", label: `${s.pending} pending` };
    return { cls: "text-bg-success", label: "Synced" };
  };

  return (
    <span class={`badge ${badge().cls}`} title={state().lastError ?? undefined}>
      {badge().label}
    </span>
  );
};

export default SyncStatus;
