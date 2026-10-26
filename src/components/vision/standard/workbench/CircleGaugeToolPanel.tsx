import React from "react";
import { Check, X, CircleDot, Gauge, Play, Clock, Target } from "lucide-react";
import type {
  CircleGaugePolarityType,
  CircleGaugeTargetFeatureType,
} from "@/domain/vision/circle-gauge-types";

export interface CircleGaugeToolPanelProps {
  targetFeature: CircleGaugeTargetFeatureType;
  edgePolarity: CircleGaugePolarityType;
  nominalDiameter: number;
  tolerance: number;
  minRoundnessScore: number;
  contrastThreshold: number;
  rayCount: number;
  measuredDiameter: number;
  roundnessScore: number;
  inlierCount: number;
  totalRayCount: number;
  // Preview verdict only: undefined while no Process has run. Every
  // PASS/FAIL display in this panel is gated on hasProcessed.
  isPass: boolean | undefined;
  hasProcessed: boolean;
  toolCode?: string;
  actionButtonLabel?: string;
  onTargetFeatureChange: (feature: CircleGaugeTargetFeatureType) => void;
  onPolarityChange: (polarity: CircleGaugePolarityType) => void;
  onNominalDiameterChange: (val: number) => void;
  onToleranceChange: (val: number) => void;
  onMinRoundnessScoreChange: (val: number) => void;
  onContrastThresholdChange: (val: number) => void;
  onRayCountChange: (val: number) => void;
  onProcess: () => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function CircleGaugeToolPanel(props: CircleGaugeToolPanelProps): React.JSX.Element {
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";
  const code = props.toolCode ?? "T111";

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Circle & Via Gauge Inspector
          </span>
        </div>
        <span className="rounded bg-emerald-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400 border border-emerald-800/50">
          {code}
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Measurement Card */}
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
                Pratt Circle Fit
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
                  ? "CIRCLE PASS"
                  : "TOLERANCE FAIL"}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Fitted Diameter:</span>
            <span className="font-mono text-xl font-black text-emerald-300">
              {props.hasProcessed ? `${props.measuredDiameter.toFixed(2)} px` : "--"}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Roundness Score:</span>
            <span className="font-mono text-sm font-bold text-cyan-300">
              {props.hasProcessed ? `${props.roundnessScore.toFixed(1)}%` : "--"}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Inlier Edge Rays:</span>
            <span className="font-mono text-sm font-bold text-slate-200">
              {props.hasProcessed ? `${props.inlierCount} / ${props.totalRayCount} rays` : "--"}
            </span>
          </div>

          {!props.hasProcessed ? (
            <div className="mt-2 rounded bg-black/40 p-2 text-[10px] text-amber-300 font-mono">
              Position circle/via ROI below and click &quot;Process Rule&quot; to perform radial
              ray-marching & Pratt circle fit.
            </div>
          ) : (
            <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400 border-t border-[#212832] pt-1">
              <span>
                Target: {props.nominalDiameter.toFixed(1)} &plusmn; {props.tolerance.toFixed(1)} px
              </span>
              <span>Min Roundness: {props.minRoundnessScore}%</span>
            </div>
          )}
        </div>

        {/* 2. Target Feature Type */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Target Feature
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "drill-hole", label: "Drill Hole" },
              { id: "via-pad", label: "PTH Via" },
              { id: "fiducial-dot", label: "Fiducial" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => props.onTargetFeatureChange(f.id as CircleGaugeTargetFeatureType)}
                className={`rounded border p-1.5 text-center text-xs font-bold uppercase transition-all ${
                  props.targetFeature === f.id
                    ? "border-emerald-400 bg-emerald-950/50 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                    : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Radial Edge Polarity */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Radial Edge Polarity
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "dark-to-light", label: "Dark Inside" },
              { id: "light-to-dark", label: "Light Inside" },
              { id: "any", label: "Any Edge" },
            ].map((pol) => (
              <button
                key={pol.id}
                type="button"
                onClick={() => props.onPolarityChange(pol.id as CircleGaugePolarityType)}
                className={`rounded border p-1.5 text-center text-xs font-bold uppercase transition-all ${
                  props.edgePolarity === pol.id
                    ? "border-emerald-400 bg-emerald-950/50 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                    : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                }`}
              >
                {pol.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Nominal Diameter & Tolerance */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300">Nominal Diameter</span>
              <span className="font-mono font-bold text-emerald-400">
                {props.nominalDiameter.toFixed(1)} px
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={300}
              step={0.5}
              value={props.nominalDiameter}
              onChange={(e) => props.onNominalDiameterChange(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300">Diameter Tolerance (&plusmn;)</span>
              <span className="font-mono font-bold text-emerald-400">
                &plusmn;{props.tolerance.toFixed(1)} px
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={30}
              step={0.5}
              value={props.tolerance}
              onChange={(e) => props.onToleranceChange(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>

        {/* 5. Roundness & Contrast Limits */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300">Min Roundness Score</span>
              <span className="font-mono font-bold text-cyan-400">{props.minRoundnessScore}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={99}
              step={1}
              value={props.minRoundnessScore}
              onChange={(e) => props.onMinRoundnessScoreChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-300">Min Edge Contrast</span>
              <span className="font-mono font-bold text-cyan-400">{props.contrastThreshold}</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={props.contrastThreshold}
              onChange={(e) => props.onContrastThresholdChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* 6. Ray Marching Density */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Ray Marching Spoke Density
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[32, 64, 128].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => props.onRayCountChange(count)}
                className={`rounded border p-1.5 text-center text-xs font-bold uppercase transition-all ${
                  props.rayCount === count
                    ? "border-emerald-400 bg-emerald-950/50 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                    : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                }`}
              >
                {count} Rays
              </button>
            ))}
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
