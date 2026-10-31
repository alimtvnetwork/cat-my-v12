import React from "react";
import { ShapeType } from "@/domain/vision/shapes";
import { WhiteBoxMarkingTool } from "../../WhiteBoxMarkingTool";
import type { PatternMatchingRuleProps } from "./pattern-matching/types";
import type { FormulatedPatternGeometry } from "../../white-box/types";

export function StandardGreyscalePatternMatchingTool(
  props: PatternMatchingRuleProps,
): React.JSX.Element {
  // Apply = rule creation. Writes TEACH params only: the taught
  // reference boxes (absolute teach-image pixels, kept for legacy
  // rules), the same boxes as constellationJson, and the pattern /
  // search regions. Boxes carry expectedLuma when the marking step
  // taught one; no luma is invented here for boxes that have none.
  // Portability: referenceBoxesRelativeToPatternRegion stores every
  // box relative to the pattern region origin (px offsets, same sizes),
  // so the analyzer can prefer the relative form over the absolute
  // boxes when the device sits elsewhere in the analysis image. No
  // preview score or verdict is written: the analyzer re-matches the
  // taught constellation on every analysis image.
  const handleApply = (pattern: FormulatedPatternGeometry): void => {
    const patternRegion = pattern.patternRegion;
    const referenceBoxesRelativeToPatternRegion = pattern.referenceBoxes.map((box) => ({
      ...box,
      x: box.x - patternRegion.x,
      y: box.y - patternRegion.y,
    }));

    const patternPayload = {
      referenceBoxes: pattern.referenceBoxes,
      referenceBoxesJson: JSON.stringify(pattern.referenceBoxes),
      constellation: pattern.referenceBoxes,
      constellationJson: JSON.stringify(pattern.referenceBoxes),
      patternBoxes: pattern.referenceBoxes,
      patternBoxesJson: JSON.stringify(pattern.referenceBoxes),
      referenceBoxesRelativeToPatternRegion,
      referenceBoxesRelativeToPatternRegionJson: JSON.stringify(
        referenceBoxesRelativeToPatternRegion,
      ),
      patternRegion: { shape: ShapeType.Rectangle, geometry: patternRegion },
      patternRegionJson: JSON.stringify(patternRegion),
      searchRegion: { shape: ShapeType.Rectangle, geometry: pattern.searchRegion },
      searchRegionJson: JSON.stringify(pattern.searchRegion),
      tolerancePx: pattern.tolerancePx,
      marginPx: pattern.marginPx,
      threshold: pattern.threshold ?? (props.settings as any)?.threshold,
      greyscaleLevel: pattern.threshold ?? (props.settings as any)?.threshold,
      activeBoxCount: pattern.activeBoxCount,
      totalBoxCount: pattern.totalBoxCount,
    };

    props.onChange((prev) => ({
      ...prev,
      ...patternPayload,
      referenceBoxes: pattern.referenceBoxes,
      constellation: pattern.referenceBoxes,
      patternBoxes: pattern.referenceBoxes,
      params: {
        ...((prev as any)?.params ?? {}),
        ...patternPayload,
      },
    }));

    (props.onOk as any)?.(patternPayload);
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
