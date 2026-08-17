import React, { useState } from "react";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import { PatternShapes } from "@/domain/vision/pattern-search";
import { ShapeType } from "@/domain/vision/shapes";

export function PatternRegionTab({
  settings,
  setSettings,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
}): React.JSX.Element | null {
  const [isEditingRegion, setIsEditingRegion] = useState(true);

  return (
    <div className="flex flex-col text-ca-ink">
      {isEditingRegion ? (
        <div className="flex flex-col p-2 gap-4">
          <div className="flex flex-col gap-2 bg-ca-panel p-2 border border-ca-border">
            <h3 className="font-semibold text-sm border-b border-ca-border pb-1">Edit Pattern Region</h3>
            <div className="flex items-center justify-between gap-2 text-sm mt-1">
              <label>Shape</label>
              <select
                value={settings.patternRegion.shape}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    patternRegion: { ...s.patternRegion, shape: e.target.value as ShapeType },
                  }))
                }
                className="w-32 bg-ca-bg border border-ca-border rounded px-2 py-1"
              >
                {PatternShapes.map((shape) => (
                  <option key={shape.id} value={shape.id}>
                    {shape.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs mt-2">
              <div className="flex flex-col">
                <label>X</label>
                <input
                  type="number"
                  value={Math.round(settings.patternRegion.geometry.x || 0)}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      patternRegion: {
                        ...s.patternRegion,
                        geometry: { ...s.patternRegion.geometry, x: Number(e.target.value) },
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
                  value={Math.round(settings.patternRegion.geometry.y || 0)}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      patternRegion: {
                        ...s.patternRegion,
                        geometry: { ...s.patternRegion.geometry, y: Number(e.target.value) },
                      },
                    }))
                  }
                  className="bg-ca-bg border border-ca-border rounded px-1 py-1"
                />
              </div>
              {settings.patternRegion.shape !== ShapeType.Circle && (
                <>
                  <div className="flex flex-col">
                    <label>W</label>
                    <input
                      type="number"
                      value={Math.round(settings.patternRegion.geometry.width || 0)}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          patternRegion: {
                            ...s.patternRegion,
                            geometry: { ...s.patternRegion.geometry, width: Number(e.target.value) },
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
                      value={Math.round(settings.patternRegion.geometry.height || 0)}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          patternRegion: {
                            ...s.patternRegion,
                            geometry: { ...s.patternRegion.geometry, height: Number(e.target.value) },
                          },
                        }))
                      }
                      className="bg-ca-bg border border-ca-border rounded px-1 py-1"
                    />
                  </div>
                </>
              )}
              {settings.patternRegion.shape === ShapeType.Circle && (
                <div className="flex flex-col">
                  <label>R</label>
                  <input
                    type="number"
                    value={Math.round(settings.patternRegion.geometry.radius || 0)}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        patternRegion: {
                          ...s.patternRegion,
                          geometry: { ...s.patternRegion.geometry, radius: Number(e.target.value) },
                        },
                      }))
                    }
                    className="bg-ca-bg border border-ca-border rounded px-1 py-1"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <label>Reference Image</label>
              <div className="w-32 bg-ca-bg border border-ca-border rounded px-2 py-1 font-mono text-xs flex items-center justify-between">
                {settings.referenceImage.set} - {settings.referenceImage.index.toString().padStart(3, "0")}
                <span className="text-ca-ink-muted">▼</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button className="px-4 py-1.5 bg-gray-200 border border-gray-300 rounded text-sm hover:bg-gray-300 shadow-sm" onClick={() => setIsEditingRegion(false)}>
              Cancel
            </button>
            <button className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 shadow-sm" onClick={() => setIsEditingRegion(false)}>
              OK
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center justify-between bg-ca-panel-2 px-2 py-1 border-b border-ca-border">
            <h3 className="font-semibold text-sm">Detection Conditions</h3>
            <button className="text-ca-ink-muted hover:text-ca-ink px-1 border border-ca-border bg-ca-panel rounded text-xs leading-none h-5 shadow-sm">&gt;&gt;</button>
          </div>

          <div className="flex flex-col gap-4 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Angle Range</span>
              <div className="flex items-center gap-1">
                <span className="text-ca-ink-muted">+/-</span>
                <input 
                  type="number" 
                  value={settings.detection.angleRangeDeg} 
                  onChange={(e) => setSettings(s => ({ ...s, detection: { ...s.detection, angleRangeDeg: Number(e.target.value) } }))}
                  className="w-16 bg-ca-bg border border-ca-border px-2 py-1 rounded text-right font-mono"
                  min={0}
                  max={180}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span>Detection Count</span>
              <input 
                type="number" 
                value={settings.detection.detectionCount} 
                onChange={(e) => setSettings(s => ({ ...s, detection: { ...s.detection, detectionCount: Number(e.target.value) } }))}
                className="w-16 bg-ca-bg border border-ca-border px-2 py-1 rounded text-right font-mono"
                min={1}
              />
            </div>

            {/* Search Sensitivity */}
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex justify-between items-center">
                <span>Search Sensitivity</span>
                <span className="text-xs">{settings.detection.searchSensitivity === 50 ? "Normal" : settings.detection.searchSensitivity}</span>
              </div>
              <div className="relative pt-2 pb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.detection.searchSensitivity}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      detection: { ...s.detection, searchSensitivity: Number(e.target.value) },
                    }))
                  }
                  className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: "#3b82f6"
                  }}
                />
                <div className="absolute w-full flex justify-between px-2 -bottom-1 pointer-events-none">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-px h-1.5 bg-gray-400"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex justify-between items-center">
                <span>Accuracy</span>
                <span className="text-xs">{settings.detection.accuracy === 50 ? "Normal" : settings.detection.accuracy}</span>
              </div>
              <div className="relative pt-2 pb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.detection.accuracy}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      detection: { ...s.detection, accuracy: Number(e.target.value) },
                    }))
                  }
                  className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: "#3b82f6"
                  }}
                />
                <div className="absolute w-full flex justify-between px-2 -bottom-1 pointer-events-none">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-px h-1.5 bg-gray-400"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Min. Match % */}
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center justify-between">
                <span>Min. Match %</span>
                <input 
                  type="number" 
                  value={settings.detection.minMatchPercent} 
                  onChange={(e) => setSettings(s => ({ ...s, detection: { ...s.detection, minMatchPercent: Number(e.target.value) } }))}
                  className="w-16 bg-ca-bg border border-ca-border px-2 py-1 rounded text-right font-mono text-sm"
                  min={0}
                  max={100}
                />
              </div>
              <div className="relative pt-2 pb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.detection.minMatchPercent}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      detection: { ...s.detection, minMatchPercent: Number(e.target.value) },
                    }))
                  }
                  className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: "#3b82f6"
                  }}
                />
                <div className="absolute w-full flex justify-between px-2 -bottom-1 pointer-events-none">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-px h-1.5 bg-gray-400"></div>
                  ))}
                </div>
              </div>
            </div>
            
          </div>
          
          <div className="flex justify-end p-2 border-t border-ca-border">
            <button className="px-4 py-1.5 bg-gray-200 border border-gray-300 rounded text-sm hover:bg-gray-300 shadow-sm" onClick={() => setIsEditingRegion(true)}>
              Edit Pattern Region
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
