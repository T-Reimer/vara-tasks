import { createSignal, For, Show, type Component } from "solid-js";
import type { Label, LabelType } from "../models/types";
import {
  createLabel,
  deleteLabel,
  listAllLabels,
  updateLabel,
} from "../services/labels";

interface Props {
  /** null = global label manager */
  projectId: string | null;
  onChanged?: () => void;
}

const LABEL_COLORS = [
  "#FF5733",
  "#3366FF",
  "#33FF99",
  "#FF33CC",
  "#FFB300",
  "#00BCD4",
  "#9C27B0",
  "#4CAF50",
  "#FF9800",
  "#607D8B",
];

const LabelManager: Component<Props> = (props) => {
  const labels = () =>
    listAllLabels(props.projectId ?? "__none__").filter((l) =>
      props.projectId === null
        ? l.projectId === null
        : l.projectId === props.projectId,
    );

  const [title, setTitle] = createSignal("");
  const [type, setType] = createSignal<LabelType>("text");
  const [color, setColor] = createSignal(LABEL_COLORS[0]!);
  const [options, setOptions] = createSignal("");
  const [editId, setEditId] = createSignal<string | null>(null);
  const [editTitle, setEditTitle] = createSignal("");
  const [editOptions, setEditOptions] = createSignal("");
  const [editColor, setEditColor] = createSignal("");

  const addLabel = () => {
    if (!title().trim()) return;
    const opts =
      type() === "dropdown"
        ? options()
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    createLabel({
      projectId: props.projectId,
      title: title().trim(),
      type: type(),
      color: color(),
      options: opts,
    });
    setTitle("");
    setOptions("");
    props.onChanged?.();
  };

  const startEdit = (label: Label) => {
    setEditId(label.id);
    setEditTitle(label.title);
    setEditOptions(label.options?.join(", ") ?? "");
    setEditColor(label.color);
  };

  const saveEdit = (label: Label) => {
    const opts =
      label.type === "dropdown"
        ? editOptions()
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    updateLabel(
      editId()!,
      { title: editTitle(), color: editColor(), options: opts },
      props.projectId ?? undefined,
    );
    setEditId(null);
    props.onChanged?.();
  };

  const remove = (label: Label) => {
    deleteLabel(label.id, props.projectId ?? undefined);
    props.onChanged?.();
  };

  return (
    <div>
      <div class="mb-3 p-3 border rounded bg-light">
        <div class="row g-2">
          <div class="col-12 col-md-4">
            <input
              class="form-control form-control-sm"
              placeholder="Label title"
              value={title()}
              onInput={(e) => setTitle(e.currentTarget.value)}
            />
          </div>
          <div class="col-6 col-md-2">
            <select
              class="form-select form-select-sm"
              value={type()}
              onChange={(e) => setType(e.currentTarget.value as LabelType)}
            >
              <option value="text">Text</option>
              <option value="date">Date</option>
              <option value="dropdown">Dropdown</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <div class="input-group input-group-sm">
              <input
                type="color"
                class="form-control form-control-color p-1"
                value={color()}
                onInput={(e) => setColor(e.currentTarget.value)}
                title="Label color"
              />
            </div>
          </div>
          <Show when={type() === "dropdown"}>
            <div class="col-12 col-md-4">
              <input
                class="form-control form-control-sm"
                placeholder="Options (comma-separated)"
                value={options()}
                onInput={(e) => setOptions(e.currentTarget.value)}
              />
            </div>
          </Show>
          <div class="col-12">
            <button
              type="button"
              class="btn btn-sm btn-primary"
              onClick={addLabel}
              disabled={!title().trim()}
            >
              Add Label
            </button>
          </div>
        </div>
      </div>

      <ul class="list-group list-group-flush">
        <For each={labels()}>
          {(label) => (
            <li class="list-group-item px-0">
              <Show
                when={editId() === label.id}
                fallback={
                  <div class="d-flex align-items-center gap-2">
                    <span
                      class="badge"
                      style={{ "background-color": label.color }}
                    >
                      {label.title}
                    </span>
                    <span class="text-muted small">{label.type}</span>
                    {label.options && (
                      <span class="text-muted small">
                        ({label.options.join(", ")})
                      </span>
                    )}
                    <div class="ms-auto d-flex gap-1">
                      <button
                        type="button"
                        class="btn btn-outline-secondary btn-sm"
                        onClick={() => startEdit(label)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-danger btn-sm"
                        onClick={() => remove(label)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                }
              >
                <div class="row g-2 align-items-center">
                  <div class="col">
                    <input
                      class="form-control form-control-sm"
                      value={editTitle()}
                      onInput={(e) => setEditTitle(e.currentTarget.value)}
                    />
                  </div>
                  <div class="col-auto">
                    <input
                      type="color"
                      class="form-control form-control-color p-1"
                      style={{ width: "38px" }}
                      value={editColor()}
                      onInput={(e) => setEditColor(e.currentTarget.value)}
                    />
                  </div>
                  <Show when={label.type === "dropdown"}>
                    <div class="col-12">
                      <input
                        class="form-control form-control-sm"
                        placeholder="Options (comma-separated)"
                        value={editOptions()}
                        onInput={(e) => setEditOptions(e.currentTarget.value)}
                      />
                    </div>
                  </Show>
                  <div class="col-auto d-flex gap-1">
                    <button
                      type="button"
                      class="btn btn-sm btn-primary"
                      onClick={() => saveEdit(label)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      onClick={() => setEditId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </Show>
            </li>
          )}
        </For>
      </ul>
      <Show when={labels().length === 0}>
        <p class="text-muted small">No labels yet.</p>
      </Show>
    </div>
  );
};

export default LabelManager;
