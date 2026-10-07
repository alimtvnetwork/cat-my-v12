import React from "react";
import { WhiteBoxMarkingTool } from "../../WhiteBoxMarkingTool";
import type { PatternMatchingRuleProps } from "./pattern-matching/types";
import type { FormulatedPatternGeometry } from "../../white-box/types";

export function StandardGreyscalePatternMatchingTool(
  props: PatternMatchingRuleProps,
): React.JSX.Element {
  const handleApply = (pattern: FormulatedPatternGeometry): void => {
    props.onChange((prev) => ({
      ...prev,
      referenceBoxes: pattern.referenceBoxes,
      constellation: pattern.referenceBoxes,
      tolerancePx: pattern.tolerancePx,
      marginPx: pattern.marginPx,
      threshold: pattern.threshold ?? (prev as any)?.threshold,
    }));

    props.onOk?.();
  };

  return (
    <div className="h-full w-full min-h-0 flex-1 overflow-hidden">
      <WhiteBoxMarkingTool
        settings={props.settings}
        onSettingsChange={props.onChange}
        actionButtonLabel="Apply & Save Pattern"
        onApply={handleApply}
        onCancel={props.onCancel}
        imageRef={(props.settings as any)?.imageRef}
      />
    </div>
  );
}
