import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 84 Step 9 (Issue 30): docked Properties panel body.
//
// Root cause the file addresses, in one sentence: EditorShell only wired
// `tools` and `rules` into PanelHost.content, so the registered
// `properties` panel rendered PanelHost's "No content wired" placeholder
// and never observed selection from `useRulesStore`.
//
// This component mirrors the store subscription that `InspectorSurface`
// uses for `PropertiesPanel`, so the docked Properties panel reflects
// canvas selection identically to the floating HUD and the inline
// Properties section inside the Rules rail. Kept as a thin bridge -
// no new UI, no new state, just the store wire-up.
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { IMAGE_BOUNDS } from "@/lib/editor/coords";
import { PropertiesPanel } from "../PropertiesPanel";

export interface DockedPropertiesPanelProps {
  /** Optional override for coord clamping; falls back to IMAGE_BOUNDS. */
  imageBounds?: typeof IMAGE_BOUNDS;
}

export function DockedPropertiesPanel({
  imageBounds,
}: DockedPropertiesPanelProps = {}): React.JSX.Element | null {
  const rules = useRulesStore((s) => s.rules);
  const selectedIds = useRulesStore((s) => s.selectedIds);
  const setRuleName = useRulesStore((s) => s.setRuleName);
  const setKind = useRulesStore((s) => s.setKind);
  const updateParams = useRulesStore((s) => s.updateParams);
  const setRuleBounds = useRulesStore((s) => s.setRuleBounds);
  const setHidden = useRulesStore((s) => s.setHidden);
  const setLocked = useRulesStore((s) => s.setLocked);
  const bounds = imageBounds ?? IMAGE_BOUNDS;

  // Observability: log when the docked panel receives a selection so we
  // can confirm the bridge is active without inspecting the store from
  // devtools. Matches the 3-tier error architecture: silent success is
  // NOT acceptable for a regression that previously showed placeholder
  // copy for every selection.
  if (selectedIds.length > 0) {
    ClientLogger.info("[docked-properties] selection", {
      count: selectedIds.length,
      firstId: selectedIds[0],
    });
  }

  return (
    <div className="editor-scroll-fancy flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain scroll-smooth touch-pan-y [-webkit-overflow-scrolling:touch]">
      <PropertiesPanel
        rules={rules}
        selectedIds={selectedIds}
        imageBounds={bounds}
        onRename={setRuleName}
        onSetKind={setKind}
        onUpdateParams={updateParams}
        onSetBounds={(id, rect) => setRuleBounds(id, rect, bounds)}
        onSetHidden={setHidden}
        onSetLocked={setLocked}
      />
    </div>
  );
}
