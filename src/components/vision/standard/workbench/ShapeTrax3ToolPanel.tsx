import React from "react";
import { Check, X, ScanLine, Gauge, Play, Clock, Compass, ZoomIn } from "lucide-react";

export interface ShapeTrax3ToolPanelProps {
  minMatchPercent: number;
  contrastThreshold: number;
  angleRangeDeg: number;
  scaleRangeMin: number;
  scaleRangeMax: number;
  roughSearchLevel: number;
  detailSearchLevel: number;
  score: number;
  matchedX: number;
  matchedY: number;
  angleDeg: number;
  scalePct: number;
  matchedPoints: number;
  totalModelPoints: number;
  // Preview verdict only: undefined while no Process has run. Every
  // PASS/FAIL display in this panel is gated on hasProcessed.
  isPass: boolean | undefined;
  hasProcessed: boolean;
  toolCode?: string;
  actionButtonLabel?: string;
  onMinMatchPercentChange: (val: number) => void;
  onContrastThresholdChange: (val: number) => void;
  onAngleRangeChange: (val: number) => void;
  onScaleRangeMinChange: (val: number) => void;
  onScaleRangeMaxChange: (val: number) => void;
  onRoughSearchLevelChange: (val: number) => void;
  onDetailSearchLevelChange: (val: number) => void;
  onProcess: () => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function ShapeTrax3ToolPanel(props: ShapeTrax3ToolPanelProps): React.JSX.Element {
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";
  const code = props.toolCode ?? "SHAPETRAX3";

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            ShapeTrax3 Contour Matcher
          </span>
        </div>
        <span className="rounded bg-emerald-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400 border border-emerald-800/50">
          {code}
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Result Card */}
        <div
          className={`rounded-lg border p-3 transition-colors ${
            !props.hasProcessed
              ? "border-amber-500/40 bg-amber-950/20"
              : props.isPass
                ? "border-emerald-500/40 bg-emerald-950/20"
                : "border-rose-500/40 bg-rose-950/20"
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#212832]">
            <div className="flex items-center gap-1.5">
              {!props.hasProcessed ? (
                <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
              ) : (
                <Gauge
                  className={`h-4 w-4 ${props.isPass ? "text-emerald-400" : "text-rose-400"}`}
                />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Geometric Contour Match
              </span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                !props.hasProcessed
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : props.isPass
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {!props.hasProcessed
                ? "PENDING PROCESS"
                : props.isPass
                  ? "CONTOUR PASS"
                  : "MATCH FAIL"}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Correlation Score:</span>
            <span className="font-mono text-xl font-black text-emerald-300">
              {props.hasProcessed ? `${props.score.toFixed(1)}%` : "--"}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Rotation Angle (&theta;):</span>
            <span className="font-mono text-sm font-bold text-cyan-300">
              {props.hasProcessed
                ? `${props.angleDeg >= 0 ? "+" : ""}${props.angleDeg.toFixed(1)}°`
                : "--"}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Scale Factor:</span>
            <span className="font-mono text-sm font-bold text-slate-200">
              {props.hasProcessed ? `${props.scalePct.toFixed(1)}%` : "--"}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Centroid Pose:</span>
            <span className="font-mono text-xs font-bold text-slate-300">
              {props.hasProcessed
                ? `(${props.matchedX.toFixed(1)}, ${props.matchedY.toFixed(1)})`
                : "--"}
            </span>
          </div>

          {!props.hasProcessed ? (
            <div className="mt-2 rounded bg-black/40 p-2 text-[10px] text-amber-300 font-mono">
              Position search ROI and click &quot;Process Rule&quot; to vectorize sub-pixel boundary
              contours.
            </div>
          ) : (
            <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400 border-t border-[#212832] pt-1">
              <span>Target: &gt;= {props.minMatchPercent}%</span>
              <span>Tolerance: &plusmn;{props.angleRangeDeg}&deg;</span>
            </div>
          )}
        </div>

        {/* 2. Match Score & Contrast Thresholds */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300">Minimum Match Score</span>
              <span className="font-mono font-bold text-emerald-400">{props.minMatchPercent}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={99}
              step={1}
              value={props.minMatchPercent}
              onChange={(e) => props.onMinMatchPercentChange(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300">Contour Contrast Sensitivity</span>
              <span className="font-mono font-bold text-cyan-400">{props.contrastThreshold}</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={1}
              value={props.contrastThreshold}
              onChange={(e) => props.onContrastThresholdChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* 3. Invariance Tolerances (Angle & Scale) */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-3">
          <div className="flex items-center gap-1.5 border-b border-[#212832] pb-1">
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Geometric Invariance Tolerances
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300">Rotation Angle Range (&plusmn;&deg;)</span>
              <span className="font-mono font-bold text-cyan-400">
                &plusmn;{props.angleRangeDeg}&deg;
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={180}
              step={5}
              value={props.angleRangeDeg}
              onChange={(e) => props.onAngleRangeChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Min Scale</span>
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-1">
                <span>{props.scaleRangeMin}%</span>
              </div>
              <input
                type="range"
                min={80}
                max={100}
                step={1}
                value={props.scaleRangeMin}
                onChange={(e) => props.onScaleRangeMinChange(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Max Scale</span>
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-1">
                <span>{props.scaleRangeMax}%</span>
              </div>
              <input
                type="range"
                min={100}
                max={125}
                step={1}
                value={props.scaleRangeMax}
                onChange={(e) => props.onScaleRangeMaxChange(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 4. Multi-Resolution Pyramidal Search */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Multi-Resolution Search Depth
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Coarse Pyramid (1-5)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={props.roughSearchLevel}
                onChange={(e) => props.onRoughSearchLevelChange(Number(e.target.value))}
                className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1 font-mono text-xs text-white"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Fine Pyramid (1-5)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={props.detailSearchLevel}
                onChange={(e) => props.onDetailSearchLevelChange(Number(e.target.value))}
                className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1 font-mono text-xs text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer with 2 Primary Buttons: Process & Apply/OK */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-[#212832] bg-[#121720] p-3">
        <div className="flex items-center gap-2">
          {/* Button 1: Process */}
          <button
            type="button"
            onClick={props.onProcess}
            className="flex flex-1 items-center justify-center gap-2 rounded border border-emerald-500/70 bg-emerald-950/60 py-2.5 text-xs font-black uppercase tracking-wider text-emerald-300 shadow-md transition-all hover:bg-emerald-900/80 hover:text-white active:scale-[0.98]"
          >
            <Play size={14} className="fill-emerald-400 text-emerald-400" />
            Process Rule
          </button>

          {/* Button 2: Apply / OK */}
          <button
            type="button"
            onClick={props.onApply}
            className="flex flex-1 items-center justify-center gap-2 rounded bg-[#00ff9d] py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Check size={16} strokeWidth={3} />
            {label}
          </button>
        </div>

        {props.onCancel && (
          <button
            type="button"
            onClick={props.onCancel}
            className="flex w-full items-center justify-center rounded border border-[#374151] bg-[#1f2937] py-1.5 text-xs font-bold uppercase text-slate-400 transition-colors hover:bg-[#2d3748] hover:text-white"
          >
            <X size={13} className="mr-1" />
            Cancel
          </button>
        )}
      </div>
    </aside>
  );
}
