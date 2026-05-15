import { createSignal, type Component } from "solid-js";

interface Props {
  placeholder?: string;
  onSearch: (query: string) => void;
}

const SearchBar: Component<Props> = (props) => {
  const [query, setQuery] = createSignal("");

  const handleInput = (value: string) => {
    setQuery(value);
    props.onSearch(value);
  };

  return (
    <div class="input-group">
      <span class="input-group-text">🔍</span>
      <input
        type="search"
        class="form-control"
        placeholder={props.placeholder ?? "Search…"}
        value={query()}
        onInput={(e) => handleInput(e.currentTarget.value)}
      />
      {query() && (
        <button
          type="button"
          class="btn btn-outline-secondary"
          onClick={() => handleInput("")}
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchBar;
