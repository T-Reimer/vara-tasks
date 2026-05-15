import { createSignal, For, Show, type Component } from "solid-js";
import type { AttachmentMeta } from "../models/types";
import {
  deleteAttachment,
  getLinkedTasks,
  getObjectUrl,
} from "../services/attachments";

interface Props {
  projectId: string;
  attachment: AttachmentMeta;
  onDeleted?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const AttachmentCard: Component<Props> = (props) => {
  const [expanded, setExpanded] = createSignal(false);
  const linkedTaskIds = () =>
    getLinkedTasks(props.projectId, props.attachment.id);
  const isImage = () => props.attachment.mimeType.startsWith("image/");

  const openFile = () => {
    const url = getObjectUrl(props.projectId, props.attachment);
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.download = props.attachment.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  };

  const remove = () => {
    if (confirm(`Delete "${props.attachment.filename}"?`)) {
      deleteAttachment(props.projectId, props.attachment.id);
      props.onDeleted?.();
    }
  };

  const syncBadge = () => {
    switch (props.attachment.syncStatus) {
      case "synced":
        return "text-bg-success";
      case "error":
        return "text-bg-danger";
      default:
        return "text-bg-warning";
    }
  };

  return (
    <div class="card h-100">
      <Show when={isImage()}>
        <div
          class="card-img-top bg-secondary d-flex align-items-center justify-content-center"
          style={{ height: "120px", cursor: "pointer" }}
          onClick={() => setExpanded(!expanded())}
        >
          <span class="text-white">🖼️ {props.attachment.filename}</span>
        </div>
      </Show>
      <div class="card-body py-2 px-3">
        <div class="d-flex align-items-start gap-2">
          <div class="flex-grow-1 overflow-hidden">
            <div
              class="fw-semibold text-truncate small"
              title={props.attachment.filename}
            >
              {props.attachment.filename}
            </div>
            <div class="text-muted" style={{ "font-size": "0.75rem" }}>
              {formatBytes(props.attachment.fileSize)} ·{" "}
              {props.attachment.mimeType}
            </div>
            <Show when={linkedTaskIds().length > 0}>
              <div class="text-muted" style={{ "font-size": "0.72rem" }}>
                Linked to {linkedTaskIds().length} task(s)
              </div>
            </Show>
          </div>
          <span
            class={`badge ${syncBadge()} align-self-start`}
            style={{ "font-size": "0.65rem" }}
          >
            {props.attachment.syncStatus}
          </span>
        </div>
      </div>
      <div class="card-footer py-1 px-3 d-flex gap-1">
        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          onClick={openFile}
        >
          ⬇ Download
        </button>
        <button
          type="button"
          class="btn btn-outline-danger btn-sm ms-auto"
          onClick={remove}
        >
          🗑
        </button>
      </div>
    </div>
  );
};

export default AttachmentCard;
