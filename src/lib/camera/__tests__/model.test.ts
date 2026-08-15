// Plan 78 step 2 (I-SU-05): lock the model seam. Every rule below mirrors
// spec/24-app-ui-design-system/17-camera-setup.md section 5 exactly.
import { describe, it, expect } from "vitest";
import {
  CameraSettingSchema,
  deleteCameraSetting,
  makeDefaultCameraSetting,
  upsertCameraSetting,
  validateCameraSetting,
  type CameraLibrary,
} from "../model";

function baseValid() {
  return makeDefaultCameraSetting(1_700_000_000_000);
}

describe("CameraSettingSchema", () => {
  it("accepts the default record produced by makeDefaultCameraSetting", () => {
    const r = CameraSettingSchema.safeParse(baseValid());
    expect(r.success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = validateCameraSetting({ ...baseValid(), name: "" });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errors.some((e) => e.path === "name")).toBe(true);
  });

  it.each([
    ["exposureUs below 1", { exposureUs: 0 }],
    ["exposureUs above 10_000_000", { exposureUs: 10_000_001 }],
    ["gainDb above 60", { gainDb: 61 }],
    ["gainDb below 0", { gainDb: -1 }],
    ["gamma below 0.1", { gamma: 0.05 }],
    ["gamma above 5", { gamma: 5.1 }],
    ["pockets below 1", { pockets: 0 }],
    ["fovMmW non-positive", { fovMmW: 0 }],
    ["resolutionW non-positive", { resolutionW: 0 }],
  ])("rejects %s", (_label, override) => {
    const r = validateCameraSetting({ ...baseValid(), ...override });
    expect(r.ok).toBe(false);
  });

  it("requires focusValue when focusMode is Manual", () => {
    const r = validateCameraSetting({ ...baseValid(), focusMode: "Manual", focusValue: undefined });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errors.some((e) => e.path === "focusValue")).toBe(true);
  });

  it("accepts focusValue omitted when focusMode is Auto", () => {
    const r = validateCameraSetting({ ...baseValid(), focusMode: "Auto", focusValue: undefined });
    expect(r.ok).toBe(true);
  });

  it("rejects ROI extending past resolution width", () => {
    const r = validateCameraSetting({
      ...baseValid(),
      resolutionW: 100,
      resolutionH: 100,
      roi: { x: 60, y: 0, w: 50, h: 10 },
    });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errors.some((e) => e.path === "roi.w")).toBe(true);
  });

  it("rejects ROI extending past resolution height", () => {
    const r = validateCameraSetting({
      ...baseValid(),
      resolutionW: 100,
      resolutionH: 100,
      roi: { x: 0, y: 60, w: 10, h: 50 },
    });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errors.some((e) => e.path === "roi.h")).toBe(true);
  });

  it("accepts ROI that fits exactly within resolution", () => {
    const r = validateCameraSetting({
      ...baseValid(),
      resolutionW: 100,
      resolutionH: 100,
      roi: { x: 10, y: 10, w: 90, h: 90 },
    });
    expect(r.ok).toBe(true);
  });
});

describe("upsertCameraSetting / deleteCameraSetting", () => {
  it("inserts new entry when id not present", () => {
    const lib: CameraLibrary = { entries: [] };
    const r = upsertCameraSetting(lib, baseValid());
    expect(r.errors).toEqual([]);
    expect(r.library.entries).toHaveLength(1);
  });

  it("replaces existing entry by id and preserves position", () => {
    const a = { ...baseValid(), id: "a", name: "A" };
    const b = { ...baseValid(), id: "b", name: "B" };
    const lib: CameraLibrary = { entries: [a, b] };
    const updated = { ...b, name: "B2" };
    const r = upsertCameraSetting(lib, updated);
    expect(r.library.entries.map((e) => e.id)).toEqual(["a", "b"]);
    expect(r.library.entries[1].name).toBe("B2");
  });

  it("returns validation errors without mutating library on invalid entry", () => {
    const lib: CameraLibrary = { entries: [] };
    const r = upsertCameraSetting(lib, { ...baseValid(), name: "" });
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.library).toBe(lib);
  });

  it("deleteCameraSetting removes only the matching id", () => {
    const a = { ...baseValid(), id: "a" };
    const b = { ...baseValid(), id: "b" };
    const lib: CameraLibrary = { entries: [a, b] };
    expect(deleteCameraSetting(lib, "a").entries.map((e) => e.id)).toEqual(["b"]);
    expect(deleteCameraSetting(lib, "missing").entries).toHaveLength(2);
  });
});
