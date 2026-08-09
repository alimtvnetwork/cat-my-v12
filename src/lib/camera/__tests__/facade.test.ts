// Plan 79 step 15. CameraSetting facade wrap tests.
// Uses a stub storage via the underlying store; falls back to sync helpers
// where a browser is unavailable.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeCameraFacade, __setCameraFacadeForTests } from "../facade";
import { CAMERA_LIBRARY_STORAGE_KEY, makeDefaultCameraSetting, type CameraSetting } from "../model";

function stubWindow() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  // @ts-expect-error test-only
  globalThis.window = { localStorage };

  return { store, localStorage };
}

function clearWindow() {
  // @ts-expect-error test-only
  delete globalThis.window;
}

function cam(id: string, extra: Partial<CameraSetting> = {}): CameraSetting {
  const base = makeDefaultCameraSetting(1_700_000_000_000);

  return { ...base, id, name: id.toUpperCase(), ...extra };
}

beforeEach(() => {
  __setCameraFacadeForTests(null);
  stubWindow();
});
afterEach(() => {
  clearWindow();
});

describe("CameraFacade wrap", () => {
  it("saves + lists via the underlying store", () => {
    const f = makeCameraFacade();
    const r = f.save(cam("a"));
    expect(r.ok).toBe(true);
    expect(f.list().map((c) => c.id)).toContain("a");
  });

  it("rejects invalid entries with validation errors", () => {
    const f = makeCameraFacade();
    const bad = cam("a", { name: "" });
    const r = f.save(bad);
    expect(r.ok).toBe(false);
    if (r.ok === false && r.kind === "validation") {
      expect(r.errors.length).toBeGreaterThan(0);
    } else {
      throw new Error("expected validation failure");
    }
  });

  it("blocks removal when referrers exist", () => {
    const f = makeCameraFacade();
    f.save(cam("a"));
    f.setReferrerResolver(() => ["p-1"]);
    const r = f.remove("a");
    expect(r.ok).toBe(false);
    if (r.ok === false && r.kind === "referenced") {
      expect(r.projects).toEqual(["p-1"]);
    } else {
      throw new Error("expected referenced failure");
    }
  });

  it("removes when no referrers", () => {
    const f = makeCameraFacade();
    f.save(cam("a"));
    f.setReferrerResolver(() => []);
    const r = f.remove("a");
    expect(r.ok).toBe(true);
    expect(f.get("a")).toBeNull();
  });

  it("notifies subscribers on save", () => {
    const f = makeCameraFacade();
    let n = 0;
    const off = f.subscribe(() => (n += 1));
    f.save(cam("a"));
    expect(n).toBeGreaterThanOrEqual(1);
    off();
  });

  it("subscribe unsubscribe stops notifications", () => {
    const f = makeCameraFacade();
    let n = 0;
    const off = f.subscribe(() => (n += 1));
    off();
    f.save(cam("a"));
    expect(n).toBe(0);
  });
});

describe("CameraFacade round-trip parity", () => {
  it("keeps existing localStorage key stable", () => {
    expect(CAMERA_LIBRARY_STORAGE_KEY).toBe("ca.camera.library.v1");
  });
});
