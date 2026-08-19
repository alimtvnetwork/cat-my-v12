import * as React from "react";
import { BlackWhiteToggle } from "./BlackWhiteToggle";
import { GrayscaleToleranceSlider } from "./GrayscaleToleranceSlider";

export interface RuleEditorPanelProps {
  ruleId: string;
  searchTarget?: "black" | "white";
  onSearchTargetChange?: (value: "black" | "white") => void;
  tolerance?: number;
  onToleranceChange?: (value: number) => void;
}

export function RuleEditorPanel({
  ruleId,
  searchTarget = "black",
  onSearchTargetChange,
  tolerance = 128,
  onToleranceChange,
}: RuleEditorPanelProps) {
  return (
    <div 
      className="flex w-full max-w-sm flex-col gap-6 border-l bg-background p-4 shadow-sm"
      role="region"
      aria-labelledby="rule-editor-title"
    >
      <div className="flex flex-col gap-1 border-b pb-4">
        <h3 id="rule-editor-title" className="text-sm font-semibold tracking-tight">Rule Parameters</h3>
        <p className="text-xs text-muted-foreground">Editing rule {ruleId}</p>
      </div>

      <div className="flex flex-col gap-6">
        <BlackWhiteToggle
          value={searchTarget}
          onChange={(v) => onSearchTargetChange?.(v)}
        />
        <GrayscaleToleranceSlider
          value={tolerance}
          onChange={(v) => onToleranceChange?.(v)}
        />
      </div>
    </div>
  );
}
