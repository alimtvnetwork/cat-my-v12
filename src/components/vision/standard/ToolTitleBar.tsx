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
    <div className="flex flex-col bg-ca-bg">
      {/* Dark navy strip */}
      <div className="flex items-center gap-2 p-1.5 bg-[#001f3f] text-white">
        <span className="font-mono font-bold text-sm ml-1">{settings.id}</span>
        <input 
          type="text" 
          className="bg-transparent border border-white/30 text-white px-2 py-0.5 rounded text-sm w-48 focus:outline-none focus:border-white"
          value={settings.name}
          onChange={(e) => setSettings(s => ({ ...s, name: e.target.value }))}
        />
      </div>
      {/* Breadcrumb row */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-ca-panel-2 border-b border-ca-border text-xs">
        <Search size={14} className="text-ca-ink" />
        <span className="font-semibold text-ca-ink">{settings.name}</span>
        <span className="text-ca-ink-muted">&gt;</span>
        <span className="text-ca-ink">{activeTab}</span>
      </div>
      {/* Reference Image row */}
      <div className="flex justify-end items-center px-2 py-1.5 bg-ca-panel text-xs border-b border-ca-border">
        <div className="flex items-center gap-2">
          <span className="text-ca-ink font-semibold">Reference Image</span>
          <div className="bg-ca-bg border border-ca-border px-2 py-1 rounded text-ca-ink font-mono flex items-center gap-2 cursor-pointer hover:border-ca-ink">
            <span>{settings.referenceImage.set} - {settings.referenceImage.index.toString().padStart(3, "0")}</span>
            <span className="text-[10px]">▼</span>
          </div>
        </div>
      </div>
    </div>
  );
}
