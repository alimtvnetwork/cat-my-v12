import React from "react";
import { Play, Pause, SkipBack, SkipForward, Square, Clock, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SimulationPlayerBarProps {
  readonly stepIndex: number;
  readonly totalSteps: number;
  readonly stepTitle: string;
  readonly isPaused: boolean;
  readonly dwellTimeSec: number;
  readonly elapsedSec: number;
  readonly currentStepTotalSec: number;
  readonly hasPreviousStep: boolean;
  readonly hasNextStep: boolean;
  readonly onTogglePause: () => void;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly onStop: () => void;
  readonly onTakeOver?: () => void;
  readonly onChangeDwellTime: (sec: number) => void;
}

export function SimulationPlayerBar({
  stepIndex,
  totalSteps,
  stepTitle,
  isPaused,
  dwellTimeSec,
  elapsedSec,
  currentStepTotalSec,
  hasPreviousStep,
  hasNextStep,
  onTogglePause,
  onNext,
  onPrevious,
  onStop,
  onTakeOver,
  onChangeDwellTime,
}: SimulationPlayerBarProps): React.JSX.Element {
  const safeTotalSec = Math.max(0.1, currentStepTotalSec);
  const progressPercent = Math.min(100, Math.max(0, (elapsedSec / safeTotalSec) * 100));
  const remainingSec = Math.max(0, safeTotalSec - elapsedSec);

  return (
    <div
      data-tour="simulation-player-hud"
      style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
      className="fixed bottom-3.5 left-1/2 z-[10030] -translate-x-1/2 flex w-[92vw] max-w-xl flex-col gap-1.5 rounded-xl border border-cyan-500/40 bg-[#0c1017]/95 p-2.5 text-xs text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.65),0_0_24px_rgba(34,211,238,0.18)] backdrop-blur-md animate-in fade-in"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 rounded bg-cyan-950/80 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30">
            Step {stepIndex + 1} / {totalSteps}
          </span>
          <span className="truncate font-medium text-slate-200" title={stepTitle}>
            {stepTitle}
          </span>
          {onTakeOver ? (
            <button
              type="button"
              onClick={onTakeOver}
              title="Take over and freely explore this screen"
              aria-label="Take over simulation and freely explore this screen"
              className="shrink-0 flex items-center gap-1 rounded border border-emerald-500/50 bg-emerald-950/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-900 hover:text-emerald-100 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
            >
              <Compass className="h-3 w-3 text-emerald-400" />
              <span>Take Over</span>
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isPaused ? (
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/40 animate-pulse">
              PAUSED
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">
              <span className="font-semibold text-cyan-300 font-mono">
                {remainingSec.toFixed(1)}s
              </span>{" "}
              remaining
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-100",
            isPaused
              ? "bg-amber-400"
              : "bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]",
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Controls and Dwell Slider */}
      <div className="flex items-center justify-between gap-3 pt-0.5">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPreviousStep}
            title="Previous Step"
            className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SkipBack className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            title={isPaused ? "Resume Simulation" : "Pause Simulation"}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1 font-semibold transition",
              isPaused
                ? "border border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                : "border border-cyan-400/60 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.2)]",
            )}
          >
            {isPaused ? (
              <Play className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Pause className="h-3.5 w-3.5 fill-current" />
            )}
            <span>{isPaused ? "Resume" : "Pause"}</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={!hasNextStep}
            title="Next Step"
            className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Next</span>
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="whitespace-nowrap">
              Stay: <strong className="text-cyan-300 font-mono">{dwellTimeSec}s</strong>
            </span>
            <input
              type="range"
              min={3}
              max={20}
              step={1}
              value={dwellTimeSec}
              onChange={(e) => onChangeDwellTime(Number(e.target.value))}
              aria-label="Screen dwell duration in seconds"
              className="h-1.5 w-20 sm:w-24 cursor-pointer rounded-lg bg-slate-700 accent-cyan-400"
            />
          </div>

          <button
            type="button"
            onClick={onStop}
            title="Exit Simulation"
            className="flex items-center gap-1 rounded border border-rose-500/40 bg-rose-950/60 px-2.5 py-1 font-semibold text-rose-300 transition hover:border-rose-400 hover:bg-rose-900/80 hover:text-rose-100"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
