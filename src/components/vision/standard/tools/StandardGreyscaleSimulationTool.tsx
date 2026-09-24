import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Gauge,
  Film,
} from "lucide-react";
import { CarrierTapeResultPanel } from "./pattern-matching/carrier-tape-simulation/CarrierTapeResultPanel";
import { CarrierTapeSimulationCanvas } from "./pattern-matching/carrier-tape-simulation/CarrierTapeSimulationCanvas";
import { useCarrierTapeSimulation } from "./pattern-matching/carrier-tape-simulation/useCarrierTapeSimulation";
import type { PatternMatchingRuleProps } from "./pattern-matching/types";

export function StandardGreyscaleSimulationTool(
  props: PatternMatchingRuleProps,
): React.JSX.Element {
  const carrierSimulation = useCarrierTapeSimulation({
    initialMarginTolerancePx: 8,
    initialAngleToleranceDeg: 10.0,
    initialMinMatchPercent: 80,
    initialGreyscaleLevel: 170,
  });

  const [hasOverlays, setHasOverlays] = useState(true);

  const handleApply = () => {
    props.onOk?.();
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-std-chrome text-ca-ink font-sans select-none">
      <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
        {/* Dedicated Simulation Header */}
        <header className="flex h-11 shrink-0 flex-wrap items-center justify-between border-b border-ca-border bg-ca-panel-2 px-3 py-1.5 text-xs font-sans">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Film className="h-4 w-4 text-amber-400" />
              <span>Greyscle simulation</span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/30">
                Carrier Tape (3 Pockets)
              </span>
            </div>

            <div className="h-4 w-px bg-ca-border" />

            {/* Playback Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={carrierSimulation.togglePlaying}
                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold shadow-sm transition-all ${
                  carrierSimulation.isPlaying
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {carrierSimulation.isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Start Run</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={carrierSimulation.prevFrame}
                className="inline-flex items-center rounded border border-ca-border bg-ca-panel p-1 text-ca-ink hover:bg-ca-bg"
                title="Previous Frame"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <span className="font-mono text-xs text-ca-ink px-1.5 font-bold">
                Frame {carrierSimulation.currentFrame.frameNumber} / 15
              </span>

              <button
                type="button"
                onClick={carrierSimulation.nextFrame}
                className="inline-flex items-center rounded border border-ca-border bg-ca-panel p-1 text-ca-ink hover:bg-ca-bg"
                title="Next Frame"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={carrierSimulation.resetSimulation}
                className="inline-flex items-center rounded border border-ca-border bg-ca-panel p-1 text-ca-ink hover:bg-ca-bg ml-1"
                title="Reset to Frame 1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Mode Selector */}
            <div className="flex items-center rounded border border-ca-border bg-ca-bg p-0.5 text-[11px] font-mono">
              <Gauge className="h-3 w-3 text-ca-ink-muted ml-1.5 mr-1" />
              {(["slow", "normal", "fast"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => carrierSimulation.changeSpeedMode(mode)}
                  className={`rounded px-1.5 py-0.5 capitalize transition-all ${
                    carrierSimulation.speedMode === mode
                      ? "bg-ca-select text-white font-bold"
                      : "text-ca-ink-muted hover:text-ca-ink"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Overlay toggle */}
            <button
              type="button"
              onClick={() => setHasOverlays((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${
                hasOverlays
                  ? "border-ca-select bg-ca-select/10 text-ca-select font-semibold"
                  : "border-ca-border bg-ca-panel text-ca-ink-muted"
              }`}
            >
              {hasOverlays ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span>{hasOverlays ? "Overlays ON" : "Overlays OFF"}</span>
            </button>
          </div>
        </header>

        {/* Main Canvas + Result Panel Grid */}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px]">
          <CarrierTapeSimulationCanvas
            frame={carrierSimulation.currentFrame}
            isAnalyzing={carrierSimulation.isAnalyzing}
            hasOverlays={hasOverlays}
            tolerances={{
              marginTolerancePx: carrierSimulation.marginTolerancePx,
              angleToleranceDeg: carrierSimulation.angleToleranceDeg,
              minMatchPercent: carrierSimulation.minMatchPercent,
              greyscaleLevel: carrierSimulation.greyscaleLevel,
            }}
            onResultsAnalyzed={carrierSimulation.handleFrameResultsAnalyzed}
          />

          <div className="flex flex-col h-full border-l border-ca-border bg-ca-panel-2 p-2.5 overflow-y-auto gap-3">
            <CarrierTapeResultPanel simulation={carrierSimulation} />
          </div>
        </div>

        {/* Footer */}
        <footer className="flex h-10 shrink-0 items-center justify-between border-t border-ca-border bg-ca-panel-2 px-3 text-xs">
          <div className="flex items-center gap-2 font-mono text-[11px] text-ca-ink-muted">
            <span>Status: {carrierSimulation.isPlaying ? "SIMULATING BATCH" : "READY / PAUSED"}</span>
            <span>&bull;</span>
            <span>Yield: {carrierSimulation.stats.yieldPercent}%</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={props.onCancel}
              className="rounded border border-ca-border bg-ca-panel px-3 py-1 font-semibold text-ca-ink hover:bg-ca-bg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded bg-ca-select px-4 py-1 font-semibold text-white hover:bg-ca-select/90 shadow-sm"
            >
              Apply & Close
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
