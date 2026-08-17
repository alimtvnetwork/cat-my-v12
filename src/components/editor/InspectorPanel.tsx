// Plan 75 step 9 (Issue 11): dedicated InspectorPanel that isolates
// detector / rule parameter controls from the LayersPanel (which owns
// only the reorderable rule rows with visibility/lock). This is the
// Photoshop-style split: layers list on one dock, inspector on another.
//
// Store-connected wrapper around PropertiesPanel. Kept as a thin shell
// so PropertiesPanel can stay pure/testable while the panel-registry
// entry for "properties" gets a real component to mount.
import { useCallback } from "react";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { IMAGE_BOUNDS } from "@/lib/editor/coords";
import type { EditorRect } from "@/lib/editor/types";
import { PropertiesPanel } from "./PropertiesPanel";

export interface InspectorPanelProps {
  /** Image bounds used for ROI clamping. Defaults to IMAGE_BOUNDS. */
  imageBounds?: EditorRect;
}

export function InspectorPanel({ imageBounds }: InspectorPanelProps): React.JSX.Element | null {
  const rules = useRulesStore((s) => s.rules);
  const selectedIds = useRulesStore((s) => s.selectedIds);
  const setRuleName = useRulesStore((s) => s.setRuleName);
  const setKind = useRulesStore((s) => s.setKind);
  const updateParams = useRulesStore((s) => s.updateParams);
  const setRuleBounds = useRulesStore((s) => s.setRuleBounds);
  const setHidden = useRulesStore((s) => s.setHidden);
  const setLocked = useRulesStore((s) => s.setLocked);

  const bounds = imageBounds ?? IMAGE_BOUNDS;

  const onSetBounds = useCallback(
    (id: string, rect: EditorRect) => setRuleBounds(id, rect, bounds),
    [setRuleBounds, bounds],
  );

  return (
    <div
      role="region"
      aria-label="Inspector"
      className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-ca-panel"
    >
      <PropertiesPanel
        rules={rules}
        selectedIds={selectedIds}
        imageBounds={bounds}
        onRename={setRuleName}
        onSetKind={setKind}
        onUpdateParams={updateParams}
        onSetBounds={onSetBounds}
        onSetHidden={setHidden}
        onSetLocked={setLocked}
      />
    </div>
  );
}

export default InspectorPanel;
