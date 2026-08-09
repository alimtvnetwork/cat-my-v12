/** @vitest-environment jsdom */
// Plan 80 step 46: watchCameraDevices + openCameraStream lifecycle tests.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openCameraStream, watchCameraDevices } from "../live-capture";

function fakeTrack() {
  const listeners = new Map<string, EventListener[]>();

  return {
    stop: vi.fn(),
    kind: "video" as const,
    label: "cam",
    addEventListener: vi.fn((ev: string, l: EventListener) => {
      const arr = listeners.get(ev) ?? [];
      arr.push(l);
      listeners.set(ev, arr);
    }),
    removeEventListener: vi.fn((ev: string, l: EventListener) => {
      const arr = listeners.get(ev) ?? [];
      listeners.set(
        ev,
        arr.filter((x) => x !== l),
      );
    }),
    fire(ev: string) {
      for (const l of listeners.get(ev) ?? []) l(new Event(ev));
    },
  };
}

function makeMedia(overrides: Partial<MediaDevices> = {}): MediaDevices & {
  _fireDeviceChange: () => void;
} {
  const listeners: EventListener[] = [];
  const base = {
    getUserMedia: vi.fn(async () => ({ getTracks: () => [] }) as unknown as MediaStream),
    enumerateDevices: vi.fn(async () => [] as MediaDeviceInfo[]),
    getSupportedConstraints: () => ({}),
    ondevicechange: null as EventListener | null,
    addEventListener: vi.fn((ev: string, l: EventListener) => {
      if (ev === "devicechange") listeners.push(l);
    }),
    removeEventListener: vi.fn((ev: string, l: EventListener) => {
      if (ev === "devicechange") {
        const i = listeners.indexOf(l);
        if (i >= 0) listeners.splice(i, 1);
      }
    }),
    dispatchEvent: () => true,
    _fireDeviceChange: () => {
      for (const l of listeners) l(new Event("devicechange"));
    },
    ...overrides,
  };

  return base as unknown as MediaDevices & { _fireDeviceChange: () => void };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("watchCameraDevices", () => {
  it("emits immediately with filtered videoinput devices", async () => {
    const devices: MediaDeviceInfo[] = [
      { deviceId: "a", label: "Cam A", groupId: "g1", kind: "videoinput" } as MediaDeviceInfo,
      { deviceId: "m", label: "Mic", groupId: "g2", kind: "audioinput" } as MediaDeviceInfo,
    ];
    const md = makeMedia({ enumerateDevices: vi.fn(async () => devices) });
    const listener = vi.fn();
    const unsub = watchCameraDevices(listener, { mediaDevices: md });
    await Promise.resolve();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0]).toEqual([{ deviceId: "a", label: "Cam A", groupId: "g1" }]);
    unsub();
  });

  it("re-emits on devicechange", async () => {
    const md = makeMedia();
    const listener = vi.fn();
    const unsub = watchCameraDevices(listener, { mediaDevices: md, emitImmediately: false });
    md._fireDeviceChange();
    await Promise.resolve();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("unsubscribe removes the listener and stops emissions", async () => {
    const md = makeMedia();
    const listener = vi.fn();
    const unsub = watchCameraDevices(listener, { mediaDevices: md, emitImmediately: false });
    unsub();
    md._fireDeviceChange();
    await Promise.resolve();
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
  });

  it("no mediaDevices: returns no-op unsubscribe and warns", () => {
    const unsub = watchCameraDevices(() => {}, { mediaDevices: null });
    expect(typeof unsub).toBe("function");
    unsub();
  });
});

describe("openCameraStream", () => {
  it("returns error when mediaDevices unavailable", async () => {
    const res = await openCameraStream({ mediaDevices: null });
    expect(res.ok).toBe(false);
    if (res.ok === false) expect(res.error.code).toBe("E_CAMERA_UNSUPPORTED");
  });

  it("maps DOMException.name to typed error code", async () => {
    const err = new Error("denied") as Error & { name: string };
    err.name = "NotAllowedError";
    const md = makeMedia({
      getUserMedia: vi.fn(async () => {
        throw err;
      }),
    });
    const res = await openCameraStream({ mediaDevices: md });
    expect(res.ok).toBe(false);
    if (res.ok === false) expect(res.error.code).toBe("E_CAMERA_PERMISSION_DENIED");
  });

  it("close() stops every track exactly once and is idempotent", async () => {
    const t1 = fakeTrack();
    const t2 = fakeTrack();
    const md = makeMedia({
      getUserMedia: vi.fn(async () => ({ getTracks: () => [t1, t2] }) as unknown as MediaStream),
    });
    const res = await openCameraStream({ mediaDevices: md });
    expect(res.ok).toBe(true);
    if (res.ok === false) return;
    res.stream.close();
    res.stream.close();
    expect(t1.stop).toHaveBeenCalledTimes(1);
    expect(t2.stop).toHaveBeenCalledTimes(1);
  });

  it("onExternalEnd fires when a track emits 'ended'", async () => {
    const t = fakeTrack();
    const md = makeMedia({
      getUserMedia: vi.fn(async () => ({ getTracks: () => [t] }) as unknown as MediaStream),
    });
    const res = await openCameraStream({ mediaDevices: md });
    expect(res.ok).toBe(true);
    if (res.ok === false) return;
    const cb = vi.fn();
    const unsub = res.stream.onExternalEnd(cb);
    t.fire("ended");
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    t.fire("ended");
    expect(cb).toHaveBeenCalledTimes(1);
    res.stream.close();
  });

  it("onExternalEnd does NOT fire after close()", async () => {
    const t = fakeTrack();
    const md = makeMedia({
      getUserMedia: vi.fn(async () => ({ getTracks: () => [t] }) as unknown as MediaStream),
    });
    const res = await openCameraStream({ mediaDevices: md });
    expect(res.ok).toBe(true);
    if (res.ok === false) return;
    const cb = vi.fn();
    res.stream.onExternalEnd(cb);
    res.stream.close();
    // The removeEventListener call in close() should prevent this, but even
    // if a stale listener slipped through, `closed` guard short-circuits.
    t.fire("ended");
    expect(cb).not.toHaveBeenCalled();
  });
});
