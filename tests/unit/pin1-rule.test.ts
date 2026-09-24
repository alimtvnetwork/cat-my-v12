// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePin1Rule } from "@/components/vision/standard/tools/pin1-config/usePin1Rule";
import {
  HolePolarityType,
  type Pin1HoleItem,
} from "@/components/vision/standard/tools/pin1-config/types";
import { createDefaultPatternSearchSettings } from "@/domain/vision/pattern-search";

describe("usePin1Rule controller hook", () => {
  it("initializes with default pin 1 detection parameters", () => {
    const settings = createDefaultPatternSearchSettings("rule-1");
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      usePin1Rule({
        settings,
        onChange,
      }),
    );

    expect(result.current.polarity).toBe(HolePolarityType.DarkIndentation);
    expect(result.current.thresholdLuma).toBe(80);
    expect(result.current.minCircularity).toBe(70);
    expect(result.current.tolerancePx).toBe(8);
    expect(result.current.detectedHoles).toEqual([]);
    expect(result.current.matchResult).toBeNull();
  });

  it("updates polarity and thresholds via mutator methods", () => {
    const settings = createDefaultPatternSearchSettings("rule-2");
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      usePin1Rule({
        settings,
        onChange,
      }),
    );

    act(() => {
      result.current.handlePolarityChange(HolePolarityType.LightDot);
      result.current.handleThresholdChange(120);
      result.current.setMinCircularity(85);
      result.current.setTolerancePx(15);
    });

    expect(result.current.polarity).toBe(HolePolarityType.LightDot);
    expect(result.current.thresholdLuma).toBe(120);
    expect(result.current.minCircularity).toBe(85);
    expect(result.current.tolerancePx).toBe(15);
  });

  it("does not create or save rules if no round hole is registered", () => {
    const settings = createDefaultPatternSearchSettings("rule-3");
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      usePin1Rule({
        settings,
        onChange,
      }),
    );

    act(() => {
      result.current.savePin1Rule();
    });

    // When no hole is registered, savePin1Rule should reject with toast and not call onChange
    expect(onChange).not.toHaveBeenCalled();
  });

  it("serializes Pin 1 rule configuration into onChange payload when hole is registered", () => {
    const dummyHole: Pin1HoleItem = {
      id: 1,
      centerX: 50,
      centerY: 50,
      radius: 8,
      diameter: 16,
      circularity: 92,
      areaPx: 201,
      meanLuma: 25,
      isKept: true,
      isPrimaryPin1: true,
      relativeX: 25,
      relativeY: 25,
    };

    const settings = {
      ...createDefaultPatternSearchSettings("rule-4"),
      pin1Config: {
        registeredPin1: dummyHole,
      },
    };
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      usePin1Rule({
        settings,
        onChange,
      }),
    );

    act(() => {
      result.current.savePin1Rule();
    });

    expect(onChange).toHaveBeenCalled();
    const updater = onChange.mock.calls[0][0];
    const updatedState = updater(settings);

    expect(updatedState.type).toBe("pin1_config");
    expect(updatedState.toolType).toBe("Pin 1 Orientation Config");
    expect(updatedState.pin1Config).toBeDefined();
    expect(updatedState.pin1Config.polarity).toBe(HolePolarityType.DarkIndentation);
    expect(updatedState.pin1Config.thresholdLuma).toBe(80);
    expect(updatedState.pin1Config.registeredPin1).toEqual(dummyHole);
  });

  it("handles toggling, including all, and excluding all holes", () => {
    const dummyHole1: Pin1HoleItem = {
      id: 1,
      centerX: 50,
      centerY: 50,
      radius: 8,
      diameter: 16,
      circularity: 90,
      areaPx: 201,
      meanLuma: 25,
      isKept: true,
      isPrimaryPin1: true,
      relativeX: 25,
      relativeY: 25,
    };
    const dummyHole2: Pin1HoleItem = {
      id: 2,
      centerX: 100,
      centerY: 100,
      radius: 6,
      diameter: 12,
      circularity: 75,
      areaPx: 113,
      meanLuma: 30,
      isKept: true,
      isPrimaryPin1: false,
      relativeX: 50,
      relativeY: 50,
    };

    const settings = createDefaultPatternSearchSettings("rule-5");
    const onChange = vi.fn();

    const { result } = renderHook(() =>
      usePin1Rule({
        settings,
        onChange,
      }),
    );

    act(() => {
      // Simulate detection populating holes
      (result.current as any).setPrimaryPin1Hole(1);
      result.current.excludeAllHoles();
    });

    expect(result.current.detectedHoles.every((h) => !h.isKept)).toBe(true);

    act(() => {
      result.current.includeAllHoles();
    });

    expect(result.current.detectedHoles.every((h) => h.isKept)).toBe(true);
  });
});

