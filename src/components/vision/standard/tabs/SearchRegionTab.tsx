import React from "react";
import { PatternSearchSettings, DetectionColorType } from "@/domain/vision/pattern-search";
import { PatternShapes, MaskShapes } from "@/domain/vision/pattern-search";
import { ShapeType } from "@/domain/vision/shapes";

export function SearchRegionTab({
  settings,
  setSettings,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 text-ca-ink">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold border-b border-ca-border pb-1 flex justify-between">
          <span>Search Region</span>
          <button className="text-ca-select">&gt;&gt;</button>
        </h3>
        <div className="flex items-center gap-2 mt-2">
          <label className="text-sm">Shape:</label>
          <select
            value={settings.searchRegion.shape}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                searchRegion: { ...s.searchRegion, shape: e.target.value as ShapeType },
              }))
            }
            className="flex-1 bg-ca-panel-2 border border-ca-border rounded p-1"
          >
            {PatternShapes.map((shape) => (
              <option key={shape.id} value={shape.id}>
                {shape.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold border-b border-ca-border pb-1">Mask Layers</h3>
        <div className="flex flex-col gap-2 mt-2">
          {settings.masks.map((mask, i) => (
            <div key={`mask-${i}`} className="flex items-center gap-2 text-sm">
              <label>Mask {i + 1}:</label>
              <select
                value={mask.shape}
                onChange={(e) =>
                  setSettings((s) => {
                    const masks = [...s.masks];
                    masks[i] = { ...masks[i], shape: e.target.value as ShapeType };
                    return { ...s, masks };
                  })
                }
                className="flex-1 bg-ca-panel-2 border border-ca-border rounded p-1"
              >
                {MaskShapes.map((shape) => (
                  <option key={shape.id} value={shape.id}>
                    {shape.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold border-b border-ca-border pb-1">Image Region</h3>
        <div className="flex flex-col gap-3 mt-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.imageRegion.enabled}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  imageRegion: { ...s.imageRegion, enabled: e.target.checked },
                }))
              }
              className="rounded bg-ca-panel-2 border-ca-border"
            />
            Use Image Region
          </label>
          <div className="flex items-center gap-2">
            <label>Reference Tool:</label>
            <select
              value={settings.imageRegion.referenceTool ?? ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  imageRegion: { ...s.imageRegion, referenceTool: e.target.value || null },
                }))
              }
              className="flex-1 bg-ca-panel-2 border border-ca-border rounded p-1"
              disabled={!settings.imageRegion.enabled}
            >
              <option value="">None</option>
              <option value="T100">T100 Edge</option>
              <option value="T101">T101 Color</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label>Detection Color:</label>
            <select
              value={settings.imageRegion.detectionColor}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  imageRegion: {
                    ...s.imageRegion,
                    detectionColor: e.target.value as DetectionColorType,
                  },
                }))
              }
              className="flex-1 bg-ca-panel-2 border border-ca-border rounded p-1"
              disabled={!settings.imageRegion.enabled}
            >
              {Object.values(DetectionColorType).map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
