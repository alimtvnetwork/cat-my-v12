import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { build15FrameSequence } from "./carrier-tape-assets";
import { evaluatePocket } from "./carrier-tape-evaluator";
import type {
  CarrierTapeFrame,
  CarrierTapeSimulationStats,
  MultiRuleToleranceParams,
  PocketInspectionResult,
} from "./types";

export type SimulationSpeedMode = "slow" | "normal" | "fast";

/**
 * Two-phase playback timing per frame:
 *   Phase 1 (raw):      show unprocessed camera image (isAnalyzing = false)
 *   Phase 2 (analyzed): show inspection overlays       (isAnalyzing = true)
 *
 * Base durations at "slow" speed (1× scale):
 *   rawMs      = 1500
 *   analyzedMs = 1500
 *   total      = 3000
 */
interface PhaseTimingConfig {
  rawMs: number;
  analyzedMs: number;
}

const PHASE_TIMING: Record<SimulationSpeedMode, PhaseTimingConfig> = {
  slow:   { rawMs: 1500, analyzedMs: 1500 },
  normal: { rawMs: 1000, analyzedMs: 1000 },
  fast:   { rawMs: 600,  analyzedMs: 600  },
};

export interface UseCarrierTapeSimulationOptions {
  initialAngleToleranceDeg?: number;
  initialMarginTolerancePx?: number;
  initialMinMatchPercent?: number;
  initialGreyscaleLevel?: number;
}

