import React, { useState } from "react";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import { PatternRegionTab } from "./tabs/PatternRegionTab";
import { SearchRegionTab } from "./tabs/SearchRegionTab";
import { PlaceholderTabs } from "./tabs/PlaceholderTabs";
import { ToolTitleBar } from "./ToolTitleBar";
import { ToolTabs } from "./ToolTabs";

export function StandardToolPanel({
  settings,
  setSettings,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
}): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState("Pattern Region");

  return (
    <div className="flex flex-col flex-1 h-full bg-ca-panel">
      <ToolTitleBar settings={settings} setSettings={setSettings} activeTab={activeTab} />
      <ToolTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 overflow-y-auto">
        {activeTab === "Pattern Region" && (
          <PatternRegionTab settings={settings} setSettings={setSettings} />
        )}
        {activeTab === "Search Region" && (
          <SearchRegionTab settings={settings} setSettings={setSettings} />
        )}
        {(activeTab === "Extract Colors" || activeTab === "Image Enhance") && (
          <PlaceholderTabs name={activeTab} />
        )}
      </div>
    </div>
  );
}
