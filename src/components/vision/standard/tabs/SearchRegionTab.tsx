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
}): React.JSX.Element | null {
  return (
    <div className="flex flex-col h-full text-ca-ink">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="flex flex-col">
          <div className="flex items-center justify-between bg-ca-panel-2 px-2 py-1 border-b border-ca-border">
            <h3 className="font-semibold text-sm">Search Region</h3>
            <button className="text-ca-ink-muted hover:text-ca-ink px-1 border border-ca-border bg-ca-panel rounded text-xs leading-none h-5 shadow-sm">
              &gt;&gt;
            </button>
          </div>
          <div className="flex items-center justify-between p-3 text-sm">
            <span>Search Region</span>
            <select
              value={settings.searchRegion.shape}
              onChange={(e) => {
                const newShapeType = e.target.value as ShapeType;
                const newShape =
                  PatternShapes.find((m) => m.id === newShapeType) || PatternShapes[0];
                setSettings((s) => ({
                  ...s,
                  searchRegion: {
                    ...s.searchRegion,
                    shape: newShapeType,
                    geometry:
                      newShapeType !== s.searchRegion.shape
                        ? newShape.defaultGeometry
                        : s.searchRegion.geometry,
                  },
                }));
              }}
              className="w-32 bg-ca-bg border border-ca-border rounded px-2 py-1"
            >
              {PatternShapes.map((shape) => (
                <option key={shape.id} value={shape.id}>
                  {shape.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs px-3 pb-3">
            <div className="flex flex-col">
              <label>X</label>
              <input
                type="number"
                value={Math.round(settings.searchRegion.geometry.x || 0)}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    searchRegion: {
                      ...s.searchRegion,
                      geometry: { ...s.searchRegion.geometry, x: Number(e.target.value) },
                    },
                  }))
                }
                className="bg-ca-bg border border-ca-border rounded px-1 py-1"
              />
            </div>
            <div className="flex flex-col">
              <label>Y</label>
              <input
                type="number"
                value={Math.round(settings.searchRegion.geometry.y || 0)}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    searchRegion: {
                      ...s.searchRegion,
                      geometry: { ...s.searchRegion.geometry, y: Number(e.target.value) },
                    },
                  }))
                }
                className="bg-ca-bg border border-ca-border rounded px-1 py-1"
              />
            </div>
            {settings.searchRegion.shape !== ShapeType.Circle && (
              <>
                <div className="flex flex-col">
                  <label>W</label>
                  <input
                    type="number"
                    value={Math.round(settings.searchRegion.geometry.width || 0)}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        searchRegion: {
                          ...s.searchRegion,
                          geometry: { ...s.searchRegion.geometry, width: Number(e.target.value) },
                        },
                      }))
                    }
                    className="bg-ca-bg border border-ca-border rounded px-1 py-1"
                  />
                </div>
                <div className="flex flex-col">
                  <label>H</label>
                  <input
                    type="number"
                    value={Math.round(settings.searchRegion.geometry.height || 0)}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        searchRegion: {
                          ...s.searchRegion,
                          geometry: { ...s.searchRegion.geometry, height: Number(e.target.value) },
                        },
                      }))
                    }
                    className="bg-ca-bg border border-ca-border rounded px-1 py-1"
                  />
                </div>
              </>
            )}
            {settings.searchRegion.shape === ShapeType.Circle && (
              <div className="flex flex-col">
                <label>R</label>
                <input
                  type="number"
                  value={Math.round(settings.searchRegion.geometry.radius || 0)}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      searchRegion: {
                        ...s.searchRegion,
                        geometry: { ...s.searchRegion.geometry, radius: Number(e.target.value) },
                      },
                    }))
                  }
                  className="bg-ca-bg border border-ca-border rounded px-1 py-1"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center bg-ca-panel-2 px-2 py-1 border-y border-ca-border">
            <h3 className="font-semibold text-sm">Mask Region</h3>
          </div>
          <div className="flex flex-col gap-2 p-3 text-sm">
            {settings.masks.length > 4 && (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                Additional mask layers exist in Modern UI and are still applied.
              </div>
            )}
            {[0, 1, 2, 3].map((i) => {
              const mask = settings.masks[i] || { shape: ShapeType.None, geometry: {} };
              return (
                <div key={`mask-${i}`} className="flex items-center justify-between">
                  <span>Mask Region {i}</span>
                  <select
                    value={mask.shape}
                    onChange={(e) =>
                      setSettings((s) => {
                        const masks = [...s.masks];
                        while (masks.length <= i) {
                          masks.push({ shape: ShapeType.None, geometry: {} as any });
                        }
                        const newShapeType = e.target.value as ShapeType;
                        const newShape =
                          MaskShapes.find((m) => m.id === newShapeType) || MaskShapes[0];
                        masks[i] = {
                          ...masks[i],
                          shape: newShapeType,
                          geometry:
                            newShapeType !== masks[i].shape
                              ? newShape.defaultGeometry
                              : masks[i].geometry,
                        };
                        return { ...s, masks };
                      })
                    }
                    className="w-32 bg-ca-bg border border-ca-border rounded px-2 py-1"
                  >
                    {MaskShapes.map((shape) => (
                      <option key={shape.id} value={shape.id}>
                        {shape.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col border-t border-ca-border">
          <div className="flex items-center bg-ca-panel-2 px-2 py-1 border-b border-ca-border">
            <h3 className="font-semibold text-sm">Image Region</h3>
          </div>
          <div className="flex flex-col gap-3 p-3 text-sm">
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
                className="rounded bg-ca-bg border-ca-border"
              />
              Use Image Region
            </label>
            <div className="flex items-center justify-between">
              <span className={!settings.imageRegion.enabled ? "text-ca-ink-muted" : ""}>
                Reference Tool
              </span>
              <select
                value={settings.imageRegion.referenceTool ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    imageRegion: { ...s.imageRegion, referenceTool: e.target.value || null },
                  }))
                }
                className="w-32 bg-ca-bg border border-ca-border rounded px-2 py-1"
                disabled={!settings.imageRegion.enabled}
              >
                <option value="">None</option>
                <option value="T100">T100 Edge</option>
                <option value="T101">T101 Color</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className={!settings.imageRegion.enabled ? "text-ca-ink-muted" : ""}>
                Detection Color
              </span>
              <div className="flex items-center gap-3">
                <label
                  className={`flex items-center gap-1 ${!settings.imageRegion.enabled ? "text-ca-ink-muted" : ""}`}
                >
                  <input
                    type="radio"
                    name="detectionColor"
                    value={DetectionColorType.White}
                    checked={settings.imageRegion.detectionColor === DetectionColorType.White}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        imageRegion: {
                          ...s.imageRegion,
                          detectionColor: e.target.value as DetectionColorType,
                        },
                      }))
                    }
                    disabled={!settings.imageRegion.enabled}
                  />
                  White
                </label>
                <label
                  className={`flex items-center gap-1 ${!settings.imageRegion.enabled ? "text-ca-ink-muted" : ""}`}
                >
                  <input
                    type="radio"
                    name="detectionColor"
                    value={DetectionColorType.Black}
                    checked={settings.imageRegion.detectionColor === DetectionColorType.Black}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        imageRegion: {
                          ...s.imageRegion,
                          detectionColor: e.target.value as DetectionColorType,
                        },
                      }))
                    }
                    disabled={!settings.imageRegion.enabled}
                  />
                  Black
                </label>
              </div>
            </div>
            <div className="flex justify-end mt-1">
              <button
                className="px-4 py-1.5 bg-gray-200 border border-gray-300 rounded text-sm hover:bg-gray-300 shadow-sm disabled:opacity-50"
                disabled={!settings.imageRegion.enabled}
              >
                Preview
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 p-2 border-t border-ca-border bg-ca-panel shrink-0">
        <button className="px-4 py-1.5 bg-gray-200 border border-gray-300 rounded text-sm hover:bg-gray-300 shadow-sm">
          Cancel
        </button>
        <button className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 shadow-sm">
          OK
        </button>
      </div>
    </div>
  );
}
