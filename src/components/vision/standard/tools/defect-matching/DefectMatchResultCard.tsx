import React from "react";
import { AlertOctagon, CheckCircle2, Crosshair, HelpCircle } from "lucide-react";
import type { DefectMatchResult } from "./types";

export interface DefectMatchResultCardProps {
  matchResult: DefectMatchResult | null;
  totalElements: number;
  isMatching: boolean;
  onMatch: () => void;
}

export function DefectMatchResultCard(props: DefectMatchResultCardProps): React.JSX.Element {
  const result = props.matchResult;

  if (!result) {
    return (
      <div className="rounded border border-ca-border bg-ca-panel p-3 font-sans select-none text-xs space-y-2">
        <div className="flex items-center justify-between border-b border-ca-border pb-1.5 font-semibold text-ca-ink">
          <span>Flaw Inspection Status</span>
          <span className="font-mono text-[11px] text-ca-ink-muted">Awaiting Frame</span>
        </div>
        <div className="flex flex-col items-center justify-center py-5 text-center text-ca-ink-muted space-y-2">
          <HelpCircle className="h-7 w-7 text-ca-ink-muted/50" />
          <p className="text-[11px]">Upload a workpiece image or click Live Camera to evaluate against the defect template.</p>
        </div>
      </div>
    );
  }

  const isFlawDetected = result.hasDefect;
  const isPass = result.isPass;

  return (
    <div className="rounded border border-ca-border bg-ca-panel p-3 font-sans select-none text-xs space-y-3">
      {/* Verdict Header Banner */}
      <div
        className={`rounded-lg border p-3 flex flex-col gap-2 ${
          isFlawDetected
            ? "border-rose-600/70 bg-rose-950/40 text-rose-200"
            : "border-emerald-600/70 bg-emerald-950/40 text-emerald-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isFlawDetected ? (
              <AlertOctagon className="h-5 w-5 text-rose-400" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            )}
            <span className="font-bold text-sm tracking-wide">
              {isFlawDetected ? "DEFECT DETECTED" : "NO DEFECT (CLEAN)"}
            </span>
          </div>

          <span
            className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase shadow-sm ${
              isFlawDetected ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {isFlawDetected ? "REJECT" : "PASS"}
          </span>
        </div>

        <p className="text-[11px] leading-relaxed text-ca-ink-muted">
          {isFlawDetected
            ? `Workpiece matches the registered defect pattern (${result.score}% match \u2265 ${result.minMatchPercent}% threshold). Reject device.`
            : `Workpiece is clean (${result.score}% defect match < ${result.minMatchPercent}% threshold). Device accepted.`}
        </p>

        {/* Conveyor Action Banner */}
        <div
          className={`flex items-center justify-between rounded px-2.5 py-1 text-[11px] font-mono font-semibold ${
            isFlawDetected
              ? "bg-rose-900/50 text-rose-300 border border-rose-800"
              : "bg-emerald-900/50 text-emerald-300 border border-emerald-800"
          }`}
        >
          <span>Line Action:</span>
          <span>{isFlawDetected ? "Trigger Diverter Gate (Eject)" : "Continue Conveyor Flow"}</span>
        </div>
      </div>

      {/* Metrics Table */}
      <div className="rounded border border-ca-border bg-ca-panel-2 p-2.5 space-y-2 font-mono text-[11px]">
        <div className="font-sans font-semibold text-ca-ink text-xs border-b border-ca-border pb-1">
          Inspection Readouts
        </div>

        <div className="flex justify-between items-center text-ca-ink">
          <span className="text-ca-ink-muted">Defect Match Score:</span>
          <span className={`font-bold ${isFlawDetected ? "text-rose-400" : "text-emerald-400"}`}>
            {result.score}% (Threshold: {result.minMatchPercent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-ca-border overflow-hidden relative">
          <div
            className={`h-full transition-all duration-300 ${
              isFlawDetected ? "bg-rose-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, result.score)}%` }}
          />
        </div>

        <div className="flex justify-between text-ca-ink">
          <span className="text-ca-ink-muted">Matched Flaw Elements:</span>
          <span>
            {result.matchedCount} / {result.totalCount} features
          </span>
        </div>

        <div className="flex justify-between text-ca-ink">
          <span className="text-ca-ink-muted">Flaw Center Offset:</span>
          <span>
            \u0394X: {result.offsetX > 0 ? `+${result.offsetX}` : result.offsetX} px, \u0394Y:{" "}
            {result.offsetY > 0 ? `+${result.offsetY}` : result.offsetY} px
          </span>
        </div>

        <div className="flex justify-between text-ca-ink">
          <span className="text-ca-ink-muted">Analysis Latency:</span>
          <span>{result.executionTimeMs} ms</span>
        </div>
      </div>

      <button
        type="button"
        onClick={props.onMatch}
        disabled={props.isMatching}
        className="w-full flex items-center justify-center gap-1.5 rounded border border-ca-border bg-ca-panel-2 py-1.5 text-xs font-semibold text-ca-ink hover:bg-ca-bg transition-colors"
      >
        <Crosshair className="h-3.5 w-3.5 text-ca-select" />
        <span>Re-inspect Frame</span>
      </button>
    </div>
  );
}
