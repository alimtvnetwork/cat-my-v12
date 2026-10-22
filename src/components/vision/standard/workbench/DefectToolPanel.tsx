import React from "react";
import { Check, X, ShieldAlert, AlertTriangle, Play, Clock } from "lucide-react";
import type { DefectTargetType } from "@/domain/vision/surface-flaw-types";

export interface DefectToolPanelProps {
  sensitivity: number;
  defectTarget: DefectTargetType;
  minArea: number;
  maxAllowedDefects: number;
  detectedCount: number;
  isPass: boolean;
  hasProcessed: boolean;
  actionButtonLabel?: string;
  onSensitivityChange: (val: number) => void;
  onDefectTargetChange: (target: DefectTargetType) => void;
  onMinAreaChange: (val: number) => void;
  onMaxAllowedDefectsChange: (val: number) => void;
  onProcess: () => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function DefectToolPanel(props: DefectToolPanelProps): React.JSX.Element {
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Scratch & Crack Detector
          </span>
        </div>
        <span className="rounded bg-rose-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-400 border border-rose-800/50">
          T107
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Defect Readout */}
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
                <AlertTriangle
                  className={`h-4 w-4 ${props.isPass ? "text-emerald-400" : "text-rose-400"}`}
                />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Flaw Inspection
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
                  ? "ZERO DEFECT PASS"
                  : "DEFECT REJECT"}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Detected Flaws:</span>
            <span
              className={`font-mono text-xl font-black ${
                !props.hasProcessed
                  ? "text-slate-400"
                  : props.isPass
                    ? "text-emerald-400"
                    : "text-rose-400"
              }`}
            >
              {props.hasProcessed
                ? `${props.detectedCount} flaw${props.detectedCount === 1 ? "" : "s"}`
                : "--"}
            </span>
          </div>

          {!props.hasProcessed ? (
            <div className="mt-2 rounded bg-black/40 p-2 text-[10px] text-amber-300 font-mono">
              Adjust sensitivity below and click &quot;Process Rule&quot; to run differential flaw analysis.
            </div>
          ) : (
            <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400">
              <span>Zero-Defect Limit: {props.maxAllowedDefects} max</span>
              <span>Status: {props.isPass ? "ACCEPTED" : "REJECTED"}</span>
            </div>
          )}
        </div>

        {/* 2. Target Flaw Polarity */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Target Flaw Type
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "dark-defects", label: "Scratches", desc: "Dark Cracks" },
              { id: "bright-defects", label: "Glares", desc: "Bright Scuffs" },
              { id: "both", label: "All Flaws", desc: "Dual Gradient" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => props.onDefectTargetChange(t.id as DefectTargetType)}
                className={`rounded border p-1.5 text-center transition-all ${
                  props.defectTarget === t.id
                    ? "border-rose-400 bg-rose-950/50 text-rose-200 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
                    : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="text-[11px] font-bold uppercase">{t.label}</div>
                <div className="text-[9px] text-slate-500">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Gradient Sensitivity */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Defect Contrast Sensitivity
            </label>
            <span className="font-mono text-xs font-bold text-rose-400">
              {props.sensitivity}%
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={95}
            value={props.sensitivity}
            onChange={(e) => props.onSensitivityChange(Number(e.target.value))}
            className="w-full accent-rose-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Low (Coarse)</span>
            <span>Default (35%)</span>
            <span>High (Fine Micro-Cracks)</span>
          </div>
        </div>

        {/* 4. Min Flaw Size */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Minimum Flaw Size (px)
            </label>
            <span className="font-mono text-xs font-bold text-slate-200">
              {props.minArea} px
            </span>
          </div>
          <input
            type="range"
            min={3}
            max={150}
            value={props.minArea}
            onChange={(e) => props.onMinAreaChange(Number(e.target.value))}
            className="w-full accent-rose-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>Filter noise (3 px)</span>
            <span>150 px</span>
          </div>
        </div>

        {/* 5. Max Allowed Defects */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Max Allowed Defects
            </label>
            <span className="font-mono text-xs font-bold text-rose-400">
              {props.maxAllowedDefects === 0 ? "0 (Zero Defect Gate)" : props.maxAllowedDefects}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={props.maxAllowedDefects}
            onChange={(e) => props.onMaxAllowedDefectsChange(Number(e.target.value))}
            className="w-full accent-rose-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0 (Zero Tolerance)</span>
            <span>5</span>
            <span>10 Defects</span>
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
            className="flex flex-1 items-center justify-center gap-2 rounded border border-rose-500/70 bg-rose-950/60 py-2.5 text-xs font-black uppercase tracking-wider text-rose-300 shadow-md transition-all hover:bg-rose-900/80 hover:text-white active:scale-[0.98]"
          >
            <Play size={14} className="fill-rose-400 text-rose-400" />
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
