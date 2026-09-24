// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  CHIP_DEFECTIVE_DATA_URL,
  CHIP_GOOD_DATA_URL,
  CHIP_STM8_DATA_URL,
} from "@/components/vision/standard/tools/pattern-matching/chip-assets";
import {
  evaluateChipPixelsReal,
  getAtmelReferenceBoxes,
  GOLDEN_ATMEL_LUMAS,
} from "@/components/vision/standard/tools/pattern-matching/atmel-chip-boxes";
import {
  createDefaultSearchRegion,
  normalizeImageToStandardCanvas,
  STANDARD_CANVAS_HEIGHT,
  STANDARD_CANVAS_WIDTH,
  STANDARD_IMAGE_MAX_SIZE,
  usePatternMatchingRule,
} from "@/components/vision/standard/tools/pattern-matching/usePatternMatchingRule";
import {
  DeviceChipType,
  TOTAL_BATCH_DEVICES,
  TOTAL_STM8_COUNT,
  useConveyorSimulation,
} from "@/components/vision/standard/tools/pattern-matching/useConveyorSimulation";

describe("conveyor simulation chip assets", () => {
  it("exports valid embedded base64 data URLs for good Atmel and transparent STM8 chips", () => {
    expect(CHIP_GOOD_DATA_URL.startsWith("data:image/png;base64,")).toBe(true);
    expect(CHIP_DEFECTIVE_DATA_URL.startsWith("data:image/png;base64,")).toBe(true);
    expect(CHIP_STM8_DATA_URL.startsWith("data:image/png;base64,")).toBe(true);
    expect(CHIP_GOOD_DATA_URL.length).toBeGreaterThan(10000);
    expect(CHIP_STM8_DATA_URL.length).toBeGreaterThan(5000);
  });
});

describe("evaluateChipPixelsReal genuine vision evaluation", () => {
  it("evaluates a synthetic pixel buffer matching golden lumas with 100% PASS", () => {
    // Construct a synthetic 100x106 image where box pixels match golden lumas
    const rgba = new Uint8ClampedArray(100 * 106 * 4);
    rgba.fill(45); // Fill background with neutral chip body gray (lum ~ 45)

    const result = evaluateChipPixelsReal({
      targetRgba: rgba,
      targetWidth: 100,
      targetHeight: 106,
      toleranceLuma: 25,
      minMatchPercent: 70,
    });

    expect(result.totalCount).toBe(24);
    expect(result.matchedCount).toBeGreaterThan(18);
  });

  it("evaluates a bright white mismatched buffer (representing STM8 text) as FAIL", () => {
    // Saturated white pixels (> 220) where golden expects dark laser etching (30-60)
    const rgba = new Uint8ClampedArray(100 * 106 * 4);
    rgba.fill(240);

    const result = evaluateChipPixelsReal({
      targetRgba: rgba,
      targetWidth: 100,
      targetHeight: 106,
      toleranceLuma: 18,
      minMatchPercent: 80,
    });

    expect(result.isPass).toBe(false);
    expect(result.score).toBeLessThan(10);
    expect(result.matchedCount).toBeLessThan(5);
  });

  it("evaluates an empty pocket (hasDevice === false) as 0.0% match with all 24 boxes failed", () => {
    const result = evaluateChipPixelsReal({
      targetRgba: new Uint8ClampedArray(0),
      targetWidth: 0,
      targetHeight: 0,
      hasDevice: false,
    });

    expect(result.isPass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.matchedCount).toBe(0);
    expect(result.totalCount).toBe(24);
    expect(result.boxResults.length).toBe(24);
    expect(result.boxResults.every((b) => !b.isMatched)).toBe(true);
  });

  it("accurately scales and positions all 24 box coordinates to searchRegion", () => {
    const rgba = new Uint8ClampedArray(800 * 600 * 4);
    rgba.fill(45);

    const searchRegion = {
      x: 200,
      y: 150,
      width: 200,
      height: 200,
    };

    const result = evaluateChipPixelsReal({
      targetRgba: rgba,
      targetWidth: 800,
      targetHeight: 600,
      searchRegion,
      toleranceLuma: 25,
      minMatchPercent: 70,
    });

    expect(result.totalCount).toBe(24);
    expect(result.boxResults.length).toBe(24);

    // Box 1 (M: relX 21.0, relY 34.0, width 7.2, height 9.5)
    // Scale is 200/100 = 2, 200/100 = 2
    const box1 = result.boxResults[0];
    expect(box1.boxNumber).toBe(1);
    expect(box1.matchedX).toBe(200 + Math.round(21.0 * 2)); // 242
    expect(box1.matchedY).toBe(150 + Math.round(34.0 * 2)); // 218
    expect(box1.width).toBe(Math.round(7.2 * 2)); // 14
    expect(box1.height).toBe(Math.round(9.5 * 2)); // 19

    // All boxes must be strictly within searchRegion bounds
    for (const box of result.boxResults) {
      expect(box.matchedX).toBeGreaterThanOrEqual(searchRegion.x);
      expect(box.matchedY).toBeGreaterThanOrEqual(searchRegion.y);
      expect(box.matchedX + box.width).toBeLessThanOrEqual(
        searchRegion.x + searchRegion.width,
      );
      expect(box.matchedY + box.height).toBeLessThanOrEqual(
        searchRegion.y + searchRegion.height,
      );
    }
  });

  it("getAtmelReferenceBoxes accurately applies scale and origin", () => {
    const boxes = getAtmelReferenceBoxes(100, 50, 2, 2);
    expect(boxes.length).toBe(24);

    const box1 = boxes[0];
    expect(box1.boxNumber).toBe(1);
    expect(box1.x).toBe(100 + Math.round(21.0 * 2)); // 142
    expect(box1.y).toBe(50 + Math.round(34.0 * 2)); // 118
    expect(box1.width).toBe(14);
    expect(box1.height).toBe(19);
  });

  it("createDefaultSearchRegion correctly bounds small chip sprites vs large board images", () => {
    // Chip sprite (140x148) gets full image
    const smallRegion = createDefaultSearchRegion(140, 148);
    expect(smallRegion).toEqual({ x: 0, y: 0, width: 140, height: 148 });

    // Large camera/file frame (1024x576) gets centered proportional region
    const largeRegion = createDefaultSearchRegion(1024, 576);
    expect(largeRegion.x).toBeGreaterThan(0);
    expect(largeRegion.y).toBeGreaterThan(0);
    expect(largeRegion.x + largeRegion.width).toBeLessThanOrEqual(1024);
    expect(largeRegion.y + largeRegion.height).toBeLessThanOrEqual(576);
  });
});

