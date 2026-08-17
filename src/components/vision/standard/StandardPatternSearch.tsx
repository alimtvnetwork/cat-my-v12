import React from "react";
import { StandardHeaderReadouts } from "./StandardHeaderReadouts";
import { StandardImageToolbar } from "./StandardImageToolbar";
import { StandardCanvas } from "./StandardCanvas";
import { StandardToolPanel } from "./StandardToolPanel";
import { StandardActionBar } from "./StandardActionBar";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export function StandardPatternSearch({
  settings,
  onChange,
  onEvaluate,
}: {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
}) {
  const [viewModes, setViewModes] = React.useState({ regions: true, results: true, grid: false });

  return (
    <div className="flex flex-col h-full bg-std-chrome overflow-x-auto text-std-text font-sans">
      <div className="flex flex-col min-w-[1024px] min-h-[768px] h-full relative">
        <div className="flex flex-1 min-h-0">
          <div className="w-[62%] flex flex-col relative bg-std-chrome">
            <div className="absolute top-2 left-2 z-10">
              <StandardHeaderReadouts />
            </div>
            <StandardImageToolbar settings={settings} setSettings={onChange} viewModes={viewModes} setViewModes={setViewModes} />
            <StandardCanvas settings={settings} setSettings={onChange} viewModes={viewModes} />
          </div>
          <div className="w-[38%] border-l border-std-accent-active flex flex-col bg-std-panel text-black relative z-20">
            <StandardToolPanel settings={settings} setSettings={onChange} />
          </div>
        </div>
        <StandardActionBar onEvaluate={onEvaluate} />
      </div>
    </div>
  );
}
