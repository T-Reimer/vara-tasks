import { createEffect, createSignal, For, Show, type Component } from "solid-js";
import type { AttachmentMeta } from "../models/types";
import { ingestFile, listAttachments, listAttachmentsForTask } from "../services/attachments";
import AttachmentCard from "./AttachmentCard";

interface Props {
  projectId: string;
  /** If set, filter to attachments for this task */
  taskId?: string;
  /** If set, new uploads will be linked to this task */
  uploadTaskId?: string;
}

const AttachmentHub: Component<Props> = (props) => {
  const [attachments, setAttachments] = createSignal<AttachmentMeta[]>([]);
  const [uploading, setUploading] = createSignal(false);
  const [error, setError] = createSignal("");

  const refresh = () => {
    let all = listAttachments(props.projectId);
    setAttachments(all);
  };

  createEffect(() => {
    void props.projectId;
    void props.taskId;
    refresh();
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        await ingestFile(props.projectId, file, props.uploadTaskId);
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    void handleFiles(e.dataTransfer?.files ?? null);
  };

  const onDragOver = (e: DragEvent) => e.preventDefault();

  const displayed = () => {
    if (!props.taskId) return attachments();
    return listAttachmentsForTask(props.projectId, props.taskId);
  };

  return (
    <div>
      {/* Drop zone */}
      <label
        class="d-block border border-dashed rounded p-3 text-center mb-3"
        style={{ cursor: "pointer", "border-style": "dashed" }}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <input
          type="file"
          multiple
          class="d-none"
          onChange={(e) => void handleFiles(e.currentTarget.files)}
        />
        <Show
          when={uploading()}
          fallback={<span>📎 Drop files here or click to upload</span>}
        >
          <span>Uploading…</span>
        </Show>
      </label>

      <Show when={error()}>
        <div class="alert alert-danger py-2">{error()}</div>
      </Show>

      <Show when={displayed().length === 0}>
        <p class="text-muted small">No attachments yet.</p>
      </Show>

      <div class="row g-2">
        <For each={displayed()}>
          {(att) => (
            <div class="col-12 col-sm-6 col-md-4">
              <AttachmentCard
                projectId={props.projectId}
                attachment={att}
                onDeleted={refresh}
              />
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default AttachmentHub;
