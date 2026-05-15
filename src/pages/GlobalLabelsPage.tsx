import { createSignal, type Component } from "solid-js";
import LabelManager from "../components/LabelManager";

const GlobalLabelsPage: Component = () => {
  const [message, setMessage] = createSignal("");

  return (
    <div>
      <div class="page-header">
        <h1 class="page-title">
          <i
            class="fas fa-tags me-2 text-muted"
            style={{ "font-size": "1rem" }}
          />
          Global Labels
        </h1>
      </div>
      <div class="page-content">
        <p class="text-muted small mb-4">
          Global labels are available across all projects. Use project settings
          to add project-specific labels.
        </p>
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
        <LabelManager
          projectId={null}
          onChanged={() => setMessage("Labels updated.")}
        />
      </div>
    </div>
  );
};

export default GlobalLabelsPage;
