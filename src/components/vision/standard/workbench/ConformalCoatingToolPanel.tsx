import React from "react";
import { Check, X, Sparkles, Gauge, Play, Clock, Layers, ShieldAlert, Palette } from "lucide-react";
import type {
  CieLabColor,
  CoatingInspectionModeType,
  RgbColor,
  UvTracerChannelType,
} from "@/domain/vision/conformal-coating-types";

export interface ConformalCoatingToolPanelProps {
  inspectionMode: CoatingInspectionModeType;
  uvChannel: UvTracerChannelType;
  fluorescenceThreshold: number;
  minCoveragePct: number;
  maxDeltaE: number;
  maxAllowedVoids: number;
  targetLab: CieLabColor;
  coveragePct: number;
  deltaE: number;
  meanRgb: RgbColor;
  meanLab: CieLabColor;
  uncoatedVoidCount: number;
  // Preview verdict only: undefined while no Process has run. Every
  // PASS/FAIL display in this panel is gated on hasProcessed.
  isPass: boolean | undefined;
  hasProcessed: boolean;
  toolCode?: string;
  actionButtonLabel?: string;
  onInspectionModeChange: (mode: CoatingInspectionModeType) => void;
  onUvChannelChange: (channel: UvTracerChannelType) => void;
  onFluorescenceThresholdChange: (val: number) => void;
  onMinCoveragePctChange: (val: number) => void;
  onMaxDeltaEChange: (val: number) => void;
  onMaxAllowedVoidsChange: (val: number) => void;
  onTargetLabChange: (lab: CieLabColor) => void;
  onProcess: () => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function ConformalCoatingToolPanel(
  props: ConformalCoatingToolPanelProps,
): React.JSX.Element {
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";
  const code = props.toolCode ?? "T112";

  const isKoz = props.inspectionMode === "keep-out-zone";
  const isColor = props.inspectionMode === "cie-lab-color";

  const statusBadge = !props.hasProcessed
    ? "PENDING PROCESS"
    : props.isPass
      ? isKoz
        ? "KOZ CLEAR"
        : isColor
          ? "COLOR PASS"
          : "COATING PASS"
      : isKoz
        ? "KOZ BREACH"
        : isColor
          ? "COLOR FAIL"
          : "COVERAGE FAIL";

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Conformal Coating & Color
          </span>
        </div>
        <span className="rounded bg-violet-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-violet-400 border border-violet-800/50">
          {code}
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Inspection Card */}
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
                {isKoz
                  ? "Keep-Out Zone Check"
                  : isColor
                    ? "CIE Lab Color Match"
                    : "UV Tracer Coverage"}
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
              {statusBadge}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">
              {isKoz ? "Prohibited Coating Detected:" : "Coating Coverage:"}
            </span>
            <span className="font-mono text-xl font-black text-violet-300">
              {props.hasProcessed ? `${props.coveragePct.toFixed(1)}%` : "--"}
            </span>
          </div>

          {isColor ? (
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs text-slate-400 font-medium">Color Distance (&Delta;E):</span>
              <span className="font-mono text-sm font-bold text-cyan-300">
                {props.hasProcessed ? `${props.deltaE.toFixed(1)}` : "--"}
              </span>
            </div>
          ) : (
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs text-slate-400 font-medium">Uncoated Voids / Pinholes:</span>
              <span className="font-mono text-sm font-bold text-slate-200">
                {props.hasProcessed ? `${props.uncoatedVoidCount} voids` : "--"}
              </span>
            </div>
          )}

          {props.hasProcessed && (
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300">
              <span className="text-slate-400">Mean Color:</span>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-slate-600"
                  style={{
                    backgroundColor: `rgb(${props.meanRgb.r}, ${props.meanRgb.g}, ${props.meanRgb.b})`,
                  }}
                />
                <span>
                  L*={props.meanLab.l.toFixed(0)} a*={props.meanLab.a.toFixed(0)} b*=
                  {props.meanLab.b.toFixed(0)}
                </span>
              </div>
            </div>
          )}

