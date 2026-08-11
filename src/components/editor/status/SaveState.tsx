
export enum SaveStatePropsStateType {
  Saved = "Saved",
  Dirty = "Dirty",
  Saving = "Saving...",
}
import { Redo2, Undo2 } from "lucide-react";

export interface SaveStateProps {
  undo: number;
  redo: number;
  state: SaveStatePropsStateType;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function SaveState({ undo, redo, state, onUndo, onRedo }: SaveStateProps) {
  return (
    <span className="editor-save-state hmi-tabular text-hmi-badge">
      <button
        type="button"
        aria-label="Undo"
        disabled={undo === 0}
        onClick={onUndo}
        className="editor-save-state-button"
      >
        <Undo2 aria-hidden size={15} />
        {undo}
      </button>
      <button
        type="button"
        aria-label="Redo"
        disabled={redo === 0}
        onClick={onRedo}
        className="editor-save-state-button"
      >
        <Redo2 aria-hidden size={15} />
        {redo}
      </button>
      <span className="px-hmi-2 text-ca-ink-muted">·</span>
      <span className={state === "Dirty" ? "text-ca-warn" : ""}>{state}</span>
    </span>
  );
}