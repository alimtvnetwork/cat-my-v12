import React from "react";
import { Check, X, Layers, AlertOctagon, Play, Clock } from "lucide-react";

export interface BlobToolPanelProps {
  binaryThreshold: number;
  minBlobArea: number;
  maxBlobArea: number;
  minBlobCount: number;
  maxBlobCount: number;
  hasHoleFilling: boolean;
  targetPolarity: "bright" | "dark" | "both";
  detectedBlobCount: number;
  detectedBridgeCount: number;
  // Preview verdict only: undefined while no Process has run. Every
  // PASS/FAIL display in this panel is gated on hasProcessed.
  isPass: boolean | undefined;
  hasProcessed: boolean;
  actionButtonLabel?: string;
  onThresholdChange: (val: number) => void;
  onMinBlobAreaChange: (val: number) => void;
  onMaxBlobAreaChange: (val: number) => void;
  onMinBlobCountChange: (val: number) => void;
  onMaxBlobCountChange: (val: number) => void;
  onHoleFillingChange: (val: boolean) => void;
  onPolarityChange: (val: "bright" | "dark" | "both") => void;
  onProcess: () => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function BlobToolPanel(props: BlobToolPanelProps): React.JSX.Element {
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Binary Blob & Solder Bridge
          </span>
        </div>
        <span className="rounded bg-emerald-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-400 border border-emerald-800/50">
          T109
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Detection Readout */}
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
                <AlertOctagon
                  className={`h-4 w-4 ${props.isPass ? "text-emerald-400" : "text-rose-400"}`}
                />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Component & Bridge Inspection
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
                  ? "INSPECTION PASS"
                  : "BRIDGE SHORT / COUNT FAIL"}
            </span>
          </div>

          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Detected Blobs:</span>
            <span className="font-mono text-xl font-black text-cyan-300">
              {props.hasProcessed
                ? `${props.detectedBlobCount} blob${props.detectedBlobCount === 1 ? "" : "s"}`
                : "--"}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-slate-400 font-medium">Solder Bridges:</span>
            <span
              className={`font-mono text-base font-bold ${
                !props.hasProcessed
                  ? "text-slate-400"
                  : props.detectedBridgeCount === 0
                    ? "text-emerald-400"
                    : "text-rose-400"
              }`}
            >
              {props.hasProcessed
                ? `${props.detectedBridgeCount} bridge${props.detectedBridgeCount === 1 ? "" : "s"} (Limit: 0)`
                : "--"}
            </span>
          </div>

          {!props.hasProcessed ? (
            <div className="mt-2 rounded bg-black/40 p-2 text-[10px] text-amber-300 font-mono">
              Adjust binarization parameters below and click &quot;Process Rule&quot; to inspect
              components.
            </div>
          ) : (
            <div className="mt-1 flex justify-between text-[10px] font-mono text-slate-400 border-t border-[#212832] pt-1">
              <span>
                Allowed Range: {props.minBlobCount} – {props.maxBlobCount}
              </span>
              <span>Status: {props.isPass ? "ACCEPTED" : "REJECTED"}</span>
            </div>
          )}
        </div>

        {/* 2. Target Polarity */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Target Polarity
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: "bright", label: "Bright Blobs" },
              { id: "dark", label: "Dark Blobs" },
              { id: "both", label: "Both" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => props.onPolarityChange(p.id as "bright" | "dark" | "both")}
                className={`rounded border p-1.5 text-center text-xs font-bold uppercase transition-all ${
                  props.targetPolarity === p.id
                    ? "border-emerald-400 bg-emerald-950/50 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                    : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Binarization Threshold */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Binarization Threshold
            </label>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {props.binaryThreshold} / 255
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={props.binaryThreshold}
            onChange={(e) => props.onThresholdChange(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        {/* 4. Blob Area Acceptance Filter */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Blob Area Limits (px)
          </label>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Min Area:</span>
              <span className="font-mono font-bold text-slate-200">{props.minBlobArea} px</span>
            </div>
            <input
              type="range"
              min={5}
              max={1000}
              step={5}
              value={props.minBlobArea}
              onChange={(e) => props.onMinBlobAreaChange(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Max Area:</span>
              <span className="font-mono font-bold text-slate-200">
                {props.maxBlobArea.toLocaleString()} px
              </span>
            </div>
            <input
              type="range"
              min={props.minBlobArea}
              max={25000}
              step={50}
              value={props.maxBlobArea}
              onChange={(e) => props.onMaxBlobAreaChange(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>

        {/* 5. Blob Count Limits */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Component Count Limits
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[11px] text-slate-400">Min Blobs:</span>
              <input
                type="number"
                min={0}
                max={props.maxBlobCount}
                value={props.minBlobCount}
                onChange={(e) => props.onMinBlobCountChange(Number(e.target.value))}
                className="mt-1 w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1.5 font-mono text-xs text-white"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-400">Max Blobs:</span>
              <input
                type="number"
                min={props.minBlobCount}
                max={100}
                value={props.maxBlobCount}
                onChange={(e) => props.onMaxBlobCountChange(Number(e.target.value))}
                className="mt-1 w-full rounded border border-[#2d3748] bg-[#1a202c] px-2 py-1.5 font-mono text-xs text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={props.hasHoleFilling}
              onChange={(e) => props.onHoleFillingChange(e.target.checked)}
              className="accent-emerald-400 h-4 w-4"
            />
            <span className="text-xs text-slate-300">
              Enable Internal Hole Filling (Morphology)
            </span>
          </label>
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
