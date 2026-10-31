import React from "react";
import { Check, X, Ruler, Gauge, Play, Clock } from "lucide-react";

export interface EdgeWidthToolPanelProps {
  measurementMode: "width" | "pitch" | "gap";
  edgePolarity: "dark-to-light" | "light-to-dark" | "any";
  contrastThreshold: number;
  nominalDistance: number;
  tolerance: number;
  expectedLeadCount: number;
  measuredDistance: number;
  measuredLeadCount: number;
  // Preview verdict only: undefined while no Process has run. Every
  // PASS/FAIL display in this panel is gated on hasProcessed.
  isPass: boolean | undefined;
  hasProcessed: boolean;
  toolCode?: string;
  actionButtonLabel?: string;
  onMeasurementModeChange: (mode: "width" | "pitch" | "gap") => void;
  onPolarityChange: (polarity: "dark-to-light" | "light-to-dark" | "any") => void;
  onContrastThresholdChange: (val: number) => void;
  onNominalDistanceChange: (val: number) => void;
  onToleranceChange: (val: number) => void;
  onExpectedLeadCountChange: (val: number) => void;
  onProcess: () => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function EdgeWidthToolPanel(props: EdgeWidthToolPanelProps): React.JSX.Element {
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";
  const code = props.toolCode ?? "T110";

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Edge Width & Caliper Inspector
          </span>
        </div>
        <span className="rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-400 border border-cyan-800/50">
          {code}
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Caliper Measurement Card */}
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
                Sub-Pixel Caliper
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
                  ? "CALIPER PASS"
                  : "TOLERANCE FAIL"}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Measured Distance:</span>
            <span className="font-mono text-xl font-black text-cyan-300">
              {props.hasProcessed ? `${props.measuredDistance.toFixed(1)} px` : "--"}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Detected Leads:</span>
            <span className="font-mono text-sm font-bold text-slate-200">
              {props.hasProcessed
                ? `${props.measuredLeadCount} / ${props.expectedLeadCount} leads`
                : "--"}
            </span>
          </div>

          {!props.hasProcessed ? (
            <div className="mt-2 rounded bg-black/40 p-2 text-[10px] text-amber-300 font-mono">
              Position caliper ROI below and click &quot;Process Rule&quot; to measure sub-pixel
              edges.
            </div>
          ) : (
            <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400 border-t border-[#212832] pt-1">
              <span>
                Target: {props.nominalDistance} &plusmn; {props.tolerance} px
              </span>
              <span>Status: {props.isPass ? "WITHIN LIMITS" : "OUT OF LIMITS"}</span>
            </div>
          )}
        </div>

        {/* 2. Measurement Target Mode */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Inspection Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "width", label: "Lead Width" },
              { id: "pitch", label: "Lead Pitch" },
              { id: "gap", label: "Pin Gap" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => props.onMeasurementModeChange(m.id as "width" | "pitch" | "gap")}
                className={`rounded border p-1.5 text-center text-xs font-bold uppercase transition-all ${
                  props.measurementMode === m.id
                    ? "border-cyan-400 bg-cyan-950/50 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                    : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Edge Contrast Sensitivity */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Edge Contrast Threshold
            </label>
            <span className="font-mono text-xs font-bold text-cyan-400">
              {props.contrastThreshold}%
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={90}
            value={props.contrastThreshold}
            onChange={(e) => props.onContrastThresholdChange(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* 4. Target Distance & Tolerance Band */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Nominal Dimension & Tolerance
          </label>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Nominal Distance:</span>
              <span className="font-mono font-bold text-slate-200">{props.nominalDistance} px</span>
            </div>
            <input
              type="range"
              min={5}
              max={250}
              value={props.nominalDistance}
              onChange={(e) => props.onNominalDistanceChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Tolerance Band:</span>
              <span className="font-mono font-bold text-cyan-400">
                &plusmn; {props.tolerance} px
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={props.tolerance}
              onChange={(e) => props.onToleranceChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* 5. Expected Pin Count */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Expected Lead / Pin Count
            </label>
            <span className="font-mono text-xs font-bold text-slate-200">
              {props.expectedLeadCount} pins
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={64}
            value={props.expectedLeadCount}
            onChange={(e) => props.onExpectedLeadCountChange(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
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
