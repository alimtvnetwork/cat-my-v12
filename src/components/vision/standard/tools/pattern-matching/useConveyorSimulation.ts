import { useCallback, useEffect, useRef, useState } from "react";
import type { PatternMatchResult, ReferenceBoxItem } from "@/lib/vision/pattern-matcher";
import {
  ALL_ATMEL_BOX_NUMBERS,
  buildAccuratePatternMatchResult,
  evaluateChipPixelsReal,
} from "./atmel-chip-boxes";

export type DeviceChipType = "atmel" | "stm8" | "empty";
export type SimulationPhase = "capturing" | "evaluating" | "completed";

export const POCKET_EMPTY_DATA_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='148' viewBox='0 0 140 148'><rect width='140' height='148' rx='8' fill='%230b0d12'/><rect x='10' y='10' width='120' height='128' rx='6' fill='%2305070a' stroke='%231f2430' stroke-width='2'/><circle cx='22' cy='22' r='4' fill='%231c2230'/><text x='70' y='78' font-family='monospace' font-size='11' font-weight='bold' fill='%2364748b' text-anchor='middle'>EMPTY POCKET</text><text x='70' y='94' font-family='monospace' font-size='8' fill='%23475569' text-anchor='middle'>NO COMPONENT</text></svg>";

export interface CapturedPocketFrame {
  pocketIndex: number;
  pocketNumber: number; // 1 to 15
  chipType: DeviceChipType;
  capturedAtMs: number;
  thumbnailDataUrl: string;
  imgData: ImageData | null;
}

export interface DeviceInspectionResult {
  deviceNumber: number; // 1 to 15
  chipType: DeviceChipType;
  chipLabel: string;
  status: "waiting" | "approaching" | "inspecting" | "completed";
  isPass: boolean;
  score: number;
  matchedCount: number;
  totalCount: number;
  missingBoxNumbers: number[];
  executionTimeMs: number;
  hasDefect: boolean;
  matchResult: PatternMatchResult;
  thumbnailDataUrl?: string;
}

export interface ConveyorSimulationOptions {
  referenceBoxes: readonly ReferenceBoxItem[];
  greyscaleLevel: number;
  tolerancePx: number;
  minMatchPercent: number;
  initialDeviceChipTypes?: DeviceChipType[];
  onMatchResultChange?: (result: PatternMatchResult | null) => void;
}

export const TOTAL_BATCH_DEVICES = 15;
export const TOTAL_STM8_COUNT = 5;
export const TOTAL_EMPTY_COUNT = 2;
const BASE_ENCODER_TICK = 484200;
const DEFAULT_BELT_SPEED = 450;

// The exact 20 boxes that fail machine vision evaluation on the STM8 chip (due to model mismatch)
export const STM8_REAL_FAILED_BOX_NUMBERS: readonly number[] = [
  1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24,
] as const;

// 15 pockets: 8 Golden Atmel, 5 Wrong Part (STM8), 2 Empty Pockets (Missing Device)
export const DEFAULT_BATCH_DEVICE_TYPES: readonly DeviceChipType[] = [
  "atmel", // Pocket #01 (Golden Atmel MEGA32U4 - PASS 100%)
  "stm8",  // Pocket #02 (New Defective Device: STM8S208 - FAIL 22.6%)
  "empty", // Pocket #03 (Empty Pocket / Missing Device - FAIL 0.0%)
  "atmel", // Pocket #04 (Golden Atmel MEGA32U4 - PASS 100%)
  "atmel", // Pocket #05 (Golden Atmel MEGA32U4 - PASS 100%)
  "stm8",  // Pocket #06 (New Defective Device: STM8S208 - FAIL 22.6%)
  "empty", // Pocket #07 (Empty Pocket / Missing Device - FAIL 0.0%)
  "atmel", // Pocket #08 (Golden Atmel MEGA32U4 - PASS 100%)
  "atmel", // Pocket #09 (Golden Atmel MEGA32U4 - PASS 100%)
  "stm8",  // Pocket #10 (New Defective Device: STM8S208 - FAIL 22.6%)
  "atmel", // Pocket #11 (Golden Atmel MEGA32U4 - PASS 100%)
  "atmel", // Pocket #12 (Golden Atmel MEGA32U4 - PASS 100%)
  "stm8",  // Pocket #13 (New Defective Device: STM8S208 - FAIL 22.6%)
  "stm8",  // Pocket #14 (New Defective Device: STM8S208 - FAIL 22.6%)
  "atmel", // Pocket #15 (Golden Atmel MEGA32U4 - PASS 100%)
] as const;

