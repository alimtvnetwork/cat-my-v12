import React from "react";
import {
  PatternSearchSettings,
  ImageSourceType,
  RenderModeType,
} from "@/domain/vision/pattern-search";
import {
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize,
  MousePointer2,
  Scan,
  Grid,
  Layers,
  MapPin,
} from "lucide-react";

export interface StandardImageToolbarProps {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  viewModes: { regions: boolean; results: boolean; grid: boolean };
  setViewModes: React.Dispatch<
    React.SetStateAction<{ regions: boolean; results: boolean; grid: boolean }>
  >;
  onRefresh?: () => void;
}

export function StandardImageToolbar({
  settings,
  setSettings,
  viewModes,
  setViewModes,
  onRefresh,
}: StandardImageToolbarProps): React.JSX.Element | null {
  const handleZoom = (delta: number) => {
    setSettings((s) => ({
      ...s,
      view: { ...s.view, zoom: Math.max(10, Math.min(500, s.view.zoom + delta)) },
    }));
  };
  const handleFit = () => setSettings((s) => ({ ...s, view: { ...s.view, zoom: 100 } })); // TBD fit logic
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      return;
    }
    setSettings((s) => ({ ...s, view: { ...s.view, zoom: 100 } }));
  };

  return (
    <div className="flex items-center gap-4 bg-std-chrome p-2 border-b border-std-border text-sm shrink-0 min-w-0 overflow-x-auto select-none">
      <div className="flex items-center gap-2">
        <label className="font-semibold text-std-text">Source:</label>
        <select
          value={settings.view.source}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              view: { ...s.view, source: e.target.value as ImageSourceType },
            }))
          }
          className="bg-std-readout-bg border border-std-border rounded px-2 py-1 text-std-text"
        >
          {Object.values(ImageSourceType).map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="font-semibold text-std-text">Rendering:</label>
        <select
          value={settings.view.rendering}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              view: { ...s.view, rendering: e.target.value as RenderModeType },
            }))
          }
          className="bg-std-readout-bg border border-std-border rounded px-2 py-1 text-std-text"
        >
          {Object.values(RenderModeType).map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={handleRefresh}
        className="p-1 hover:bg-std-secondary-action rounded"
        title="Refresh"
      >
        <RefreshCw className="w-4 h-4 text-std-text" />
      </button>

      <div className="flex items-center gap-2 ml-auto">
        <select
          value={settings.view.zoom}
          onChange={(e) => {
            const val = e.target.value === "fit" ? 100 : Number(e.target.value);
            setSettings((s) => ({ ...s, view: { ...s.view, zoom: val } }));
          }}
          className="bg-transparent border-none text-std-text-muted cursor-pointer hover:text-std-text"
        >
          <option value={25}>25%</option>
          <option value={40}>40%</option>
          <option value={50}>50%</option>
          <option value={100}>100%</option>
          <option value={200}>200%</option>
          <option value="fit">Fit</option>
        </select>
        <button
          type="button"
          onClick={() => handleZoom(-10)}
          className="p-1 hover:bg-std-secondary-action rounded"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-std-text" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(10)}
          className="p-1 hover:bg-std-secondary-action rounded"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-std-text" />
        </button>
        <button
          type="button"
          onClick={handleFit}
          className="p-1 hover:bg-std-secondary-action rounded"
          title="Fit to View"
        >
          <Scan className="w-4 h-4 text-std-text" />
        </button>
      </div>

      <div className="flex items-center gap-1 border-l border-std-border pl-4">
        <button
          type="button"
          onClick={() => setViewModes((s) => ({ ...s, regions: !s.regions }))}
          className={`p-1 rounded ${viewModes.regions ? "bg-std-accent-active text-std-primary-action-text" : "hover:bg-std-secondary-action text-std-text"}`}
          title="Show/Hide Region Overlays"
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setViewModes((s) => ({ ...s, results: !s.results }))}
          className={`p-1 rounded ${viewModes.results ? "bg-std-accent-active text-std-primary-action-text" : "hover:bg-std-secondary-action text-std-text"}`}
          title="Show/Hide Result Graphics"
        >
          <MapPin className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setViewModes((s) => ({ ...s, grid: !s.grid }))}
          className={`p-1 rounded ${viewModes.grid ? "bg-std-accent-active text-std-primary-action-text" : "hover:bg-std-secondary-action text-std-text"}`}
          title="Show/Hide Grid"
        >
          <Grid className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
