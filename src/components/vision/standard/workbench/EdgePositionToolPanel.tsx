import React from "react";
import { Check, X, Crosshair, ArrowRight, ArrowDown, ArrowLeft, ArrowUp, Play, Clock } from "lucide-react";

export interface EdgePositionToolPanelProps {
  scanDirection: "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top";
  edgePolarity: "light-to-dark" | "dark-to-light" | "both";
  edgeThreshold: number;
  filterWidth: number;
  nominalPosition: number;
  tolerancePx: number;
  measuredPosition: number;
  isPass: boolean;
  hasProcessed: boolean;
  toolCode?: string;
  actionButtonLabel?: string;
  onScanDirectionChange: (
    direction: "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top",
  ) => void;
  onEdgePolarityChange: (polarity: "light-to-dark" | "dark-to-light" | "both") => void;
  onEdgeThresholdChange: (val: number) => void;
  onFilterWidthChange: (val: number) => void;
  onNominalPositionChange: (val: number) => void;
  onToleranceChange: (val: number) => void;
  onProcess: () => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function EdgePositionToolPanel(props: EdgePositionToolPanelProps): React.JSX.Element {
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";
  const deviation = Math.round((props.measuredPosition - props.nominalPosition) * 10) / 10;

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Edge Position Measurement
          </span>
        </div>
        <span className="rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-400 border border-cyan-800/50">
          {props.toolCode ?? "T104"}
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Edge Position Readout */}
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
                <Crosshair
                  className={`h-4 w-4 ${props.isPass ? "text-emerald-400" : "text-rose-400"}`}
                />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Position Result
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
                  ? "EDGE IN TOLERANCE"
                  : "POSITION DEVIATION"}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Detected Edge:</span>
            <span className="font-mono text-xl font-black text-cyan-300">
              {props.hasProcessed ? `${props.measuredPosition.toFixed(1)} px` : "--"}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Position Offset (Δ):</span>
            <span
              className={`font-mono text-sm font-bold ${
                !props.hasProcessed
                  ? "text-slate-400"
                  : props.isPass
                    ? "text-emerald-400"
                    : "text-rose-400"
              }`}
            >
              {!props.hasProcessed ? "--" : deviation >= 0 ? `+${deviation} px` : `${deviation} px`}
            </span>
          </div>

          <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400 border-t border-[#212832] pt-1">
            <span>
              Target: {props.nominalPosition} &plusmn; {props.tolerancePx} px
            </span>
            <span>Status: {!props.hasProcessed ? "PENDING" : props.isPass ? "PASS" : "FAIL"}</span>
          </div>
        </div>

        {/* 2. Scan Direction */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Scan Direction
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "left-to-right", label: "Left → Right", icon: ArrowRight },
              { id: "right-to-left", label: "Right → Left", icon: ArrowLeft },
              { id: "top-to-bottom", label: "Top ↓ Bottom", icon: ArrowDown },
              { id: "bottom-to-top", label: "Bottom ↑ Top", icon: ArrowUp },
            ].map((d) => {
              const Icon = d.icon;

              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() =>
                    props.onScanDirectionChange(
                      d.id as "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top",
                    )
                  }
                  className={`flex items-center gap-2 rounded border p-2 text-xs font-bold transition-all ${
                    props.scanDirection === d.id
                      ? "border-cyan-400 bg-cyan-950/50 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                      : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon size={14} className="text-cyan-400" />
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Edge Transition Polarity */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Transition Polarity
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "light-to-dark", label: "Light → Dark" },
              { id: "dark-to-light", label: "Dark → Light" },
              { id: "both", label: "Any Edge" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  props.onEdgePolarityChange(p.id as "light-to-dark" | "dark-to-light" | "both")
                }
                className={`rounded border p-1.5 text-center text-xs font-bold uppercase transition-all ${
                  props.edgePolarity === p.id
                    ? "border-cyan-400 bg-cyan-950/50 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                    : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Edge Contrast Threshold */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Edge Contrast Sensitivity
            </label>
            <span className="font-mono text-xs font-bold text-cyan-400">
              {props.edgeThreshold}%
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={90}
            value={props.edgeThreshold}
            onChange={(e) => props.onEdgeThresholdChange(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* 5. Nominal Position & Tolerance */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Nominal Coordinate & Tolerance
          </label>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Nominal Position:</span>
              <span className="font-mono font-bold text-slate-200">
                {props.nominalPosition} px
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={600}
              value={props.nominalPosition}
              onChange={(e) => props.onNominalPositionChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Positional Tolerance:</span>
              <span className="font-mono font-bold text-cyan-400">
                &plusmn; {props.tolerancePx} px
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={props.tolerancePx}
              onChange={(e) => props.onToleranceChange(Number(e.target.value))}
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