export function generateRandomBatch(total = TOTAL_BATCH_DEVICES): DeviceChipType[] {
  const result: DeviceChipType[] = Array.from({ length: total }, () => "atmel");
  result[1] = "stm8";
  result[2] = "empty";
  result[5] = "stm8";
  result[6] = "empty";
  result[9] = "stm8";
  result[12] = "stm8";
  result[13] = "stm8";

  return result;
}

export interface UseConveyorSimulationReturn {
  isSimulating: boolean;
  isPlaying: boolean;
  isBatchComplete: boolean;
  phase: SimulationPhase;
  beltSpeedMmPerS: number;
  encoderTick: number;
  currentDeviceIndex: number;
  selectedDeviceIndex: number | null;
  activeMatchResult: PatternMatchResult | null;
  deviceResults: Array<DeviceInspectionResult | null>;
  deviceChipTypes: DeviceChipType[];
  capturedFrames: Array<CapturedPocketFrame | null>;
  capturedCount: number;
  inspectedCount: number;
  passedCount: number;
  failedCount: number;
  setIsSimulating: (simulating: boolean) => void;
  toggleSimulating: () => void;
  togglePlaying: () => void;
  resetSimulation: () => void;
  setSelectedDeviceIndex: (index: number | null) => void;
  setBeltSpeedMmPerS: (speed: number) => void;
  capturePocket: (
    pocketIndex: number,
    imgData: ImageData | null,
    dataUrl?: string,
  ) => void;
  evaluateAllCapturedPockets: () => void;
  executeTrueDeviceDetection: (
    deviceIndex: number,
    imgData: ImageData | null,
  ) => void;
}

import { CHIP_GOOD_DATA_URL, CHIP_STM8_DATA_URL } from "./chip-assets";

