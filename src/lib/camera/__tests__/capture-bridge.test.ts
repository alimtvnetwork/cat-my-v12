// @vitest-environment jsdom
// Contract tests for the merge/precedence rules between persisted camera
// controls (Settings > Camera, saved in localStorage) and per-shot
// overrides passed on the CaptureRequest. Only the pure helpers are
// exercised here so the tests stay independent of fetch / the vendor
// worker.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCaptureRequest,
  CAMERA_CONTROLS_STORAGE_KEY,
  readPersistedCameraControls,
  type CaptureRequest,
} from "../capture-bridge";

function seedPersistedControls(value: unknown): void {
  window.localStorage.setItem(CAMERA_CONTROLS_STORAGE_KEY, JSON.stringify(value));
}

describe("capture-bridge: persisted controls + per-shot overrides", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("readPersistedCameraControls", () => {
    it("returns an empty object when no preset is stored", () => {
      expect(readPersistedCameraControls()).toEqual({});
    });

    it("returns an empty object when the stored JSON is malformed", () => {
      window.localStorage.setItem(CAMERA_CONTROLS_STORAGE_KEY, "{not-json");
      expect(readPersistedCameraControls()).toEqual({});
    });

    it("reads every known control field", () => {
      seedPersistedControls({
        povId: "top",
        brightness: 40,
        contrast: 55,
        exposure: 12,
        gain: 3,
        enhance: 1,
        saturation: 20,
      });
      expect(readPersistedCameraControls()).toEqual({
        povId: "top",
        brightness: 40,
        contrast: 55,
        exposure: 12,
        gain: 3,
        enhance: 1,
        saturation: 20,
      });
    });

    it("drops fields with the wrong type instead of returning them as NaN or strings", () => {
      seedPersistedControls({
        povId: 42, // wrong type
        brightness: "40", // wrong type
        contrast: 55,
        exposure: null,
      });
      expect(readPersistedCameraControls()).toEqual({ contrast: 55 });
    });

    it("reads from a custom storage key when provided", () => {
      const key = "ca.settings.camera.controls.staging";
      window.localStorage.setItem(key, JSON.stringify({ povId: "side", exposure: 8 }));
      expect(readPersistedCameraControls(key)).toEqual({
        povId: "side",
        exposure: 8,
      });
      // The default key must not leak the staging preset.
      expect(readPersistedCameraControls()).toEqual({});
    });
  });

  describe("buildCaptureRequest precedence", () => {
    it("returns the persisted preset when no overrides are supplied", () => {
      seedPersistedControls({
        povId: "top",
        brightness: 40,
        contrast: 55,
        exposure: 12,
        gain: 3,
      });
      expect(buildCaptureRequest()).toEqual({
        povId: "top",
        brightness: 40,
        contrast: 55,
        exposure: 12,
        gain: 3,
      });
    });

    it("returns overrides as-is when nothing is persisted", () => {
      const overrides: CaptureRequest = { brightness: 10, gain: 2 };
      expect(buildCaptureRequest(overrides)).toEqual({
        brightness: 10,
        gain: 2,
      });
    });

    it("overrides win field-by-field over the persisted preset", () => {
      seedPersistedControls({
        povId: "top",
        brightness: 40,
        contrast: 55,
        exposure: 12,
        gain: 3,
      });
      const merged = buildCaptureRequest({ brightness: 99, exposure: 5 });
      expect(merged).toEqual({
        povId: "top",
        brightness: 99, // overridden
        contrast: 55, // preset
        exposure: 5, // overridden
        gain: 3, // preset
      });
    });

    it("keeps the persisted value for fields the caller does not override", () => {
      seedPersistedControls({ brightness: 40, contrast: 55 });
      // Only povId is overridden; brightness/contrast fall through.
      expect(buildCaptureRequest({ povId: "side" })).toEqual({
        povId: "side",
        brightness: 40,
        contrast: 55,
      });
    });

    it("treats an explicit override of 0 as a real value, not a fallback trigger", () => {
      // Regression: naive `??` chains can flip explicit-zero back to the
      // preset. Spread-based merge must keep the zero.
      seedPersistedControls({ brightness: 40, gain: 3 });
      expect(buildCaptureRequest({ brightness: 0, gain: 0 })).toEqual({
        brightness: 0,
        gain: 0,
      });
    });

    it("does not mutate the caller's overrides object", () => {
      seedPersistedControls({ brightness: 40 });
      const overrides: CaptureRequest = { exposure: 7 };
      const snapshot = { ...overrides };
      buildCaptureRequest(overrides);
      expect(overrides).toEqual(snapshot);
    });

    it("does not mutate the persisted preset in localStorage", () => {
      const preset = { brightness: 40, contrast: 55 };
      seedPersistedControls(preset);
      buildCaptureRequest({ brightness: 99 });
      // Re-read: the persisted preset must still be exactly what we wrote.
      const raw = window.localStorage.getItem(CAMERA_CONTROLS_STORAGE_KEY);
      expect(raw && JSON.parse(raw)).toEqual(preset);
    });

    it("honors the custom storage key end-to-end", () => {
      const key = "ca.settings.camera.controls.staging";
      window.localStorage.setItem(key, JSON.stringify({ brightness: 10, contrast: 20 }));
      // Default key is empty, so without the custom key the merge would
      // return only the overrides.
      expect(buildCaptureRequest({ contrast: 99 })).toEqual({ contrast: 99 });
      // Custom key: preset is applied first, override wins on contrast.
      expect(buildCaptureRequest({ contrast: 99 }, key)).toEqual({
        brightness: 10,
        contrast: 99,
      });
    });

    it("merges every known control field with the documented precedence", () => {
      seedPersistedControls({
        povId: "top",
        brightness: 40,
        contrast: 55,
        exposure: 12,
        gain: 3,
        enhance: 1,
        saturation: 20,
      });
      const overrides: CaptureRequest = {
        povId: "side",
        brightness: 99,
        contrast: 42,
        exposure: 7,
        gain: 8,
        enhance: 2,
        saturation: 30,
      };
      // Every field in the merged request must equal the override.
      expect(buildCaptureRequest(overrides)).toEqual(overrides);
    });
  });
});
