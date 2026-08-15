import React from "react";
import { EditorSetupExperience } from "@/components/editor";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export function ModernPatternSearch({
  settings,
  onChange,
}: {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
}) {
  return <EditorSetupExperience />;
}
