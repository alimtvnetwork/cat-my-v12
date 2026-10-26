import React from "react";
import { Check, X, ShieldAlert, CircleDot, Play, Clock } from "lucide-react";

export interface VoidPorosityToolPanelProps {
  voidSensitivity: number;
  minVoidDiameterPx: number;
  maxPorosityPercent: number;
  maxAllowedVoids: number;
  detectedVoidCount: number;
  measuredPorosityPercent: number;
  // Preview verdict only: undefined while no Process has run. Every
  // PASS/FAIL display in this panel is gated on hasProcessed.
  isPass: boolean | undefined;
  hasProcessed: boolean;
  actionButtonLabel?: string;
  onVoidSensitivityChange: (val: number) => void;
  onMinVoidDiameterChange: (val: number) => void;
  onMaxPorosityPercentChange: (val: number) => void;
  onMaxAllowedVoidsChange: (val: number) => void;
  onProcess: () => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function VoidPorosityToolPanel(props: VoidPorosityToolPanelProps): React.JSX.Element {
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <CircleDot className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Void & Porosity Defect Inspector
          </span>
        </div>
        <span className="rounded bg-amber-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-400 border border-amber-800/50">
          T108
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Porosity Readout */}
        <div
          className={`rounded-lg border p-3 transition-colors ${
            !props.hasProcessed
              ? "border-amber-500/40 bg-amber-950/20"
              : props.isPass
                ? "border-emerald-500/40 bg-emerald-950/20"
                : "border-amber-500/40 bg-amber-950/20"
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#212832]">
            <div className="flex items-center gap-1.5">
              {!props.hasProcessed ? (
                <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
              ) : (
                <ShieldAlert
                  className={`h-4 w-4 ${props.isPass ? "text-emerald-400" : "text-amber-400"}`}
                />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Porosity Metrics
              </span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                !props.hasProcessed
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : props.isPass
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              }`}
            >
              {!props.hasProcessed
                ? "PENDING PROCESS"
                : props.isPass
                  ? "ZERO POROSITY PASS"
                  : "POROSITY REJECT"}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Porosity Ratio:</span>
            <span
              className={`font-mono text-xl font-black ${
                !props.hasProcessed
                  ? "text-slate-400"
                  : props.isPass
                    ? "text-emerald-400"
                    : "text-amber-400"
              }`}
            >
              {props.hasProcessed ? `${props.measuredPorosityPercent.toFixed(2)}%` : "--"}
            </span>
          </div>

          {!props.hasProcessed ? (
            <div className="mt-2 rounded bg-black/40 p-2 text-[10px] text-amber-300 font-mono">
              Adjust void criteria below and click &quot;Process Rule&quot; to calculate cavity
              ratio.
            </div>
          ) : (
            <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400">
              <span>Void Count: {props.detectedVoidCount} cavity</span>
              <span>Limit: &le; {props.maxPorosityPercent}%</span>
            </div>
          )}
        </div>

        {/* 2. Void Cavity Sensitivity */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Cavity Contrast Sensitivity
            </label>
            <span className="font-mono text-xs font-bold text-amber-400">
              {props.voidSensitivity}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={90}
            value={props.voidSensitivity}
            onChange={(e) => props.onVoidSensitivityChange(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Coarse</span>
            <span>Default (40%)</span>
            <span>Micro-cavities</span>
          </div>
        </div>

        {/* 3. Min Void Cavity Diameter */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Min Void Diameter (px)
            </label>
            <span className="font-mono text-xs font-bold text-slate-200">
              {props.minVoidDiameterPx} px
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={60}
            value={props.minVoidDiameterPx}
            onChange={(e) => props.onMinVoidDiameterChange(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Filter noise (2 px)</span>
            <span>60 px</span>
          </div>
        </div>

        {/* 4. Max Allowed Porosity Ratio */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Max Allowed Porosity Ratio
            </label>
            <span className="font-mono text-xs font-bold text-amber-400">
              {props.maxPorosityPercent.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={15.0}
            step={0.5}
            value={props.maxPorosityPercent}
            onChange={(e) => props.onMaxPorosityPercentChange(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Strict (0.5%)</span>
            <span>Standard (5.0%)</span>
            <span>15.0%</span>
          </div>
        </div>

        {/* 5. Max Allowed Void Count */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Max Allowed Void Count
            </label>
            <span className="font-mono text-xs font-bold text-amber-400">
              {props.maxAllowedVoids === 0 ? "0 (Zero Void Gate)" : props.maxAllowedVoids}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={props.maxAllowedVoids}
            onChange={(e) => props.onMaxAllowedVoidsChange(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0 (Zero Tolerance)</span>
            <span>5</span>
            <span>10 Voids</span>
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
            className="flex flex-1 items-center justify-center gap-2 rounded border border-amber-500/70 bg-amber-950/60 py-2.5 text-xs font-black uppercase tracking-wider text-amber-300 shadow-md transition-all hover:bg-amber-900/80 hover:text-white active:scale-[0.98]"
          >
            <Play size={14} className="fill-amber-400 text-amber-400" />
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
