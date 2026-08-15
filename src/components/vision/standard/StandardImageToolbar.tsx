import React from "react";
import { PatternSearchSettings, ImageSourceType, RenderModeType } from "@/domain/vision/pattern-search";
import { RefreshCw, ZoomIn, ZoomOut, Maximize, MousePointer2 } from "lucide-react";

export function StandardImageToolbar({
  settings,
  setSettings,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
}) {
  return (
    <div className="flex items-center gap-4 bg-ca-panel-2 p-2 border-b border-ca-border text-sm">
      <div className="flex items-center gap-2">
        <label className="font-semibold text-ca-ink">Source:</label>
        <select
          value={settings.view.source}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              view: { ...s.view, source: e.target.value as ImageSourceType },
            }))
          }
          className="bg-ca-panel border border-ca-border rounded px-2 py-1 text-ca-ink"
        >
          {Object.values(ImageSourceType).map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="font-semibold text-ca-ink">Rendering:</label>
        <select
          value={settings.view.rendering}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              view: { ...s.view, rendering: e.target.value as RenderModeType },
            }))
          }
          className="bg-ca-panel border border-ca-border rounded px-2 py-1 text-ca-ink"
        >
          {Object.values(RenderModeType).map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      <button className="p-1 hover:bg-ca-border rounded" title="Refresh">
        <RefreshCw className="w-4 h-4 text-ca-ink" />
      </button>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-ca-ink-muted">Zoom {settings.view.zoom}%</span>
        <button className="p-1 hover:bg-ca-border rounded">
          <ZoomOut className="w-4 h-4 text-ca-ink" />
        </button>
        <button className="p-1 hover:bg-ca-border rounded">
          <ZoomIn className="w-4 h-4 text-ca-ink" />
        </button>
      </div>

      {/* Placeholder for 3 view-mode icons */}
      <div className="flex items-center gap-1 border-l border-ca-border pl-4">
        <button className="p-1 bg-ca-select/20 text-ca-select rounded" title="Mode 1 (TBD)">
          <MousePointer2 className="w-4 h-4" />
        </button>
        <button className="p-1 hover:bg-ca-border rounded text-ca-ink" title="Mode 2 (TBD)">
          <Maximize className="w-4 h-4" />
        </button>
        <button className="p-1 hover:bg-ca-border rounded text-ca-ink" title="Mode 3 (TBD)">
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
