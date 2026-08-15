export enum RightRailDirectionType {
  Up = "up",
  Down = "down",
}
// Plan 35 step 14: RightRail is now a thin shell. The Compact CAD Toolbar
// theme (chosen 2026-07) removed the redundant "RULES" title row (the
// outer panel chrome already labels this "Rules") and folded Export /
// Import / Expand-all / Collapse-all into a single ⋯ menu rendered by
// RulesRailHeader.
import type { EditorRule, EditorRuleParams, EditorRect } from "@/lib/editor/types";
import type { RuleGroup } from "@/lib/editor/store/rules-slice";
import { IMAGE_BOUNDS } from "@/lib/editor/coords";
import { InspectorSurface } from "../InspectorSurface";
// RulesRailHeader import removed (v3.947.0): the "N layers" chrome band was killed.
import { useUiPrefsStore } from "@/lib/ui-prefs-store";

export interface RightRailProps {
  rules: EditorRule[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onReorder: (id: string, direction: RightRailDirectionType) => void;
  onUpdateParams: (id: string, params: EditorRuleParams) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onReorderToIndex?: (id: string, targetIndex: number) => void;
  onImportRules: (rules: EditorRule[], groups?: RuleGroup[]) => void;
  onImportError?: (message: string) => void;
  /** Groups to include when exporting; optional to preserve back-compat. */
  groups?: readonly RuleGroup[];
  /** Bounds used by PropertiesPanel for coord clamping. Defaults to IMAGE_BOUNDS. */
  imageBounds?: EditorRect;
}

export function RightRail({
  rules,
  groups,
  onImportRules,
  onImportError,
  imageBounds,
}: RightRailProps) {
  const bounds = imageBounds ?? IMAGE_BOUNDS;
  const density = useUiPrefsStore((s) => s.headerDensity);

  return (
    <aside
      role="complementary"
      aria-label="Rule layers and properties"
      data-density={density}
      data-testid="right-rail"
      className="right-rail flex h-full min-h-0 flex-col overflow-hidden border-l border-ca-border bg-ca-panel shadow-hmi-panel"
    >
      {/* Chrome killed: RulesRailHeader ("N layers" strip) removed. The
          outer panel already titles this "Rules"; Export/Import live in
          the command palette and LayersToolbar overflow. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <InspectorSurface imageBounds={bounds} />
      </div>
    </aside>
  );
}
