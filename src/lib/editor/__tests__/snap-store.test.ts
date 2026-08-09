/**
 * Snap store: alignment tolerance action.
 *
 * The tolerance is user-tunable via `setSnapAlignTolerance` (see Plan 81
 * step 5). It is validated (finite, > 0), clamped to
 * [MIN_ALIGN_TOLERANCE_PX, MAX_ALIGN_TOLERANCE_PX] and rounded. Invalid
 * values are rejected without mutating state.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetSnapStoreForTests,
  getSnapState,
  setSnapAlignTolerance,
  setSnapDebug,
  setSnapShowGuides,
} from "@/lib/editor/snap-store";
import {
  DEFAULT_ALIGN_TOLERANCE_PX,
  MAX_ALIGN_TOLERANCE_PX,
  MIN_ALIGN_TOLERANCE_PX,
} from "@/lib/editor/snap";

afterEach(() => {
  __resetSnapStoreForTests();
  vi.restoreAllMocks();
});

describe("setSnapAlignTolerance", () => {
  it("defaults to DEFAULT_ALIGN_TOLERANCE_PX before any writes", () => {
    expect(getSnapState().alignTolerancePx).toBe(DEFAULT_ALIGN_TOLERANCE_PX);
  });

  it("accepts a valid value and rounds it", () => {
    setSnapAlignTolerance(12.6);
    expect(getSnapState().alignTolerancePx).toBe(13);
  });

  it("clamps above the max", () => {
    setSnapAlignTolerance(MAX_ALIGN_TOLERANCE_PX + 100);
    expect(getSnapState().alignTolerancePx).toBe(MAX_ALIGN_TOLERANCE_PX);
  });

  it("clamps below the min", () => {
    setSnapAlignTolerance(0.1);
    expect(getSnapState().alignTolerancePx).toBe(MIN_ALIGN_TOLERANCE_PX);
  });

  it("rejects non-finite / non-positive values without mutating state", () => {
    setSnapAlignTolerance(10);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    setSnapAlignTolerance(Number.NaN);
    setSnapAlignTolerance(-3);
    setSnapAlignTolerance(0);
    expect(getSnapState().alignTolerancePx).toBe(10);
    expect(warn).toHaveBeenCalledTimes(3);
  });
});

describe("setSnapDebug", () => {
  it("defaults to false and toggles on/off", () => {
    expect(getSnapState().debug).toBe(false);
    setSnapDebug(true);
    expect(getSnapState().debug).toBe(true);
    setSnapDebug(false);
    expect(getSnapState().debug).toBe(false);
  });
});

describe("setSnapShowGuides", () => {
  it("defaults to true and toggles on/off", () => {
    expect(getSnapState().showGuides).toBe(true);
    setSnapShowGuides(false);
    expect(getSnapState().showGuides).toBe(false);
    setSnapShowGuides(true);
    expect(getSnapState().showGuides).toBe(true);
  });
});
