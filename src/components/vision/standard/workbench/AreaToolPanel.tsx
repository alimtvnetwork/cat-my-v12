import React from "react";
import { Check, X, Sliders, ShieldCheck, Play, Clock } from "lucide-react";
import type { AreaMeasurementMode, AreaTargetPolarity } from "@/domain/vision/area-gate-types";

export interface AreaToolPanelProps {
  areaMode: AreaMeasurementMode;
  targetPolarity: AreaTargetPolarity;
  threshold: number;
  minArea: number;
  maxArea: number;
  measuredArea: number;
  isPass: boolean;
  hasProcessed: boolean;
  actionButtonLabel?: string;
  onAreaModeChange: (mode: AreaMeasurementMode) => void;
  onPolarityChange: (polarity: AreaTargetPolarity) => void;
  onThresholdChange: (threshold: number) => void;
  onMinAreaChange: (min: number) => void;
  onMaxAreaChange: (max: number) => void;
  onProcess: () => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function AreaToolPanel(props: AreaToolPanelProps): React.JSX.Element {
  const unitLabel =
    props.areaMode === "pixels" ? "px" : props.areaMode === "percentage" ? "%" : "mm²";
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";

  const percentPosition = Math.min(
    100,
    Math.max(
      0,
      props.maxArea > props.minArea
        ? ((props.measuredArea - props.minArea) / (props.maxArea - props.minArea)) * 100
        : 50,
    ),
  );

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Area Gate Configuration
          </span>
        </div>
        <span className="rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-400 border border-cyan-800/50">
          T101
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Measurement Gauge */}
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
                <ShieldCheck
                  className={`h-4 w-4 ${props.isPass ? "text-emerald-400" : "text-rose-400"}`}
                />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Gate Measurement
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
                  ? "GATE PASS"
                  : "OUT OF TOLERANCE"}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Measured Surface Area:</span>
            <span className="font-mono text-lg font-black text-cyan-300">
              {props.hasProcessed
                ? `${props.measuredArea.toLocaleString()} ${unitLabel}`
                : "--"}
            </span>
          </div>

          {!props.hasProcessed ? (
            <div className="mt-2 rounded bg-black/40 p-2 text-[10px] text-amber-300 font-mono">
              Adjust parameters below and click &quot;Process Rule&quot; to execute area analysis.
            </div>
          ) : (
            <div className="mt-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#1b222c]">
                <div
                  className={`h-full transition-all duration-300 ${
                    props.isPass ? "bg-emerald-400" : "bg-rose-500"
                  }`}
                  style={{ width: `${percentPosition}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400">
                <span>Min: {props.minArea.toLocaleString()}</span>
                <span>Max: {props.maxArea.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* 2. Measurement Mode */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Area Measurement Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(["pixels", "percentage", "physical"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => props.onAreaModeChange(mode)}
                className={`rounded border px-2 py-1.5 text-[11px] font-bold uppercase transition-all ${
                  props.areaMode === mode
                    ? "border-cyan-400 bg-cyan-950/50 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                    : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                }`}
              >
                {mode === "pixels" ? "Pixels (px)" : mode === "percentage" ? "Percent (%)" : "Area (mm²)"}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Target Polarity */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Target Polarity
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => props.onPolarityChange("bright")}
              className={`flex flex-col items-center rounded border p-2 text-center transition-all ${
                props.targetPolarity === "bright"
                  ? "border-cyan-400 bg-cyan-950/50 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                  : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-xs font-bold uppercase">Bright on Dark</span>
              <span className="text-[10px] text-slate-400">High intensity features</span>
            </button>
            <button
              type="button"
              onClick={() => props.onPolarityChange("dark")}
              className={`flex flex-col items-center rounded border p-2 text-center transition-all ${
                props.targetPolarity === "dark"
                  ? "border-cyan-400 bg-cyan-950/50 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                  : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-xs font-bold uppercase">Dark on Bright</span>
              <span className="text-[10px] text-slate-400">Low intensity cavities</span>
            </button>
          </div>
        </div>

        {/* 4. Intensity Binarization Threshold */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Intensity Threshold
            </label>
            <span className="font-mono text-xs font-bold text-cyan-400">
              {props.threshold} / 255
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={props.threshold}
            onChange={(e) => props.onThresholdChange(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0 (Dark)</span>
            <span>128</span>
            <span>255 (Bright)</span>
          </div>
        </div>

        {/* 5. Area Acceptance Limits */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Acceptance Gate Limits ({unitLabel})
          </label>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Lower Limit (Min Area):</span>
              <span className="font-mono font-bold text-slate-200">
                {props.minArea.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={props.maxArea * 1.5 || 50000}
              step={10}
              value={props.minArea}
              onChange={(e) => props.onMinAreaChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Upper Limit (Max Area):</span>
              <span className="font-mono font-bold text-slate-200">
                {props.maxArea.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={props.minArea}
              max={100000}
              step={50}
              value={props.maxArea}
              onChange={(e) => props.onMaxAreaChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
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
            className="flex flex-1 items-center justify-center gap-2 rounded border border-cyan-500/70 bg-cyan-950/60 py-2.5 text-xs font-black uppercase tracking-wider text-cyan-300 shadow-md transition-all hover:bg-cyan-900/80 hover:text-white active:scale-[0.98]"
          >
            <Play size={14} className="fill-cyan-400 text-cyan-400" />
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