          {!props.hasProcessed ? (
            <div className="mt-2 rounded bg-black/40 p-2 text-[10px] text-amber-300 font-mono">
              Position coating ROI and click &quot;Process Rule&quot; to inspect UV fluorescence and
              CIE Lab color.
            </div>
          ) : (
            <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400 border-t border-[#212832] pt-1">
              <span>
                {isKoz
                  ? "Allowed Breach: <= 2.0%"
                  : isColor
                    ? `Target: ΔE <= ${props.maxDeltaE}`
                    : `Target: >= ${props.minCoveragePct}% coverage`}
              </span>
              <span>Status: {props.isPass ? "PASS" : "FAIL"}</span>
            </div>
          )}
        </div>

        {/* 2. Inspection Mode Selection */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Inspection Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "uv-fluorescence", label: "UV Glow" },
              { id: "cie-lab-color", label: "CIE Color" },
              { id: "keep-out-zone", label: "Keep-Out" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => props.onInspectionModeChange(m.id as CoatingInspectionModeType)}
                className={`rounded border p-1.5 text-center text-xs font-bold uppercase transition-all ${
                  props.inspectionMode === m.id
                    ? "border-violet-400 bg-violet-950/50 text-violet-200 shadow-[0_0_8px_rgba(139,92,246,0.2)]"
                    : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. UV Tracer Channel (for UV and KOZ) */}
        {!isColor && (
          <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              UV Tracer Fluorescent Band
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "uv-blue", label: "UV Blue" },
                { id: "uv-green", label: "UV Green" },
                { id: "luminance", label: "Broadband" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => props.onUvChannelChange(c.id as UvTracerChannelType)}
                  className={`rounded border p-1.5 text-center text-xs font-bold uppercase transition-all ${
                    props.uvChannel === c.id
                      ? "border-violet-400 bg-violet-950/50 text-violet-200 shadow-[0_0_8px_rgba(139,92,246,0.2)]"
                      : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Threshold & Limits */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-3">
          {!isColor ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-300">Fluorescence Glow Threshold</span>
                <span className="font-mono font-bold text-violet-400">
                  {props.fluorescenceThreshold}
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={240}
                step={5}
                value={props.fluorescenceThreshold}
                onChange={(e) => props.onFluorescenceThresholdChange(Number(e.target.value))}
                className="w-full accent-violet-400 cursor-pointer"
              />
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-300">Max Allowed &Delta;E</span>
                <span className="font-mono font-bold text-violet-400">
                  {props.maxDeltaE.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={25}
                step={0.5}
                value={props.maxDeltaE}
                onChange={(e) => props.onMaxDeltaEChange(Number(e.target.value))}
                className="w-full accent-violet-400 cursor-pointer"
              />
            </div>
          )}

          {!isKoz && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-300">Minimum Coverage</span>
                <span className="font-mono font-bold text-emerald-400">
                  {props.minCoveragePct}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={props.minCoveragePct}
                onChange={(e) => props.onMinCoveragePctChange(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          )}

          {!isColor && !isKoz && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-300">Max Allowed Pinholes/Voids</span>
                <span className="font-mono font-bold text-amber-400">
                  {props.maxAllowedVoids} voids
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={props.maxAllowedVoids}
                onChange={(e) => props.onMaxAllowedVoidsChange(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Action Footer with 2 Primary Buttons: Process & Apply/OK */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-[#212832] bg-[#121720] p-3">
        <div className="flex items-center gap-2">
          {/* Button 1: Process */}
          <button
            type="button"
            onClick={props.onProcess}
            className="flex flex-1 items-center justify-center gap-2 rounded border border-violet-500/70 bg-violet-950/60 py-2.5 text-xs font-black uppercase tracking-wider text-violet-300 shadow-md transition-all hover:bg-violet-900/80 hover:text-white active:scale-[0.98]"
          >
            <Play size={14} className="fill-violet-400 text-violet-400" />
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
