import React, { useState } from "react";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { MultiRulePipelineGuide } from "./MultiRulePipelineGuide";
import type { CarrierTapeFrame, PocketInspectionResult } from "./types";
import type { useCarrierTapeSimulation } from "./useCarrierTapeSimulation";

export interface CarrierTapeResultPanelProps {
  simulation: ReturnType<typeof useCarrierTapeSimulation>;
}

export function CarrierTapeResultPanel(
  props: CarrierTapeResultPanelProps,
): React.JSX.Element {
  const {
    isPlaying,
    currentFrameIndex,
    currentFrame,
    evaluatedFrames,
    speedMode,
    marginTolerancePx,
    angleToleranceDeg,
    minMatchPercent,
    stats,
    startSimulation,
    stopSimulation,
    togglePlaying,
    nextFrame,
    prevFrame,
    jumpToFrame,
    resetSimulation,
    changeSpeedMode,
    setMarginTolerancePx,
    setAngleToleranceDeg,
    setMinMatchPercent,
  } = props.simulation;

  const [hasGuideOpen, setHasGuideOpen] = useState<boolean>(false);

  return (
    <div className="flex h-full flex-col font-sans select-none text-xs gap-3">
      {/* 1. Playback & Step Toolbar */}
      <div className="rounded border border-ca-border bg-ca-panel p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-ca-border pb-1.5 font-semibold text-ca-ink">
          <div className="flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span>Camera Pocket Clicks Inspection</span>
          </div>
          <span className="font-mono text-[11px] text-cyan-300 font-bold">
            Frame #{currentFrameIndex + 1} / 15
          </span>
        </div>

        {/* Real Computer Vision Badge */}
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="inline-flex items-center gap-1 rounded bg-cyan-950/40 px-2 py-0.5 text-cyan-300 border border-cyan-800/60 font-semibold">
            <Zap className="h-3 w-3 text-cyan-400 animate-pulse" />
            Real Computer Vision Active (Pixel-Level)
          </span>
          <span className="text-ca-ink-muted">15 Discrete Snapshots</span>
        </div>

        {/* Frame Description */}
        <div className="rounded bg-ca-panel-2 p-2 border border-ca-border text-[11px] font-mono text-ca-ink-muted">
          <span className="text-ca-ink font-semibold">Active Cycle: </span>
          <span>{currentFrame.description}</span>
        </div>

        {/* Primary Controls: Start/Stop, Step, Reset */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={togglePlaying}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded py-1.5 font-bold transition-all shadow-sm cursor-pointer ${
              isPlaying
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30"
                : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? "Pause Inspection" : "Start Inspection"}</span>
          </button>

          <button
            type="button"
            onClick={prevFrame}
            className="rounded border border-ca-border bg-ca-panel-2 px-2 py-1.5 text-ca-ink hover:bg-ca-bg transition-colors"
            title="Previous Frame"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={nextFrame}
            className="rounded border border-ca-border bg-ca-panel-2 px-2 py-1.5 text-ca-ink hover:bg-ca-bg transition-colors"
            title="Next Frame"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={resetSimulation}
            className="rounded border border-ca-border bg-ca-panel-2 px-2 py-1.5 text-ca-ink-muted hover:text-ca-danger hover:bg-ca-bg transition-colors"
            title="Restart from Frame 1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Speed toggle */}
        <div className="flex items-center justify-between text-[11px] text-ca-ink-muted pt-1">
          <span>Inspection Pace:</span>
          <div className="flex items-center gap-1">
            {(
              [
                { mode: "slow", label: "Slow (3s)" },
                { mode: "normal", label: "Normal (2s)" },
                { mode: "fast", label: "Fast (1.2s)" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.mode}
                type="button"
                onClick={() => changeSpeedMode(opt.mode)}
                className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors cursor-pointer ${
                  speedMode === opt.mode
                    ? "bg-ca-select text-white font-bold"
                    : "border border-ca-border bg-ca-panel-2 text-ca-ink-muted hover:text-ca-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Three Pocket Inspection Result Cards */}
      <div className="space-y-2">
        <div className="font-semibold text-ca-ink text-xs uppercase tracking-wider px-1">
          Current Frame Results (3 Pockets)
        </div>

        {currentFrame.results.map((res, idx) => (
          <PocketResultCard
            key={idx}
            pocketIndex={idx}
            result={res}
          />
        ))}
      </div>

      {/* 3. Tolerance Tuning Card */}
      <div className="rounded border border-ca-border bg-ca-panel p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-ca-border pb-1 font-semibold text-ca-ink">
          <div className="flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-ca-select" />
            <span>Inspection Tolerances</span>
          </div>
          <span className="font-mono text-[10px] text-ca-ink-muted">Chained Rules</span>
        </div>

        {/* Angle Tolerance Slider (0-10 deg) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-ca-ink">Angle Tolerance (Rule 1: Pin 1):</span>
            <span className="font-mono font-bold text-amber-300">&plusmn;{angleToleranceDeg.toFixed(1)}&deg;</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={angleToleranceDeg}
            onChange={(e) => setAngleToleranceDeg(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[10px] font-mono text-ca-ink-muted">
            <span>0&deg; (Strict)</span>
            <span>5&deg;</span>
            <span>10&deg; (Max)</span>
          </div>
        </div>

        {/* Margin Tolerance Slider (px) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-ca-ink">Margin / Pos Offset (Rule 1):</span>
            <span className="font-mono font-bold text-ca-ink">&plusmn;{marginTolerancePx} px</span>
          </div>
          <input
            type="range"
            min={2}
            max={20}
            value={marginTolerancePx}
            onChange={(e) => setMarginTolerancePx(Number(e.target.value))}
            className="w-full accent-ca-select"
          />
        </div>

        {/* Min Match % Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-ca-ink">Min Match % (Rule 2: Pattern):</span>
            <span className="font-mono font-bold text-emerald-400">{minMatchPercent}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            value={minMatchPercent}
            onChange={(e) => setMinMatchPercent(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
      </div>

      {/* 4. 15-Frame Carousel / Scrubber */}
      <div className="rounded border border-ca-border bg-ca-panel p-3 space-y-2 shadow-sm">
        <div className="flex items-center justify-between border-b border-ca-border pb-1 font-semibold text-ca-ink">
          <span>15-Frame Batch History</span>
          <span className="font-mono text-[11px] text-emerald-400 font-bold">
            Yield: {stats.yieldPercent}%
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {evaluatedFrames.map((f, i) => {
            const isCur = i === currentFrameIndex;
            const hasFail = f.results.some((r) => r.verdict === "FAIL");

            return (
              <button
                key={f.frameNumber}
                type="button"
                onClick={() => jumpToFrame(i)}
                className={`flex flex-col items-center justify-center p-1 rounded border transition-all text-[10px] font-mono ${
                  isCur
                    ? "border-cyan-400 bg-cyan-950/60 shadow-sm"
                    : hasFail
                    ? "border-rose-900/40 bg-rose-950/20 hover:bg-rose-950/40"
                    : "border-ca-border bg-ca-panel-2 hover:bg-ca-bg"
                }`}
              >
                <span className={`font-bold ${isCur ? "text-cyan-300" : "text-ca-ink-muted"}`}>
                  #{f.frameNumber}
                </span>
                <div className="flex gap-0.5 mt-0.5">
                  {f.results.map((r, pIdx) => (
                    <span
                      key={pIdx}
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        r.verdict === "EMPTY"
                          ? "bg-slate-500"
                          : r.verdict === "PASS"
                          ? "bg-emerald-400"
                          : "bg-rose-500"
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono text-ca-ink-muted pt-1 border-t border-ca-border/60">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            <span>Empty</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Pass</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Fail</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-amber-400 font-bold">{stats.rule2SkippedCount}</span>
            <span>Cycles Saved</span>
          </div>
        </div>
      </div>

      {/* 5. Multi-Rule Pipeline Guide Toggle */}
      <button
        type="button"
        onClick={() => setHasGuideOpen((prev) => !prev)}
        className="rounded border border-ca-border bg-ca-panel p-2 flex items-center justify-between text-ca-ink font-semibold hover:bg-ca-bg transition-colors"
      >
        <span className="flex items-center gap-1.5 text-cyan-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Multi-Rule Chaining Guide</span>
        </span>
        <span className="font-mono text-[10px] text-ca-ink-muted">
          {hasGuideOpen ? "Hide" : "Show"}
        </span>
      </button>

      {hasGuideOpen && <MultiRulePipelineGuide />}
    </div>
  );
}

function PocketResultCard(props: {
  pocketIndex: number;
  result: PocketInspectionResult;
}): React.JSX.Element {
  const { pocketIndex, result } = props;
  const isPass = result.verdict === "PASS";
  const isFail = result.verdict === "FAIL";
  const isEmpty = result.verdict === "EMPTY";

  return (
    <div
      className={`rounded-lg border p-2.5 transition-all ${
        isEmpty
          ? "border-slate-700/60 bg-slate-900/30 text-slate-300"
          : isPass
          ? "border-emerald-600/50 bg-emerald-950/20 text-emerald-200"
          : "border-rose-600/60 bg-rose-950/30 text-rose-200"
      }`}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-current/20">
        <span className="font-bold text-xs uppercase tracking-wide">
          Pocket #{pocketIndex + 1}
        </span>

        <span
          className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase shadow-sm ${
            isEmpty
              ? "bg-slate-700 text-slate-200"
              : isPass
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {result.verdict}
        </span>
      </div>

      <div className="pt-1.5 space-y-1.5 text-[11px]">
        {isEmpty ? (
          <div className="font-mono text-ca-ink-muted">
            Cavity empty &bull; No chip package detected &bull; Cavity floor verified
          </div>
        ) : (
          <>
            {/* Rule 1: Pin 1 Orientation Rule */}
            <div className="rounded bg-ca-panel-2 p-1.5 border border-ca-border/60">
              <div className="flex items-center justify-between font-mono text-[10.5px]">
                <span className="text-ca-ink font-semibold">Rule 1: Pin 1 Orientation Rule</span>
                <span
                  className={`font-bold ${
                    result.rule1Pin1?.isPass ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {result.rule1Pin1?.isPass ? "PASS" : "FAILED"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-ca-ink-muted pt-0.5">
                <span>
                  {result.rule1Pin1?.hasPin1Found
                    ? `Offset: \u0394${result.rule1Pin1.offsetPx.toFixed(1)}px (Tol \u00B1${result.rule1Pin1.tolerancePx}px)`
                    : "Missing Pin 1 dimple"}
                </span>
                <span
                  className={
                    result.rule1Pin1 &&
                    Math.abs(result.rule1Pin1.angleDeg) > result.rule1Pin1.angleToleranceDeg
                      ? "text-rose-400 font-bold"
                      : "text-ca-ink-muted"
                  }
                >
                  Rot: {result.rule1Pin1?.angleDeg !== undefined && result.rule1Pin1.angleDeg > 0 ? "+" : ""}
                  {result.rule1Pin1?.angleDeg?.toFixed(1) ?? "0.0"}&deg; (Tol &plusmn;{result.rule1Pin1?.angleToleranceDeg !== undefined ? result.rule1Pin1.angleToleranceDeg.toFixed(1) : "10.0"}&deg;)
                </span>
              </div>
            </div>

            {/* Rule 2: greyscale-pattern-match-24-box */}
            <div className="rounded bg-ca-panel-2 p-1.5 border border-ca-border/60">
              <div className="flex items-center justify-between font-mono text-[10.5px]">
                <span className="text-ca-ink font-semibold">Rule 2: greyscale-pattern-match-24-box</span>
                <span
                  className={`font-bold ${
                    result.isRule2Skipped
                      ? "text-amber-400"
                      : result.rule2Pattern?.isPass
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {result.isRule2Skipped
                    ? "SKIPPED"
                    : result.rule2Pattern?.isPass
                    ? "PASS"
                    : "FAILED"}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-ca-ink-muted pt-0.5">
                {result.isRule2Skipped ? (
                  <span className="text-amber-300">
                    &bull; Short-circuited: Aborted by Pin 1 Failure (0/24 evaluated)
                  </span>
                ) : (
                  <>
                    <span>
                      Boxes: {result.rule2Pattern?.matchedCount ?? 0} / 24 matched
                    </span>
                    <span className="font-bold text-ca-ink">
                      Score: {result.rule2Pattern?.score ?? 0}% (Min: {result.rule2Pattern?.minMatchPercent ?? 80}%)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Failure Detail */}
            {isFail && (
              <div className="rounded bg-rose-950/60 p-1.5 border border-rose-800 text-[10px] text-rose-300 font-mono">
                <span className="font-bold">Failure: </span>
                <span>{result.failureReason}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
