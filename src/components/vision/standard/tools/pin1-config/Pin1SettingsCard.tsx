import React from "react";
import { ExternalLink, Sliders } from "lucide-react";
import { ShapeType } from "@/domain/vision/shapes";
import { HolePolarityType } from "./types";

export interface Pin1SettingsCardProps {
  polarity: HolePolarityType;
  thresholdLuma: number;
  /** Threshold actually used by the last detection (spec 55). When the
   *  requested DarkIndentation threshold exceeds the region mean, the
   *  detector replaces it with 75% of the mean — surfaced here, never
   *  silent. Falls back to thresholdLuma when no detection ran yet. */
  effectiveThresholdLuma?: number;
  isThresholdOverridden?: boolean;
  thresholdRegionMeanLuma?: number | null;
  minCircularity: number;
  tolerancePx: number;
  expectedX?: number;
  expectedY?: number;
  expectedRadius?: number;
  /** Pattern shape searched inside the ROI (spec 54). Defaults to Rectangle. */
  patternShape?: ShapeType;
  onPatternShapeChange?: (shape: ShapeType) => void;
  onToleranceChange: (val: number) => void;
  onCircularityChange?: (val: number) => void;
  onReconfigure: () => void;
}

const PATTERN_SHAPES: readonly ShapeType[] = [
  ShapeType.Rectangle,
  ShapeType.Circle,
  ShapeType.Ellipse,
  ShapeType.Polygon,
];

export function Pin1SettingsCard(props: Pin1SettingsCardProps): React.JSX.Element {
  const activePatternShape = props.patternShape ?? ShapeType.Rectangle;

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

      {/* 2b. Pattern Shape — the shape searched INSIDE the region of
          interest (spec 54). The ROI itself stays a plain region; the
          pattern takes the shape. Existing REGION SHAPE buttons on the
          ROI are untouched; this picker is additive. */}
      <div className="space-y-1">
        <div className="flex justify-between text-ca-ink-muted">
          <span>Pattern Shape</span>
          <span className="font-mono font-bold text-ca-ink">{activePatternShape}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PATTERN_SHAPES.map((shape) => {
            const isActive = shape === activePatternShape;

            return (
              <button
                key={shape}
                type="button"
                data-ui-id={`ui-pin1-pattern-shape-${shape.toLowerCase()}`}
                onClick={() => props.onPatternShapeChange?.(shape)}
                className={`rounded border px-1 py-1 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? "border-fuchsia-400 bg-fuchsia-400/15 text-fuchsia-200"
                    : "border-ca-border bg-ca-panel-2 text-ca-ink-muted hover:text-ca-ink"
                }`}
              >
                {shape}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-ca-ink-muted/80 pt-0.5">
          Shape of the pattern searched inside the region of interest.
        </div>
      </div>

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
            {props.polarity === HolePolarityType.DarkIndentation ? "Dark Indentation" : "Light Dot"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Greyscale Threshold:</span>
          <span className="font-mono font-bold text-ca-select">{props.thresholdLuma} / 255</span>
        </div>
        {props.isThresholdOverridden && (
          <div className="text-[10px] text-amber-300 pt-0.5">
            Using {props.effectiveThresholdLuma ?? props.thresholdLuma} instead — your value exceeds
            the region mean
            {typeof props.thresholdRegionMeanLuma === "number"
              ? ` (${Math.round(props.thresholdRegionMeanLuma)} × 75%)`
              : ""}
            , so it could never match a dark hole.
          </div>
        )}
        <div className="text-[10px] text-ca-ink-muted/80 pt-0.5">
          Pin1 hunts dark targets, so this slider lives at the dark end of the scale (default 35);
          the white-box marking slider lives at the bright end (default 170). Values are not
          interchangeable between tools — carrying a number across gives opposite behavior.
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
