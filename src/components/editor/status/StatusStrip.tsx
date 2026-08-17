import { SaveStatePropsStateType } from "./SaveState";
import { FpsBadge } from "./FpsBadge";
import { LastLogChip } from "./LastLogChip";
import { SaveState } from "./SaveState";

export interface StatusStripProps {
  undo: number;
  redo: number;
  state: SaveStatePropsStateType;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function StatusStrip({ undo, redo, state, onUndo, onRedo }: StatusStripProps): React.JSX.Element | null {
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
