import { createSignal, For, Show, type Component } from "solid-js";
import type { Label, LabelAssignment, TargetType } from "../models/types";
import {
  getAssignmentsForTarget,
  listAllLabels,
  removeLabelValue,
  setLabelValue,
} from "../services/labels";
import LabelBadge from "./LabelBadge";

interface Props {
  projectId: string;
  targetId: string;
  targetType: TargetType;
  onChanged?: () => void;
}

const LabelAssigner: Component<Props> = (props) => {
  const allLabels = () => listAllLabels(props.projectId);
  const assignments = () =>
    getAssignmentsForTarget(props.projectId, props.targetId);

  const [open, setOpen] = createSignal(false);
  const [selectedLabelId, setSelectedLabelId] = createSignal(
    allLabels()[0]?.id ?? "",
  );
  const [value, setValue] = createSignal("");

  const selectedLabel = (): Label | undefined =>
    allLabels().find((l) => l.id === selectedLabelId());

  const assign = () => {
    if (!selectedLabelId() || !value().trim()) return;
    setLabelValue(
      props.projectId,
      selectedLabelId(),
      props.targetId,
      props.targetType,
      value().trim(),
    );
    setValue("");
    props.onChanged?.();
  };

  const remove = (assignment: LabelAssignment) => {
    removeLabelValue(props.projectId, assignment.labelId, props.targetId);
    props.onChanged?.();
  };

  return (
    <div>
      <div class="d-flex flex-wrap gap-1 mb-1">
        <For each={assignments()}>
          {(a) => {
            const label = allLabels().find((l) => l.id === a.labelId);
            return label ? (
              <span class="d-inline-flex align-items-center gap-1">
                <LabelBadge label={label} assignment={a} />
                <button
                  type="button"
                  class="btn-close btn-close-white"
                  style={{ "font-size": "0.6rem" }}
                  aria-label="Remove label"
                  onClick={() => remove(a)}
                />
              </span>
            ) : null;
          }}
        </For>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          onClick={() => setOpen(!open())}
        >
          + Label
        </button>
      </div>

      <Show when={open()}>
        <div class="border rounded p-2 mb-2 bg-light">
          <div class="row g-2">
            <div class="col">
              <select
                class="form-select form-select-sm"
                value={selectedLabelId()}
                onChange={(e) => {
                  setSelectedLabelId(e.currentTarget.value);
                  setValue("");
                }}
              >
                <For each={allLabels()}>
                  {(label) => <option value={label.id}>{label.title}</option>}
                </For>
              </select>
            </div>
            <div class="col">
              <Show when={selectedLabel()?.type === "dropdown"}>
                <select
                  class="form-select form-select-sm"
                  value={value()}
                  onChange={(e) => setValue(e.currentTarget.value)}
                >
                  <option value="">Select…</option>
                  <For each={selectedLabel()?.options ?? []}>
                    {(opt) => <option value={opt}>{opt}</option>}
                  </For>
                </select>
              </Show>
              <Show when={selectedLabel()?.type === "date"}>
                <input
                  type="date"
                  class="form-control form-control-sm"
                  value={value()}
                  onInput={(e) => setValue(e.currentTarget.value)}
                />
              </Show>
              <Show when={selectedLabel()?.type === "text"}>
                <input
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Value…"
                  value={value()}
                  onInput={(e) => setValue(e.currentTarget.value)}
                />
              </Show>
            </div>
            <div class="col-auto">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                onClick={assign}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default LabelAssigner;
