import {
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";

const OfflineIndicator: Component = () => {
  const [offline, setOffline] = createSignal(!navigator.onLine);

  onMount(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    onCleanup(() => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    });
  });

  return (
    <Show when={offline()}>
      <div class="alert alert-warning py-1 px-3 mb-0 d-flex align-items-center gap-2 rounded-0">
        <span>⚠️</span>
        <span>You're offline — changes will sync when you reconnect.</span>
      </div>
    </Show>
  );
};

export default OfflineIndicator;
