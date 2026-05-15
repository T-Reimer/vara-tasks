import { createSignal, Show, type Component } from "solid-js";

interface PromptModalProps {
  show: boolean;
  heading: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const PromptModal: Component<PromptModalProps> = (props) => {
  const [value, setValue] = createSignal("");

  const handleConfirm = () => {
    if (!value().trim()) return;
    props.onConfirm(value().trim());
    setValue("");
  };

  const handleCancel = () => {
    setValue("");
    props.onCancel();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <Show when={props.show}>
      {/* Backdrop */}
      <div
        class="modal-backdrop fade show"
        style={{ "z-index": 1040 }}
        onClick={handleCancel}
      />
      {/* Modal */}
      <div
        class="modal fade show d-block"
        style={{ "z-index": 1050 }}
        role="dialog"
        aria-modal="true"
      >
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header py-2 px-3">
              <h6 class="modal-title mb-0">{props.heading}</h6>
              <button
                type="button"
                class="btn-close"
                style={{ "font-size": "0.75rem" }}
                onClick={handleCancel}
              />
            </div>
            <div class="modal-body py-3 px-3">
              <input
                class="form-control form-control-sm"
                placeholder={props.placeholder ?? "Enter value…"}
                value={value()}
                onInput={(e) => setValue(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                autofocus
              />
            </div>
            <div class="modal-footer py-2 px-3">
              <button
                class="btn btn-outline-secondary btn-sm"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                class="btn btn-primary btn-sm"
                onClick={handleConfirm}
                disabled={!value().trim()}
              >
                {props.confirmLabel ?? "Add"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default PromptModal;
