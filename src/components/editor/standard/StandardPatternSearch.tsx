import React, { useState } from "react";
import { StandardHeaderReadouts } from "./StandardHeaderReadouts";
import { StandardImageToolbar } from "./StandardImageToolbar";
import { StandardCanvas } from "./StandardCanvas";
import { StandardToolPanel } from "./StandardToolPanel";
import { StandardActionBar } from "./StandardActionBar";
import {
  createDefaultPatternSearchSettings,
  PatternSearchSettings,
} from "@/domain/vision/settings";

export function StandardPatternSearch() {
  const [settings, setSettings] = useState<PatternSearchSettings>(() =>
    createDefaultPatternSearchSettings("T106"),
  );

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-ca-bg">
      <div className="flex flex-1 min-h-0 relative">
        <div className="flex flex-col flex-1 relative">
          <div className="absolute top-2 left-2 z-10">
            <StandardHeaderReadouts />
          </div>
          <StandardImageToolbar settings={settings} setSettings={setSettings} />
          <StandardCanvas settings={settings} setSettings={setSettings} />
        </div>
        <div className="w-96 border-l border-ca-border flex flex-col bg-ca-panel relative z-20">
          <StandardToolPanel settings={settings} setSettings={setSettings} />
        </div>
      </div>
      <StandardActionBar />
    </div>
  );
}
