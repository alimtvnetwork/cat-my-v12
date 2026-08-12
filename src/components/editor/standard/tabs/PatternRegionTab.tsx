import React from "react";
import { PatternSearchSettings } from "@/domain/vision/settings";
import { PatternShapes, ShapeType } from "@/domain/vision/shapes";

export function PatternRegionTab({
  settings,
  setSettings,
}: {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
}) {
  return (
    <div className="flex flex-col gap-4 p-4 text-ca-ink">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold border-b border-ca-border pb-1">Edit Pattern Region</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm">Shape:</label>
          <select
            value={settings.patternRegion.shape}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                patternRegion: { ...s.patternRegion, shape: e.target.value as ShapeType },
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
        <h3 className="font-semibold border-b border-ca-border pb-1 flex justify-between">
          <span>Detection Conditions</span>
          <button className="text-ca-select">&gt;&gt;</button>
        </h3>
        
        <div className="flex flex-col gap-3 mt-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Angle Range</span>
            <span className="bg-ca-panel-2 border border-ca-border px-2 py-1 rounded">+/- {settings.detection.angleRangeDeg}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>Detection Count</span>
            <span className="bg-ca-panel-2 border border-ca-border px-2 py-1 rounded">{settings.detection.detectionCount.toString().padStart(2, "0")}</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Search Sensitivity</span>
              <span>{settings.detection.searchSensitivity}</span>
            </div>
            <input type="range" min="0" max="100" value={settings.detection.searchSensitivity} onChange={(e) => setSettings(s => ({...s, detection: {...s.detection, searchSensitivity: Number(e.target.value)}}))} />
            <div className="text-center text-xs text-ca-ink-muted">Normal</div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Accuracy</span>
              <span>{settings.detection.accuracy}</span>
            </div>
            <input type="range" min="0" max="100" value={settings.detection.accuracy} onChange={(e) => setSettings(s => ({...s, detection: {...s.detection, accuracy: Number(e.target.value)}}))} />
            <div className="text-center text-xs text-ca-ink-muted">Normal</div>
          </div>

          <div className="flex items-center justify-between">
            <span>Min. Match %</span>
            <span className="bg-ca-panel-2 border border-ca-border px-2 py-1 rounded">{settings.detection.minMatchPercent}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
