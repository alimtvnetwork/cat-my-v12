import React from "react";
import { ExternalLink, Sliders } from "lucide-react";
import { HolePolarityType } from "./types";

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
  onReconfigure: () => void;
}

export function Pin1SettingsCard(props: Pin1SettingsCardProps): React.JSX.Element {
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
