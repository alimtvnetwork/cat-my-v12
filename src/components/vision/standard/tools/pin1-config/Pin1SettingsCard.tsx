import React from "react";
import { ExternalLink, Sliders } from "lucide-react";
import { HolePolarityType, type Pin1AngleDatum } from "./types";

export interface Pin1SettingsCardProps {
  polarity: HolePolarityType;
  thresholdLuma: number;
  minCircularity: number;
  tolerancePx: number;
  expectedX?: number;
  expectedY?: number;
  expectedRadius?: number;
  onToleranceChange: (val: number) => void;
  onCircularityChange?: (val: number) => void;
  angleDatum?: Pin1AngleDatum;
  onAngleDatumChange?: (datum: Pin1AngleDatum) => void;
  onReconfigure: () => void;
}

export function Pin1SettingsCard(props: Pin1SettingsCardProps): React.JSX.Element {
  const hasValidThreshold = props.thresholdLuma >= 0 && props.thresholdLuma <= 255;
  const hasValidCircularity = props.minCircularity >= 0 && props.minCircularity <= 100;
  const hasValidTolerance = props.tolerancePx >= 0;
  const hasValidInputs = hasValidThreshold && hasValidCircularity && hasValidTolerance;

  return (
    <div className="rounded border border-ca-border bg-ca-panel p-3.5 shadow-sm space-y-3.5 text-xs font-sans">
      <div className="flex items-center gap-1.5 border-b border-ca-border pb-1.5 font-bold uppercase tracking-wide text-ca-ink">
        <Sliders className="h-3.5 w-3.5 text-ca-select" />
        <span>Orientation Criteria & Limits</span>
      </div>

      {/* 1. Positional Tolerance */}
      <div className="space-y-1">
        <div className="flex justify-between text-ca-ink-muted">
          <span>Alignment Tolerance Limit</span>
          <span className="font-mono font-bold text-ca-ink">±{props.tolerancePx}px</span>
        </div>
        <input
          type="range"
          min={2}
          max={30}
          value={props.tolerancePx}
          onChange={(e) => props.onToleranceChange(Number(e.target.value))}
          className="w-full accent-ca-select"
        />
      </div>

      {/* 2. Min Circularity Score */}
      {props.onCircularityChange && (
        <div className="space-y-1">
          <div className="flex justify-between text-ca-ink-muted">
            <span>Min Circularity (PASS Limit)</span>
            <span className="font-mono font-bold text-emerald-400">{props.minCircularity}%</span>
          </div>
          <input
            type="range"
            min={40}
            max={95}
            value={props.minCircularity}
            onChange={(e) => props.onCircularityChange?.(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
      )}

      {/* 3. Registered Template Readout */}
      <div className="rounded bg-ca-panel-2 p-2.5 text-[11px] text-ca-ink-muted space-y-1.5 border border-ca-border">
        <div className="flex justify-between items-center">
          <span>Registered Dimple:</span>
          <span className="font-mono font-semibold text-ca-ink">
            {typeof props.expectedX === "number" && typeof props.expectedY === "number"
              ? `(${props.expectedX}, ${props.expectedY}) R=${props.expectedRadius ?? "--"}`
              : "Saved Reference"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Mark Polarity:</span>
          <span className="font-mono text-cyan-300">
            {props.polarity === HolePolarityType.DarkIndentation
              ? "Dark Indentation"
              : "Light Dot"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Greyscale Threshold:</span>
          <span className="font-mono font-bold text-ca-select">{props.thresholdLuma} / 255</span>
        </div>
        <div className="text-[10px] text-ca-ink-muted/80 pt-0.5">
          (Parameters loaded from Pin 1 rule)
        </div>
      </div>

      {/* Angle datum (shown only when the caller wires the selector) */}
      {props.onAngleDatumChange && props.angleDatum && (
        <div className="space-y-1">
          <div className="flex justify-between text-ca-ink-muted">
            <span>Angle Datum (angle origin)</span>
            <span className="font-mono font-bold text-ca-ink">
              {props.angleDatum === "package" ? "Package centre" : "Search centre"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => props.onAngleDatumChange?.("package")}
              className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${
                props.angleDatum === "package"
                  ? "border-ca-select bg-ca-select/20 text-ca-select"
                  : "border-ca-border bg-ca-panel text-ca-ink hover:bg-ca-bg"
              }`}
            >
              Package centre
            </button>
            <button
              type="button"
              onClick={() => props.onAngleDatumChange?.("search")}
              className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${
                props.angleDatum === "search"
                  ? "border-ca-select bg-ca-select/20 text-ca-select"
                  : "border-ca-border bg-ca-panel text-ca-ink hover:bg-ca-bg"
              }`}
            >
              Search centre
            </button>
          </div>
          <p className="text-[10px] text-ca-ink-muted/80 pt-0.5">
            Package centre falls back to the search centre when no package region exists.
          </p>
        </div>
      )}

      {/* Entry validation (values are clamped at entry, not at evaluation) */}
      <div className="rounded bg-ca-panel-2 p-2.5 text-[11px] text-ca-ink-muted space-y-1 border border-ca-border">
        <div className="flex justify-between items-center">
          <span>Entry validation:</span>
          <span className="font-mono font-semibold text-ca-ink">
            {hasValidInputs ? "Valid" : "Check inputs"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Threshold 0–255:</span>
          <span className="font-mono">{hasValidThreshold ? "OK" : "Check"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Circularity 0–100%:</span>
          <span className="font-mono">{hasValidCircularity ? "OK" : "Check"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Tolerance ≥0px:</span>
          <span className="font-mono">{hasValidTolerance ? "OK" : "Check"}</span>
        </div>
      </div>

      {/* 4. Reconfigure Pin 1 Template Button */}
      <button
        type="button"
        onClick={props.onReconfigure}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-ca-border bg-ca-panel-2 px-3 py-1.5 text-xs font-semibold text-ca-ink hover:bg-ca-bg transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5 text-ca-ink-muted" />
        <span>Reconfigure Pin 1 Template</span>
      </button>
    </div>
  );
}
