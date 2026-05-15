import type { Component } from "solid-js";
import type { Label, LabelAssignment } from "../models/types";

interface Props {
  label: Label;
  assignment?: LabelAssignment;
}

const LabelBadge: Component<Props> = (props) => {
  const text = () => {
    const val = props.assignment?.value;
    return val ? `${props.label.title}: ${val}` : props.label.title;
  };

  return (
    <span
      class="badge"
      style={{ "background-color": props.label.color, color: "#fff" }}
      title={props.label.type}
    >
      {text()}
    </span>
  );
};

export default LabelBadge;
