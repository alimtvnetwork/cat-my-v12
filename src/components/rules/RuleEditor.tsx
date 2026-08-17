import { ToolIdType } from "@/components/rules/tools/toolTooltipMap";
// Plan 79 step 24. Rule editor shell.
//
// Composition-only surface that hosts the metadata bar (step 25) plus a
// placeholder for the conditions list and applies-before picker slots
// that later steps (26+) will slot in. Kept intentionally thin so the
// route file focuses on data loading and redirects.

import { useCallback, useMemo, useState } from "react";
import type { Rule } from "@/lib/rules/model";
import { RuleMetadataBar } from "./RuleMetadataBar";
import { ToolsPalette } from "./tools/ToolsPalette";
import { type ToolId } from "./tools/toolTooltipMap";
import { PropertiesPalette } from "./PropertiesPalette";
import { LayersPalette } from "./LayersPalette";
import { RuleChainSidebar } from "./RuleChainSidebar";
import { RuleEditorToolbar } from "./RuleEditorToolbar";
import { createRuleController } from "@/lib/editor/controller/RuleController";
import { useEditorShortcuts } from "@/lib/editor/keyboard/shortcuts";
import { useToolShortcuts } from "@/lib/editor/keyboard/useToolShortcuts";
import { useSelectedRuleShape } from "@/lib/editor/selection/useSelectedRuleShape";

import { PropertiesPaletteRuleKindType } from "@/lib/stores/ui-prefs-store";

interface Props {
  rule: Rule;
}

export function RuleEditor({ rule }: Props) {
  const [activeTool, setActiveTool] = useState<ToolId>(ToolIdType.Select);
  const controller = useMemo(() => createRuleController(), []);
  useEditorShortcuts({
    onUndo: () => controller.undo(),
    onRedo: () => controller.redo(),
    onSelectAll: () => controller.selectAll(),
    onDuplicateSelected: () => {
      controller.duplicateSelected();
    },
  });
  // Plan 100 step 37: route-scope tool hotkeys are now owned by
  // useToolShortcuts. Keeps this component composition-only.
  const selectTool = useCallback((t: ToolId) => setActiveTool(t), []);
  useToolShortcuts({ onSelect: selectTool });
  // Plan 84 Step 9 follow-up: prefer the live-selected shape's ROI kind
  // (C/R/K/S/E) over the coarse rule/category fallback so the docked
  // PropertiesPalette re-keys panes as canvas selection changes.
  const selectedShape = useSelectedRuleShape();
  const paletteKind: PropertiesPaletteRuleKindType =
    (selectedShape?.kind as unknown as PropertiesPaletteRuleKindType | undefined) ??
    (rule.isCategory ? PropertiesPaletteRuleKindType.Category : PropertiesPaletteRuleKindType.Rule);

  return (
    <div className="flex min-h-0 flex-1" data-testid="rule-editor">
      <ToolsPalette activeTool={activeTool} onChange={setActiveTool} />
      <div className="flex min-h-0 flex-1 flex-col">
        <RuleEditorToolbar />
        <div className="flex min-h-0 flex-1 flex-col gap-hmi-3 px-hmi-4 py-hmi-4">
          <RuleMetadataBar rule={rule} />
          <section
            aria-labelledby="rule-conditions-heading"
            className="rounded-sm border border-ca-border bg-ca-panel p-hmi-3"
          >
            <h2 id="rule-conditions-heading" className="text-hmi-h3 font-semibold">
              Conditions{" "}
              <span className="font-mono text-[13px] tabular-nums text-ca-ink-muted">
                ({rule.conditions.length})
              </span>
            </h2>
            <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
              Active tool: <span className="font-mono">{activeTool}</span>. ROI overlay and rotation
              handle land in Plan 79 steps 33 to 37.
            </p>
          </section>
        </div>
      </div>
      <div className="flex min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <PropertiesPalette ruleKind={paletteKind} />
        </div>
        <RuleChainSidebar rule={rule} />
        <LayersPalette rule={rule} />
      </div>
    </div>
  );
}
