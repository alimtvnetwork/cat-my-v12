// Plan 78 slice 3 (I-SU-05): export/import round-trip and rejection paths.
import { describe, it, expect } from "vitest";
import { exportCameraLibraryJson, importCameraLibraryJson } from "../io";
import { makeDefaultCameraSetting, type CameraLibrary } from "../model";

describe("camera library io", () => {
  it("round-trips a valid library", () => {
    const lib: CameraLibrary = {
      entries: [
        makeDefaultCameraSetting(1),
        { ...makeDefaultCameraSetting(2), id: "b", name: "B" },
      ],
    };
    const json = exportCameraLibraryJson(lib);
    const r = importCameraLibraryJson(json);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.entries.map((e) => e.id)).toEqual(lib.entries.map((e) => e.id));
  });

  it("rejects invalid JSON", () => {
    const r = importCameraLibraryJson("{not json");
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errors[0].path).toBe("$");
  });

  it("rejects wrong envelope kind", () => {
    const r = importCameraLibraryJson(JSON.stringify({ kind: "other", version: 1, entries: [] }));
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errors[0].path).toBe("kind");
  });

  it("rejects unsupported version", () => {
    const r = importCameraLibraryJson(
      JSON.stringify({ kind: "ca.camera.library", version: 2, entries: [] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errors[0].path).toBe("version");
  });

  it("rejects non-array entries", () => {
    const r = importCameraLibraryJson(
      JSON.stringify({ kind: "ca.camera.library", version: 1, entries: {} }),
    );
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errors[0].path).toBe("entries");
  });

  it("reports per-entry validation errors with indexed paths", () => {
    const bad = { ...makeDefaultCameraSetting(1), name: "" };
    const r = importCameraLibraryJson(
      JSON.stringify({ kind: "ca.camera.library", version: 1, entries: [bad] }),
    );
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.errors[0].path.startsWith("entries[0].")).toBe(true);
  });
});