describe("useConveyorSimulation hook (15-Device Batch)", () => {
  it("initializes with 15 empty device slots and 5 STM8 devices with Device #2 guaranteed as STM8", () => {
    const { result } = renderHook(() =>
      useConveyorSimulation({
        referenceBoxes: [],
        greyscaleLevel: 170,
        tolerancePx: 8,
        minMatchPercent: 100,
      }),
    );

    expect(result.current.isSimulating).toBe(true);
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.deviceResults.length).toBe(TOTAL_BATCH_DEVICES);
    expect(result.current.deviceResults.length).toBe(15);
    expect(result.current.inspectedCount).toBe(0);
    expect(result.current.passedCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
    expect(result.current.isBatchComplete).toBe(false);

    // Device #2 (index 1) is guaranteed to be the new STM8 device
    expect(result.current.deviceChipTypes[1]).toBe("stm8");
    // Device #3 (index 2) is guaranteed to be an empty pocket
    expect(result.current.deviceChipTypes[2]).toBe("empty");

    const stm8Count = result.current.deviceChipTypes.filter((t) => t === "stm8").length;
    const emptyCount = result.current.deviceChipTypes.filter((t) => t === "empty").length;
    const atmelCount = result.current.deviceChipTypes.filter((t) => t === "atmel").length;
    expect(stm8Count).toBe(5);
    expect(emptyCount).toBe(2);
    expect(atmelCount).toBe(8);

    act(() => {
      result.current.toggleSimulating();
    });
    expect(result.current.isSimulating).toBe(false);

    act(() => {
      result.current.setIsSimulating(true);
    });
    expect(result.current.isSimulating).toBe(true);

    act(() => {
      result.current.setIsSimulating(false);
    });
    expect(result.current.isSimulating).toBe(false);

    act(() => {
      result.current.togglePlaying();
    });
    expect(result.current.isPlaying).toBe(false);
  });

  it("evaluates Atmel chips as 100% Pass, STM8 as Fail, and Empty Pockets as 0% Fail", () => {
    // Deterministic batch layout: Slot 0 is Atmel, Slot 1 is STM8, Slot 2 is Empty
    const mockBatch: DeviceChipType[] = [
      "atmel", "stm8", "empty", "atmel", "stm8",
      "atmel", "empty", "atmel", "stm8", "atmel",
      "stm8", "atmel", "atmel", "stm8", "atmel",
    ];

    const { result } = renderHook(() =>
      useConveyorSimulation({
        referenceBoxes: [],
        greyscaleLevel: 170,
        tolerancePx: 8,
        minMatchPercent: 100,
        initialDeviceChipTypes: mockBatch,
      }),
    );

    // Evaluate Slot 0 (Atmel MEGA32U4 - Golden part)
    act(() => {
      result.current.executeTrueDeviceDetection(0, null);
    });

    expect(result.current.inspectedCount).toBe(1);
    expect(result.current.passedCount).toBe(1);
    expect(result.current.failedCount).toBe(0);

    const dev1 = result.current.deviceResults[0];
    expect(dev1).not.toBeNull();
    expect(dev1?.deviceNumber).toBe(1);
    expect(dev1?.chipType).toBe("atmel");
    expect(dev1?.isPass).toBe(true);
    expect(dev1?.score).toBe(100);
    expect(dev1?.matchedCount).toBe(24);
    expect(dev1?.missingBoxNumbers).toEqual([]);

    // Evaluate Slot 1 (STM8S208 - New Device, wrong part model)
    act(() => {
      result.current.executeTrueDeviceDetection(1, null);
    });

    expect(result.current.inspectedCount).toBe(2);
    expect(result.current.passedCount).toBe(1);
    expect(result.current.failedCount).toBe(1);

    const dev2 = result.current.deviceResults[1];
    expect(dev2).not.toBeNull();
    expect(dev2?.deviceNumber).toBe(2);
    expect(dev2?.chipType).toBe("stm8");
    expect(dev2?.isPass).toBe(false);
    expect(dev2?.missingBoxNumbers.length).toBe(20);
    expect(dev2?.matchedCount).toBe(4);
    expect(dev2?.score).toBe(16.7);

    // Evaluate Slot 2 (Empty Pocket - Missing component)
    act(() => {
      result.current.executeTrueDeviceDetection(2, null);
    });

    expect(result.current.inspectedCount).toBe(3);
    expect(result.current.passedCount).toBe(1);
    expect(result.current.failedCount).toBe(2);

    const dev3 = result.current.deviceResults[2];
    expect(dev3).not.toBeNull();
    expect(dev3?.deviceNumber).toBe(3);
    expect(dev3?.chipType).toBe("empty");
    expect(dev3?.isPass).toBe(false);
    expect(dev3?.score).toBe(0);
    expect(dev3?.matchedCount).toBe(0);
    expect(dev3?.missingBoxNumbers.length).toBe(24);
    expect(dev3?.chipLabel).toBe("Empty Pocket (Missing Device)");

    // Reset clears slots
    act(() => {
      result.current.resetSimulation();
    });

    expect(result.current.inspectedCount).toBe(0);
    expect(result.current.passedCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
    expect(result.current.deviceResults.every((r) => r === null)).toBe(true);
  });
});

describe("usePatternMatchingRule image inspection state", () => {
  it("initializes with empty state (source null, matchResult null, no auto-loaded sample)", () => {
    const mockOnChange = () => {};
    const { result } = renderHook(() =>
      usePatternMatchingRule({
        settings: {
          id: "T106",
          name: "Pattern Search",
        } as any,
        onChange: mockOnChange,
      }),
    );

    // Initial state MUST be completely empty until user explicitly loads an image
    expect(result.current.source).toBeNull();
    expect(result.current.matchResult).toBeNull();
  });

  it("clearing canvas resets source and matchResult to null", () => {
    let currentSettings: any = {};
    const mockOnChange = (updater: any) => {
      currentSettings = typeof updater === "function" ? updater(currentSettings) : updater;
    };

    const { result } = renderHook(() =>
      usePatternMatchingRule({
        settings: {
          id: "T106",
          name: "Pattern Search",
        } as any,
        onChange: mockOnChange,
      }),
    );

    act(() => {
      result.current.clearCanvas();
    });

    expect(result.current.source).toBeNull();
    expect(result.current.searchRegion).toBeNull();
    expect(result.current.matchResult).toBeNull();
  });
});

describe("normalizeImageToStandardCanvas (Standard Centered Inspection)", () => {
  it("normalizes arbitrary image dimensions into standardized 960x540 canvas with centered search region", async () => {
    // Mock offscreen source canvas of 1920x1080
    const mockCanvas = document.createElement("canvas");
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;

    const normalized = await normalizeImageToStandardCanvas(mockCanvas, 1920, 1080, false);

    expect(normalized.source.width).toBe(STANDARD_CANVAS_WIDTH);
    expect(normalized.source.width).toBe(960);
    expect(normalized.source.height).toBe(STANDARD_CANVAS_HEIGHT);
    expect(normalized.source.height).toBe(540);
    expect(normalized.source.rgba.length).toBe(960 * 540 * 4);

    // Search region is centered and does not exceed STANDARD_IMAGE_MAX_SIZE
    expect(normalized.searchRegion.width).toBeLessThanOrEqual(STANDARD_IMAGE_MAX_SIZE);
    expect(normalized.searchRegion.height).toBeLessThanOrEqual(STANDARD_IMAGE_MAX_SIZE);
    expect(normalized.searchRegion.x).toBeGreaterThan(0);
    expect(normalized.searchRegion.y).toBeGreaterThan(0);
    expect(normalized.searchRegion.x + normalized.searchRegion.width).toBeLessThanOrEqual(960);
    expect(normalized.searchRegion.y + normalized.searchRegion.height).toBeLessThanOrEqual(540);
  });

  it("accurately aligns search region to inner markings when isChipSample is true", async () => {
    // 140x148 chip sprite
    const mockChipCanvas = document.createElement("canvas");
    mockChipCanvas.width = 140;
    mockChipCanvas.height = 148;

    const normalized = await normalizeImageToStandardCanvas(mockChipCanvas, 140, 148, true);

    expect(normalized.source.width).toBe(960);
    expect(normalized.source.height).toBe(540);
    expect(normalized.searchRegion.width).toBeGreaterThan(100);
    expect(normalized.searchRegion.height).toBeGreaterThan(100);
    expect(normalized.searchRegion.x).toBeGreaterThan(200);
    expect(normalized.searchRegion.y).toBeGreaterThan(50);
  });
});

describe("useConveyorSimulation Two-Phase Workflow (Capture then Evaluate)", () => {
  it("executes Phase 1 sequential capture followed by Phase 2 true greyscale evaluation", () => {
    const mockBatch: DeviceChipType[] = [
      "atmel", "stm8", "empty", "atmel", "stm8",
      "atmel", "empty", "atmel", "stm8", "atmel",
      "stm8", "atmel", "atmel", "stm8", "atmel",
    ];

    const { result } = renderHook(() =>
      useConveyorSimulation({
        referenceBoxes: [],
        greyscaleLevel: 170,
        tolerancePx: 8,
        minMatchPercent: 100,
        initialDeviceChipTypes: mockBatch,
      }),
    );

    // Initial phase must be capturing
    expect(result.current.phase).toBe("capturing");
    expect(result.current.capturedCount).toBe(0);
    expect(result.current.inspectedCount).toBe(0);

    // Capture pocket #0 (Atmel)
    act(() => {
      result.current.capturePocket(0, null);
    });

    expect(result.current.capturedCount).toBe(1);
    expect(result.current.capturedFrames[0]).not.toBeNull();
    expect(result.current.capturedFrames[0]?.pocketNumber).toBe(1);
    expect(result.current.capturedFrames[0]?.chipType).toBe("atmel");
    expect(result.current.capturedFrames[0]?.thumbnailDataUrl).toBeTruthy();

    // Capture pocket #1 (STM8)
    act(() => {
      result.current.capturePocket(1, null);
    });

    expect(result.current.capturedCount).toBe(2);
    expect(result.current.capturedFrames[1]?.chipType).toBe("stm8");

    // Capture pocket #2 (Empty Pocket)
    act(() => {
      result.current.capturePocket(2, null);
    });

    expect(result.current.capturedCount).toBe(3);
    expect(result.current.capturedFrames[2]?.chipType).toBe("empty");

    // Still in Phase 1 (not completed)
    expect(result.current.phase).toBe("capturing");

    // Trigger batch evaluation (Phase 2)
    act(() => {
      result.current.evaluateAllCapturedPockets();
    });

    expect(result.current.phase).toBe("completed");
    expect(result.current.inspectedCount).toBe(15);
    expect(result.current.passedCount).toBe(8);
    expect(result.current.failedCount).toBe(7);

    // Check Device #1 (Golden Atmel)
    const res1 = result.current.deviceResults[0];
    expect(res1?.isPass).toBe(true);
    expect(res1?.score).toBe(100);
    expect(res1?.thumbnailDataUrl).toBeTruthy();

    // Check Device #2 (STM8 Defect)
    const res2 = result.current.deviceResults[1];
    expect(res2?.isPass).toBe(false);
    expect(res2?.score).toBe(16.7);
    expect(res2?.missingBoxNumbers.length).toBe(20);
    expect(res2?.thumbnailDataUrl).toBeTruthy();

    // Check Device #3 (Empty Pocket Defect)
    const res3 = result.current.deviceResults[2];
    expect(res3?.isPass).toBe(false);
    expect(res3?.score).toBe(0);
    expect(res3?.missingBoxNumbers.length).toBe(24);
    expect(res3?.chipLabel).toBe("Empty Pocket (Missing Device)");

    // Selected device is Device #2 by default so operator sees defect immediately
    expect(result.current.selectedDeviceIndex).toBe(1);
  });
});
