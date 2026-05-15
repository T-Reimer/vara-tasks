import { createSignal, type Component } from "solid-js";
import { A } from "@solidjs/router";
import LabelManager from "../components/LabelManager";

const GlobalLabelsPage: Component = () => {
  const [message, setMessage] = createSignal("");

  return (
    <div class="container py-4">
      <div class="d-flex align-items-center gap-3 mb-4">
        <A href="/" class="btn btn-outline-secondary btn-sm">
          ← Back
        </A>
        <h1 class="h3 mb-0">Global Labels</h1>
      </div>
      <p class="text-muted">
        Global labels are available across all projects. Use project settings to
        add project-specific labels.
      </p>
      {message() && <div class="alert alert-info py-2">{message()}</div>}
      <LabelManager
        projectId={null}
        onChanged={() => setMessage("Labels updated.")}
      />
    </div>
  );
};

export default GlobalLabelsPage;
