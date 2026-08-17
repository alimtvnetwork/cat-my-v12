import React from "react";
import { PatternSearchSettings, ImageSourceType, RenderModeType } from "@/domain/vision/pattern-search";
import { RefreshCw, ZoomIn, ZoomOut, Maximize, MousePointer2, Scan, Grid, Layers, MapPin } from "lucide-react";

export function StandardImageToolbar({
  settings,
  setSettings,
  viewModes,
  setViewModes,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  viewModes: { regions: boolean; results: boolean; grid: boolean };
  setViewModes: React.Dispatch<React.SetStateAction<{ regions: boolean; results: boolean; grid: boolean }>>;
}): React.JSX.Element | null {
  const handleZoom = (delta: number) => {
    setSettings((s) => ({
      ...s,
      view: { ...s.view, zoom: Math.max(10, Math.min(500, s.view.zoom + delta)) },
    }));
  };
  const handleFit = () => setSettings((s) => ({ ...s, view: { ...s.view, zoom: 100 } })); // TBD fit logic

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
        <select 
          value={settings.view.zoom}
          onChange={(e) => {
            const val = e.target.value === "fit" ? 100 : Number(e.target.value);
            setSettings((s) => ({ ...s, view: { ...s.view, zoom: val } }));
          }}
          className="bg-transparent border-none text-ca-ink-muted cursor-pointer hover:text-ca-ink"
        >
          <option value={25}>25%</option>
          <option value={40}>40%</option>
          <option value={50}>50%</option>
          <option value={100}>100%</option>
          <option value={200}>200%</option>
          <option value="fit">Fit</option>
        </select>
        <button onClick={() => handleZoom(-10)} className="p-1 hover:bg-ca-border rounded" title="Zoom Out">
          <ZoomOut className="w-4 h-4 text-ca-ink" />
        </button>
        <button onClick={() => handleZoom(10)} className="p-1 hover:bg-ca-border rounded" title="Zoom In">
          <ZoomIn className="w-4 h-4 text-ca-ink" />
        </button>
        <button onClick={handleFit} className="p-1 hover:bg-ca-border rounded" title="Fit to View">
          <Scan className="w-4 h-4 text-ca-ink" />
        </button>
      </div>

      <div className="flex items-center gap-1 border-l border-ca-border pl-4">
        <button 
          onClick={() => setViewModes(s => ({ ...s, regions: !s.regions }))}
          className={`p-1 rounded ${viewModes.regions ? 'bg-ca-select/20 text-ca-select' : 'hover:bg-ca-border text-ca-ink'}`} 
          title="Show/Hide Region Overlays"
        >
          <Layers className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setViewModes(s => ({ ...s, results: !s.results }))}
          className={`p-1 rounded ${viewModes.results ? 'bg-ca-select/20 text-ca-select' : 'hover:bg-ca-border text-ca-ink'}`} 
          title="Show/Hide Result Graphics"
        >
          <MapPin className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setViewModes(s => ({ ...s, grid: !s.grid }))}
          className={`p-1 rounded ${viewModes.grid ? 'bg-ca-select/20 text-ca-select' : 'hover:bg-ca-border text-ca-ink'}`} 
          title="Show/Hide Grid"
        >
          <Grid className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
