import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Compass,
  Crosshair,
  Target,
} from "lucide-react";
import {
  Pin1JudgmentStatusType,
  type Pin1HoleItem,
  type Pin1MatchResult,
} from "./types";

export interface Pin1ResultCardProps {
  matchResult: Pin1MatchResult | null;
  registeredPin1: Pin1HoleItem | null;
  tolerancePx: number;
}

export function Pin1ResultCard(props: Pin1ResultCardProps): React.JSX.Element {
  const res = props.matchResult;
  const isPass = res?.isPass ?? false;
  const active = res?.activeHole ?? null;
  const reg = props.registeredPin1;

  return (
    <div className="flex flex-col rounded border border-ca-border bg-ca-panel p-3 shadow-md space-y-3 text-xs font-sans select-none">
      {/* 1. Primary Verdict Banner */}
      <div
        className={`flex items-center justify-between rounded p-2.5 border transition-colors ${
          isPass
            ? "border-emerald-600/50 bg-emerald-950/40 text-emerald-300"
            : res?.status === Pin1JudgmentStatusType.Misoriented
              ? "border-amber-600/50 bg-amber-950/40 text-amber-300"
              : "border-rose-600/50 bg-rose-950/40 text-rose-300"
        }`}
      >
        <div className="flex items-center gap-2">
          {isPass ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <div>
            <div className="font-bold tracking-wide uppercase text-sm">
              {isPass
                ? "PIN 1 VERIFIED (PASS)"
                : res?.status === Pin1JudgmentStatusType.Misoriented
                  ? "MISORIENTED (FAIL)"
                  : "PIN 1 MISSING"}
            </div>
            <div className="text-[10px] opacity-80">
              {isPass
                ? "Pin 1 dimple aligns with registered reference rule"
                : res?.status === Pin1JudgmentStatusType.Misoriented
                  ? `Position offset Δ=${res.deltaDistance}px exceeds ±${props.tolerancePx}px limit`
                  : "No circular index dimple found satisfying criteria"}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 pl-2">
          <div className="font-mono text-base font-extrabold">
            {res && res.score > 0 ? `${res.score}%` : "--"}
          </div>
          <div className="text-[9px] uppercase tracking-wider opacity-75">Circularity</div>
        </div>
      </div>

      {/* 2. Measured Geometry vs Rule Reference */}
      <div className="rounded bg-ca-panel-2 p-2.5 border border-ca-border space-y-2 text-[11px]">
        <div className="flex items-center justify-between border-b border-ca-border pb-1 font-semibold uppercase text-ca-ink-muted text-[10px]">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3 text-cyan-400" />
            <span>Rule Target vs Measured Position</span>
          </span>
          <span className="font-mono text-ca-ink">
            Tol: ±{props.tolerancePx}px
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="rounded border border-ca-border/60 bg-ca-panel/80 p-1.5">
            <span className="text-[10px] text-ca-ink-muted block uppercase">Registered Pin 1</span>
            <span className="text-ca-ink font-semibold">
              {reg ? `(${reg.centerX}, ${reg.centerY})` : "Not registered"}
            </span>
            <span className="text-[10px] text-cyan-400 block">
              {reg ? `R=${reg.radius}px | ${reg.circularity}%` : ""}
            </span>
          </div>

          <div className="rounded border border-ca-border/60 bg-ca-panel/80 p-1.5">
            <span className="text-[10px] text-ca-ink-muted block uppercase">Measured Hole</span>
            <span className={active ? "text-ca-ink font-semibold" : "text-rose-400"}>
              {active ? `(${active.centerX}, ${active.centerY})` : "Not detected"}
            </span>
            <span className="text-[10px] text-emerald-400 block">
              {active ? `R=${active.radius}px | ${active.circularity}%` : ""}
            </span>
          </div>
        </div>

        {/* Alignment Deviation Details */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <div className="rounded bg-ca-panel/60 p-1.5 border border-ca-border/40">
            <span className="text-[10px] text-ca-ink-muted block uppercase">Offset Delta</span>
            <div className="flex items-center justify-between font-mono">
              <span className={`font-bold ${isPass ? "text-emerald-400" : "text-rose-400"}`}>
                {res ? `Δ=${res.deltaDistance} px` : "--"}
              </span>
              <span className="text-[10px] text-ca-ink-muted">
                {res ? `(ΔX:${res.deltaX}, ΔY:${res.deltaY})` : ""}
              </span>
            </div>
          </div>

          <div className="rounded bg-ca-panel/60 p-1.5 border border-ca-border/40">
            <span className="text-[10px] text-ca-ink-muted block uppercase">Latency</span>
            <div className="flex items-center gap-1 font-mono text-ca-ink-muted">
              <Clock className="h-3 w-3 text-cyan-400" />
              <span>{res ? `${res.executionTimeMs} ms` : "--"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Downstream Inspection Status */}
      <div className="rounded border border-ca-border/60 bg-ca-panel-2/70 p-2 text-[11px] flex items-center gap-2">
        <Compass className={`h-4 w-4 shrink-0 ${isPass ? "text-emerald-400" : "text-amber-400"}`} />
        <span className="text-ca-ink-muted">
          {isPass
            ? "Pin 1 confirmed in position. Downstream inspection rules (OCR, Defect, Dimensions) will execute."
            : "Pin 1 misoriented or missing. Downstream inspection chain halted."}
        </span>
      </div>
    </div>
  );
}
