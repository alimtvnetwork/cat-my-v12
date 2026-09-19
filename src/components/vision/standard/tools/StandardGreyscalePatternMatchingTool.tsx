import React from "react";
import { WhiteBoxMarkingTool } from "@/components/vision/WhiteBoxMarkingTool";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardGreyscalePatternMatchingToolProps {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
}

export function StandardGreyscalePatternMatchingTool(
  _props: StandardGreyscalePatternMatchingToolProps,
): React.JSX.Element {
  return <WhiteBoxMarkingTool />;
}
