import { onCleanup, onMount, type Component } from "solid-js";
import type EditorJS from "@editorjs/editorjs";
import type { EditorContent } from "../models/types";

interface Props {
  value?: EditorContent;
  onChange?: (content: EditorContent) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const EditorJSField: Component<Props> = (props) => {
  let holderRef!: HTMLDivElement;
  let editor: EditorJS | null = null;

  onMount(async () => {
    const [
      { default: Editor },
      { default: Header },
      { default: List },
      { default: Code },
      { default: Quote },
    ] = await Promise.all([
      import("@editorjs/editorjs"),
      import("@editorjs/header"),
      import("@editorjs/list"),
      import("@editorjs/code"),
      import("@editorjs/quote"),
    ]);

    editor = new Editor({
      holder: holderRef,
      readOnly: props.readOnly ?? false,
      placeholder: props.placeholder ?? "Add description…",
      data: props.value ?? { blocks: [] },
      tools: {
        header: Header,
        list: List,
        code: Code,
        quote: Quote,
      },
      onChange: async () => {
        if (!editor || !props.onChange) return;
        const data = await editor.save();
        props.onChange(data as EditorContent);
      },
    });

    await editor.isReady;
  });

  onCleanup(() => {
    editor?.destroy();
    editor = null;
  });

  return (
    <div
      ref={holderRef}
      class="border rounded p-2"
      style={{ "min-height": "120px" }}
    />
  );
};

export default EditorJSField;