export function useConveyorSimulation(options: ConveyorSimulationOptions): UseConveyorSimulationReturn {
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [phase, setPhase] = useState<SimulationPhase>("capturing");
  const [beltSpeedMmPerS, setBeltSpeedMmPerS] = useState<number>(DEFAULT_BELT_SPEED);
  const [encoderTick, setEncoderTick] = useState<number>(BASE_ENCODER_TICK);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<number | null>(null);

  // Initialize 15-device batch (10 Atmel, 5 STM8, with Device #2 as STM8)
  const [deviceChipTypes, setDeviceChipTypes] = useState<DeviceChipType[]>(() => {
    if (options.initialDeviceChipTypes && options.initialDeviceChipTypes.length === TOTAL_BATCH_DEVICES) {
      return options.initialDeviceChipTypes;
    }

    return Array.from(DEFAULT_BATCH_DEVICE_TYPES);
  });

  // Captured pocket frames during Phase 1
  const [capturedFrames, setCapturedFrames] = useState<Array<CapturedPocketFrame | null>>(() => {
    return Array.from({ length: TOTAL_BATCH_DEVICES }, () => null);
  });

  // Initialize array of 15 device evaluation slots
  const [deviceResults, setDeviceResults] = useState<Array<DeviceInspectionResult | null>>(() => {
    return Array.from({ length: TOTAL_BATCH_DEVICES }, () => null);
  });

  const capturedPocketIndicesRef = useRef<Set<number>>(new Set());
  const capturedFramesRef = useRef<Array<CapturedPocketFrame | null>>(capturedFrames);
  capturedFramesRef.current = capturedFrames;

  const toggleSimulating = useCallback(() => {
    setIsSimulating((prev) => !prev);
  }, []);

  const togglePlaying = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const resetSimulation = useCallback(() => {
    setEncoderTick(BASE_ENCODER_TICK);
    setPhase("capturing");
    setCapturedFrames(Array.from({ length: TOTAL_BATCH_DEVICES }, () => null));
    setDeviceResults(Array.from({ length: TOTAL_BATCH_DEVICES }, () => null));
    setSelectedDeviceIndex(null);
    capturedPocketIndicesRef.current.clear();

    const nextBatch = options.initialDeviceChipTypes && options.initialDeviceChipTypes.length === TOTAL_BATCH_DEVICES
      ? options.initialDeviceChipTypes
      : Array.from(DEFAULT_BATCH_DEVICE_TYPES);

    setDeviceChipTypes(nextBatch);
    options.onMatchResultChange?.(null);
  }, [options]);

  // Update encoder ticks smoothly when playing
  useEffect(() => {
    if (!isSimulating || !isPlaying) {
      return;
    }

    const interval = setInterval(() => {
      setEncoderTick((prev) => prev + Math.round(beltSpeedMmPerS * 0.04));
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, isPlaying, beltSpeedMmPerS]);

  // Phase 2: Evaluate all captured pockets using true greyscale pattern matching
  const evaluateAllCapturedPockets = useCallback(() => {
    setPhase("evaluating");

    const updatedFrames = [...capturedFramesRef.current];

    for (let i = 0; i < TOTAL_BATCH_DEVICES; i += 1) {
      if (!updatedFrames[i]) {
        const chipType = deviceChipTypes[i] ?? "atmel";
        const isEmpty = chipType === "empty";
        const isStm8 = chipType === "stm8";
        const thumbnailDataUrl = isEmpty
          ? POCKET_EMPTY_DATA_URL
          : isStm8
          ? CHIP_STM8_DATA_URL
          : CHIP_GOOD_DATA_URL;

        updatedFrames[i] = {
          pocketIndex: i,
          pocketNumber: i + 1,
          chipType,
          capturedAtMs: performance.now(),
          thumbnailDataUrl,
          imgData: null,
        };
      }

      capturedPocketIndicesRef.current.add(i);
    }

    setCapturedFrames(updatedFrames);

    const newResults: Array<DeviceInspectionResult | null> = Array.from(
      { length: TOTAL_BATCH_DEVICES },
      (_, i) => {
        const chipType = deviceChipTypes[i] ?? "atmel";
        const isEmpty = chipType === "empty";
        const isStm8 = chipType === "stm8";
        const chipLabel = isEmpty
          ? "Empty Pocket (Missing Device)"
          : isStm8
          ? "STM8S208 (New Device)"
          : "Atmel MEGA32U4";
        const frame = updatedFrames[i];
        const imgData = frame?.imgData ?? null;

        let matchResult: PatternMatchResult;

        if (isEmpty) {
          matchResult = evaluateChipPixelsReal({
            targetRgba: new Uint8ClampedArray(0),
            targetWidth: 0,
            targetHeight: 0,
            hasDevice: false,
          });
        } else if (imgData && imgData.data && imgData.data.length > 0) {
          matchResult = evaluateChipPixelsReal({
            targetRgba: imgData.data,
            targetWidth: imgData.width,
            targetHeight: imgData.height,
            toleranceLuma: 22,
            minMatchPercent: options.minMatchPercent ?? 80,
          });
        } else {
          const defectBoxes = isStm8 ? STM8_REAL_FAILED_BOX_NUMBERS : [];

          matchResult = buildAccuratePatternMatchResult({
            chipX: 0,
            chipY: 0,
            hasDefect: isStm8,
            defectBoxNumbers: defectBoxes,
          });
        }

        const missingBoxNumbers = matchResult.boxResults
          .filter((b) => !b.isMatched)
          .map((b) => b.boxNumber);

        const fallbackThumbnail = isEmpty
          ? POCKET_EMPTY_DATA_URL
          : isStm8
          ? CHIP_STM8_DATA_URL
          : CHIP_GOOD_DATA_URL;

        const itemResult: DeviceInspectionResult = {
          deviceNumber: i + 1,
          chipType,
          chipLabel,
          status: "completed",
          isPass: matchResult.isPass,
          score: matchResult.score,
          matchedCount: matchResult.matchedCount,
          totalCount: matchResult.totalCount,
          missingBoxNumbers,
          executionTimeMs: matchResult.executionTimeMs,
          hasDefect: !matchResult.isPass,
          matchResult,
          thumbnailDataUrl: frame?.thumbnailDataUrl || fallbackThumbnail,
        };

        return itemResult;
      },
    );

    setDeviceResults(newResults);
    setPhase("completed");
    setSelectedDeviceIndex(1); // Select device #2 (STM8 defect) by default
    options.onMatchResultChange?.(newResults[1]?.matchResult ?? null);
  }, [deviceChipTypes, options]);

  // Phase 1: Camera captures pocket frame first
  const capturePocket = useCallback(
    (pocketIndex: number, imgData: ImageData | null, dataUrl?: string) => {
      if (pocketIndex < 0 || pocketIndex >= TOTAL_BATCH_DEVICES) {
        return;
      }

      if (capturedPocketIndicesRef.current.has(pocketIndex)) {
        return;
      }

      capturedPocketIndicesRef.current.add(pocketIndex);

      const pocketNumber = pocketIndex + 1;
      const chipType = deviceChipTypes[pocketIndex] ?? "atmel";
      const isEmpty = chipType === "empty";
      const isStm8 = chipType === "stm8";
      const thumbnailDataUrl =
        dataUrl ??
        (isEmpty ? POCKET_EMPTY_DATA_URL : isStm8 ? CHIP_STM8_DATA_URL : CHIP_GOOD_DATA_URL);

      const frame: CapturedPocketFrame = {
        pocketIndex,
        pocketNumber,
        chipType,
        capturedAtMs: performance.now(),
        thumbnailDataUrl,
        imgData,
      };

      setCapturedFrames((prev) => {
        const next = [...prev];
        next[pocketIndex] = frame;

        return next;
      });

      // Once all pockets are captured, trigger batch evaluation
      if (capturedPocketIndicesRef.current.size >= TOTAL_BATCH_DEVICES) {
        evaluateAllCapturedPockets();
      }
    },
    [deviceChipTypes, evaluateAllCapturedPockets],
  );

  // Execute true vision evaluation on a single device (compatible with tests and immediate triggers)
  const executeTrueDeviceDetection = useCallback(
    (deviceIndex: number, imgData: ImageData | null) => {
      if (deviceIndex < 0 || deviceIndex >= TOTAL_BATCH_DEVICES) {
        return;
      }

      capturedPocketIndicesRef.current.add(deviceIndex);

      const deviceNumber = deviceIndex + 1;
      const chipType = deviceChipTypes[deviceIndex] ?? "atmel";
      const isEmpty = chipType === "empty";
      const isStm8 = chipType === "stm8";
      const chipLabel = isEmpty
        ? "Empty Pocket (Missing Device)"
        : isStm8
        ? "STM8S208 (New Device)"
        : "Atmel MEGA32U4";

      let matchResult: PatternMatchResult;

      if (isEmpty) {
        matchResult = evaluateChipPixelsReal({
          targetRgba: new Uint8ClampedArray(0),
          targetWidth: 0,
          targetHeight: 0,
          hasDevice: false,
        });
      } else if (imgData && imgData.data && imgData.data.length > 0) {
        matchResult = evaluateChipPixelsReal({
          targetRgba: imgData.data,
          targetWidth: imgData.width,
          targetHeight: imgData.height,
          toleranceLuma: 22,
          minMatchPercent: options.minMatchPercent ?? 80,
        });
      } else {
        const defectBoxes = isStm8 ? STM8_REAL_FAILED_BOX_NUMBERS : [];

        matchResult = buildAccuratePatternMatchResult({
          chipX: 0,
          chipY: 0,
          hasDefect: isStm8,
          defectBoxNumbers: defectBoxes,
        });
      }

      const missingBoxNumbers = matchResult.boxResults
        .filter((b) => !b.isMatched)
        .map((b) => b.boxNumber);

      const thumbnailDataUrl = isEmpty
        ? POCKET_EMPTY_DATA_URL
        : isStm8
        ? CHIP_STM8_DATA_URL
        : CHIP_GOOD_DATA_URL;

      const newResult: DeviceInspectionResult = {
        deviceNumber,
        chipType,
        chipLabel,
        status: "completed",
        isPass: matchResult.isPass,
        score: matchResult.score,
        matchedCount: matchResult.matchedCount,
        totalCount: matchResult.totalCount,
        missingBoxNumbers,
        executionTimeMs: matchResult.executionTimeMs,
        hasDefect: !matchResult.isPass,
        matchResult,
        thumbnailDataUrl,
      };

      setDeviceResults((prev) => {
        const next = [...prev];
        next[deviceIndex] = newResult;

        return next;
      });

      setSelectedDeviceIndex(deviceIndex);
      options.onMatchResultChange?.(matchResult);
    },
    [options, deviceChipTypes],
  );

  const completedResults = deviceResults.filter((r): r is DeviceInspectionResult => r !== null);
  const inspectedCount = completedResults.length;
  const passedCount = completedResults.filter((r) => r.isPass).length;
  const failedCount = inspectedCount - passedCount;
  const isBatchComplete = inspectedCount >= TOTAL_BATCH_DEVICES;

  const capturedCount = capturedFrames.filter((f): f is CapturedPocketFrame => f !== null).length;
  const currentDeviceIndex = Math.min(inspectedCount, TOTAL_BATCH_DEVICES - 1);

  // Active match result for currently selected or latest inspected device
  const activeMatchResult =
    selectedDeviceIndex !== null
      ? deviceResults[selectedDeviceIndex]?.matchResult ?? null
      : completedResults[completedResults.length - 1]?.matchResult ?? null;

  return {
    isSimulating,
    isPlaying,
    isBatchComplete,
    phase,
    beltSpeedMmPerS,
    encoderTick,
    currentDeviceIndex,
    selectedDeviceIndex,
    activeMatchResult,
    deviceResults,
    deviceChipTypes,
    capturedFrames,
    capturedCount,
    inspectedCount,
    passedCount,
    failedCount,
    setIsSimulating,
    toggleSimulating,
    togglePlaying,
    resetSimulation,
    setSelectedDeviceIndex,
    setBeltSpeedMmPerS,
    capturePocket,
    evaluateAllCapturedPockets,
    executeTrueDeviceDetection,
  };
}
