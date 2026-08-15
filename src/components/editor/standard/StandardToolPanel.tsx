import React, { useState } from "react";
import { PatternSearchSettings } from "@/domain/vision/settings";
import { PatternRegionTab } from "./tabs/PatternRegionTab";
import { SearchRegionTab } from "./tabs/SearchRegionTab";
import { PlaceholderTabs } from "./tabs/PlaceholderTabs";

export function StandardToolPanel({
  settings,
  setSettings,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
}) {
  const [activeTab, setActiveTab] = useState("Search Region");

  const tabs = ["Search Region", "Pattern Region", "Extract Colors", "Image Enhance"];

  return (
    <div className="flex flex-col flex-1 h-full">
      <div className="p-3 border-b border-ca-border flex items-center justify-between bg-ca-panel-2">
        <h2 className="font-bold text-ca-ink text-sm">
          {settings.id} {settings.name}
        </h2>
        <div className="text-xs text-ca-ink-muted bg-ca-panel px-2 py-1 rounded border border-ca-border">
          Reference Image {settings.referenceImage.set} -{" "}
          {settings.referenceImage.index.toString().padStart(3, "0")}
        </div>
      </div>

      <div className="flex border-b border-ca-border text-xs bg-ca-bg">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-1 text-center truncate ${
              activeTab === tab
                ? "bg-ca-panel text-ca-select font-semibold border-b-2 border-ca-select"
                : "text-ca-ink hover:bg-ca-panel-2"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

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
