import { type Component } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { getProject } from "../services/projects";
import LabelManager from "../components/LabelManager";

const ProjectSettingsPage: Component = () => {
  const params = useParams();
  const projectId = () => params.id!;
  const project = () => getProject(projectId());

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
      {/* Header */}
      <div class="page-header">
        <A
          href={`/projects/${projectId()}`}
          class="btn btn-outline-secondary btn-sm btn-icon"
          title="Back to project"
        >
          <i class="fas fa-arrow-left" />
        </A>
        <h1 class="page-title">
          <i
            class="fas fa-sliders me-2 text-muted"
            style={{ "font-size": "1rem" }}
          />
          {project()?.title} — Settings
        </h1>
      </div>

      {/* Content */}
      <div class="page-content">
        <div class="mb-4">
          <h2 class="h6 mb-3">
            <i class="fas fa-tags me-2 text-muted" />
            Labels
          </h2>
          <LabelManager projectId={projectId()} onChanged={() => {}} />
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsPage;