export function useCarrierTapeSimulation(options: UseCarrierTapeSimulationOptions = {}) {
  // Manual start requirement: starts idle (isPlaying = false)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);

  // Two-phase display: raw camera image vs analyzed with overlays.
  // Defaults to true when idle so manual inspection and slider adjustments are immediately visible.
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(true);

  // Speed: default to slow so user can comfortably inspect
  const [speedMode, setSpeedMode] = useState<SimulationSpeedMode>("slow");

  // Live real pixel analysis cache from canvas
  const [liveAnalyzedMap, setLiveAnalyzedMap] = useState<
    Record<number, [PocketInspectionResult, PocketInspectionResult, PocketInspectionResult]>
  >({});

  // Tolerances
  const [marginTolerancePx, setMarginTolerancePxRaw] = useState<number>(
    options.initialMarginTolerancePx ?? 8,
  );
  const [angleToleranceDeg, setAngleToleranceDegRaw] = useState<number>(
    options.initialAngleToleranceDeg ?? 10.0,
  );
  const [minMatchPercent, setMinMatchPercentRaw] = useState<number>(
    options.initialMinMatchPercent ?? 80,
  );
  const [greyscaleLevel, setGreyscaleLevelRaw] = useState<number>(
    options.initialGreyscaleLevel ?? 170,
  );

  // Clearing cache on slider change forces immediate recalculation across all 15 frames
  const setMarginTolerancePx = useCallback((val: number | ((prev: number) => number)) => {
    setMarginTolerancePxRaw(val);
    setLiveAnalyzedMap({});
  }, []);

  const setAngleToleranceDeg = useCallback((val: number | ((prev: number) => number)) => {
    setAngleToleranceDegRaw(val);
    setLiveAnalyzedMap({});
  }, []);

  const setMinMatchPercent = useCallback((val: number | ((prev: number) => number)) => {
    setMinMatchPercentRaw(val);
    setLiveAnalyzedMap({});
  }, []);

  const setGreyscaleLevel = useCallback((val: number | ((prev: number) => number)) => {
    setGreyscaleLevelRaw(val);
    setLiveAnalyzedMap({});
  }, []);

  const rawFramesRef = useRef<CarrierTapeFrame[]>(build15FrameSequence());

  const toleranceParams = useMemo<MultiRuleToleranceParams>(() => ({
    marginTolerancePx,
    angleToleranceDeg,
    minMatchPercent,
    greyscaleLevel,
  }), [marginTolerancePx, angleToleranceDeg, minMatchPercent, greyscaleLevel]);

  // Evaluated frames with active tolerances
  const evaluatedFrames = useMemo<CarrierTapeFrame[]>(() => {
    return rawFramesRef.current.map((raw, idx) => {
      // Use live real computer vision results from canvas if available
      const liveRes = liveAnalyzedMap[idx];

      const results = liveRes ?? (raw.pockets.map((p) =>
        evaluatePocket(p, toleranceParams),
      ) as [PocketInspectionResult, PocketInspectionResult, PocketInspectionResult]);

      return {
        ...raw,
        results,
      };
    });
  }, [toleranceParams, liveAnalyzedMap]);

  const currentFrame = evaluatedFrames[currentFrameIndex];

  // Update speed when mode changes
  const changeSpeedMode = useCallback((mode: SimulationSpeedMode) => {
    setSpeedMode(mode);
  }, []);

  // Two-phase playback timer loop:
  //   Phase 1 → show raw image for rawMs
  //   Phase 2 → show analyzed image for analyzedMs → advance frame
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timing = PHASE_TIMING[speedMode];

    if (!isAnalyzing) {
      // Phase 1: raw image displayed → after rawMs, switch to analyzed
      const timer = setTimeout(() => {
        setIsAnalyzing(true);
      }, timing.rawMs);

      return () => clearTimeout(timer);
    }

    // Phase 2: analyzed image displayed → after analyzedMs, advance frame
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
      setCurrentFrameIndex((prev) => (prev + 1) % 15);
    }, timing.analyzedMs);

    return () => clearTimeout(timer);
  }, [isPlaying, speedMode, isAnalyzing, currentFrameIndex]);

  const startSimulation = useCallback(() => {
    setIsAnalyzing(false);
    setIsPlaying(true);
  }, []);

  const stopSimulation = useCallback(() => {
    setIsPlaying(false);
    setIsAnalyzing(true);
  }, []);

  const togglePlaying = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev) {
        setIsAnalyzing(false);
      } else {
        setIsAnalyzing(true);
      }

      return !prev;
    });
  }, []);

  const nextFrame = useCallback(() => {
    setIsAnalyzing(true);
    setCurrentFrameIndex((prev) => (prev + 1) % 15);
  }, []);

  const prevFrame = useCallback(() => {
    setIsAnalyzing(true);
    setCurrentFrameIndex((prev) => (prev - 1 + 15) % 15);
  }, []);

  const jumpToFrame = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(14, index));
    setIsAnalyzing(true);
    setCurrentFrameIndex(clamped);
  }, []);

  const resetSimulation = useCallback(() => {
    setIsPlaying(false);
    setIsAnalyzing(true);
    setCurrentFrameIndex(0);
  }, []);

  const handleFrameResultsAnalyzed = useCallback(
    (results: [PocketInspectionResult, PocketInspectionResult, PocketInspectionResult]) => {
      setLiveAnalyzedMap((prev) => ({
        ...prev,
        [currentFrameIndex]: results,
      }));
    },
    [currentFrameIndex],
  );

  // Aggregate Batch Statistics across all 15 frames
  const stats = useMemo<CarrierTapeSimulationStats>(() => {
    let emptyCount = 0;
    let deviceCount = 0;
    let passCount = 0;
    let failCount = 0;
    let rule1FailCount = 0;
    let rule2FailCount = 0;
    let skippedCount = 0;

    for (const f of evaluatedFrames) {
      for (const res of f.results) {
        if (res.verdict === "EMPTY") {
          emptyCount += 1;
        } else if (res.verdict === "PASS") {
          deviceCount += 1;
          passCount += 1;
        } else if (res.verdict === "FAIL") {
          deviceCount += 1;
          failCount += 1;

          if (res.failedRuleIndex === 1) {
            rule1FailCount += 1;
          } else if (res.failedRuleIndex === 2) {
            rule2FailCount += 1;
          }

          if (res.isRule2Skipped) {
            skippedCount += 1;
          }
        }
      }
    }

    const yieldPercent =
      deviceCount > 0 ? Math.round((passCount / deviceCount) * 1000) / 10 : 100;

    return {
      totalFrames: 15,
      inspectedFrames: evaluatedFrames.length,
      totalPockets: 45,
      emptyPockets: emptyCount,
      devicePockets: deviceCount,
      passedPockets: passCount,
      failedPockets: failCount,
      rule1FailedPockets: rule1FailCount,
      rule2FailedPockets: rule2FailCount,
      rule2SkippedCount: skippedCount,
      yieldPercent,
    };
  }, [evaluatedFrames]);

  return {
    isPlaying,
    isAnalyzing,
    currentFrameIndex,
    currentFrame,
    evaluatedFrames,
    speedMode,
    marginTolerancePx,
    angleToleranceDeg,
    minMatchPercent,
    greyscaleLevel,
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
    setGreyscaleLevel,
    handleFrameResultsAnalyzed,
  };
}
