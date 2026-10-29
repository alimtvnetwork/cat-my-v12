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
      className="fixed bottom-3.5 left-1/2 z-[10030] -translate-x-1/2 flex w-[92vw] max-w-xl flex-col gap-1.5 rounded-xl border border-white/[0.12] bg-[#090d14]/95 p-2.5 text-xs text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-2xl animate-in fade-in"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-500/25">
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
              className="shrink-0 flex cursor-pointer items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-100 active:scale-95 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
            >
              <Compass className="h-3 w-3 text-emerald-400" />
              <span>Take Over</span>
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isPaused ? (
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-500/40 animate-pulse">
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
            aria-label="Previous Step"
            className="flex cursor-pointer items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-slate-200 transition-all hover:border-white/[0.2] hover:bg-white/[0.08] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            <SkipBack className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            title={isPaused ? "Resume Simulation" : "Pause Simulation"}
            aria-label={isPaused ? "Resume Simulation" : "Pause Simulation"}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 font-semibold transition-all active:scale-95",
              isPaused
                ? "border border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                : "border border-cyan-400/60 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]",
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
            aria-label="Next Step"
            className="flex cursor-pointer items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-slate-200 transition-all hover:border-white/[0.2] hover:bg-white/[0.08] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            <span className="hidden sm:inline">Next</span>
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-300">
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
          </label>

          <button
            type="button"
            onClick={onStop}
            title="Exit Simulation"
            aria-label="Exit Simulation"
            className="flex cursor-pointer items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-semibold text-rose-300 transition-all hover:border-rose-400 hover:bg-rose-500/20 hover:text-rose-100 active:scale-95"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
