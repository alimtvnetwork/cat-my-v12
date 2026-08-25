import React from "react";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import { Search } from "lucide-react";

export function ToolTitleBar({
  settings,
  setSettings,
  activeTab,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  activeTab: string;
}): React.JSX.Element | null {
  return (
    <div className="flex flex-col bg-std-chrome">
      {/* Dark navy strip */}
      <div className="flex items-center gap-2 p-1.5 bg-std-panel-header text-std-text">
        <span className="font-mono font-bold text-sm ml-1">{settings.id}</span>
        <input
          type="text"
          className="bg-transparent border border-std-border-dark text-std-text px-2 py-0.5 rounded text-sm w-48 focus:outline-none focus:border-std-text"
          value={settings.name}
          onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
        />
      </div>
      {/* Breadcrumb row */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-std-chrome border-b border-std-border text-xs">
        <Search size={14} className="text-std-text" />
        <span className="font-semibold text-std-text">{settings.name}</span>
        <span className="text-std-text-muted">&gt;</span>
        <span className="text-std-text">{activeTab}</span>
      </div>
      {/* Reference Image row */}
      <div className="flex justify-end items-center px-2 py-1.5 bg-std-panel text-xs border-b border-std-border">
        <div className="flex items-center gap-2">
          <span className="text-std-text font-semibold">Reference Image</span>
          <div className="bg-std-chrome border border-std-border px-2 py-1 rounded text-std-text font-mono flex items-center gap-2 cursor-pointer hover:border-std-text">
            <span>
              {settings.referenceImage.set} -{" "}
              {settings.referenceImage.index.toString().padStart(3, "0")}
            </span>
            <span className="text-[10px]">▼</span>
          </div>
        </div>
      </div>
    </div>
  );
}
