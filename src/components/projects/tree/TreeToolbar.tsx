// Plan 03 step 2. Tree toolbar: expand-all, collapse-all, new recipe.
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §4.3.

import { useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, Plus } from "lucide-react";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export interface TreeToolbarProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onNewRecipe: (name: string) => void;
}

export function TreeToolbar(props: TreeToolbarProps): React.JSX.Element {
  const [isAdding, setIsAdding] = useState(false);
  const [draftName, setDraftName] = useState("");

  const commit = (): void => {
    const clean = draftName.trim();

    if (clean.length > 0) props.onNewRecipe(clean);

    setDraftName("");
    setIsAdding(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (KeyboardKeyType.isEnterOrSpace(event.key)) {
      event.preventDefault();
      commit();
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-ca-border bg-ca-panel-2 px-2 py-1.5">
      <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-ca-ink-muted">
        Structure
      </span>
      <button
        type="button"
        onClick={props.onExpandAll}
        aria-label="Expand all"
        title="Expand all"
        className="flex h-6 w-6 items-center justify-center rounded-sm text-ca-ink-muted hover:bg-ca-panel hover:text-ca-ink"
      >
        <ChevronsUpDown size={14} />
      </button>
      <button
        type="button"
        onClick={props.onCollapseAll}
        aria-label="Collapse all"
        title="Collapse all"
        className="flex h-6 w-6 items-center justify-center rounded-sm text-ca-ink-muted hover:bg-ca-panel hover:text-ca-ink"
      >
        <ChevronsDownUp size={14} />
      </button>
      <div className="flex-1" />
      {isAdding ? (
        <input
          autoFocus
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          aria-label="New recipe name"
          placeholder="Recipe name"
          maxLength={64}
          className="h-6 w-40 rounded-sm border border-ca-select bg-ca-bg px-1.5 text-xs text-ca-ink outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex h-6 items-center gap-1 rounded-sm border border-ca-border bg-ca-panel px-1.5 text-xs text-ca-ink hover:border-ca-select"
        >
          <Plus size={14} />
          Recipe
        </button>
      )}
    </div>
  );
}
