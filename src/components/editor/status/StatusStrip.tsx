
export enum StatusStripPropsStateType {
  Saved = "Saved",
  Dirty = "Dirty",
  Saving = "Saving...",
}
import { FpsBadge } from "./FpsBadge";
import { LastLogChip } from "./LastLogChip";
import { SaveState } from "./SaveState";

export interface StatusStripProps {
  undo: number;
  redo: number;
  state: StatusStripPropsStateType;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function StatusStrip({ undo, redo, state, onUndo, onRedo }: StatusStripProps) {
  return (
    <div role="status" className="editor-status-strip">
      <LastLogChip />
      <div className="justify-self-center">
        <FpsBadge />
      </div>
      <div className="justify-self-end">
        <SaveState undo={undo} redo={redo} state={state} onUndo={onUndo} onRedo={onRedo} />
      </div>
    </div>
  );
}
