/** @vitest-environment jsdom */
// Plan 80 step 43: probeCameraCapability error-code mapping tests.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { probeCameraCapability } from "../capability";

function makeMedia(opts: {
  getUserMedia: MediaDevices["getUserMedia"];
  enumerateDevices?: MediaDevices["enumerateDevices"];
}): MediaDevices {
  return {
    getUserMedia: opts.getUserMedia,
    enumerateDevices: opts.enumerateDevices ?? (async () => [] as MediaDeviceInfo[]),
    getSupportedConstraints: () => ({}),
    ondevicechange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  } as unknown as MediaDevices;
}

function fakeStream() {
  const track = {
    stop: vi.fn(),
    kind: "video",
    label: "cam",
  } as unknown as MediaStreamTrack;

  return {
    getTracks: () => [track],
  } as unknown as MediaStream;
}

function domErr(name: string, message = name): DOMException {
  const e = new Error(message) as Error & { name: string };
  e.name = name;

  return e as unknown as DOMException;
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("probeCameraCapability", () => {
  it("returns E_CAMERA_UNSUPPORTED when mediaDevices is null", async () => {
    const r = await probeCameraCapability({ mediaDevices: null });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error.code).toBe("E_CAMERA_UNSUPPORTED");
  });

  it("maps NotAllowedError to E_CAMERA_PERMISSION_DENIED", async () => {
    const md = makeMedia({
      getUserMedia: async () => {
        throw domErr("NotAllowedError");
      },
    });
    const r = await probeCameraCapability({ mediaDevices: md });
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error.code).toBe("E_CAMERA_PERMISSION_DENIED");
  });

  it("maps NotFoundError to E_CAMERA_NOT_FOUND", async () => {
    const md = makeMedia({
      getUserMedia: async () => {
        throw domErr("NotFoundError");
      },
    });
    const r = await probeCameraCapability({ mediaDevices: md });
    if (r.ok === false) expect(r.error.code).toBe("E_CAMERA_NOT_FOUND");
    else throw new Error("expected failure");
  });

  it("maps NotReadableError to E_CAMERA_IN_USE", async () => {
    const md = makeMedia({
      getUserMedia: async () => {
        throw domErr("NotReadableError");
      },
    });
    const r = await probeCameraCapability({ mediaDevices: md });
    if (r.ok === false) expect(r.error.code).toBe("E_CAMERA_IN_USE");
    else throw new Error("expected failure");
  });

  it("maps OverconstrainedError to E_CAMERA_CONSTRAINT", async () => {
    const md = makeMedia({
      getUserMedia: async () => {
        throw domErr("OverconstrainedError");
      },
    });
    const r = await probeCameraCapability({ mediaDevices: md });
    if (r.ok === false) expect(r.error.code).toBe("E_CAMERA_CONSTRAINT");
    else throw new Error("expected failure");
  });

  it("maps unknown DOMException to E_CAMERA_UNKNOWN preserving cause", async () => {
    const md = makeMedia({
      getUserMedia: async () => {
        throw domErr("WeirdBrowserError", "weird");
      },
    });
    const r = await probeCameraCapability({ mediaDevices: md });
    if (r.ok === false) {
      expect(r.error.code).toBe("E_CAMERA_UNKNOWN");
      expect(r.error.cause).toBe("WeirdBrowserError");
    } else throw new Error("expected failure");
  });

  it("returns ok with device list and stops every track", async () => {
    const stream = fakeStream();
    const md = makeMedia({
      getUserMedia: async () => stream,
      enumerateDevices: async () =>
        [
          { deviceId: "d1", kind: "videoinput", label: "Cam 1", groupId: "g" },
          { deviceId: "m1", kind: "audioinput", label: "Mic", groupId: "g" },
        ] as MediaDeviceInfo[],
    });
    const r = await probeCameraCapability({ mediaDevices: md });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.devices).toHaveLength(1);
      expect(r.devices[0]?.deviceId).toBe("d1");
    }
    const stopFn = stream.getTracks()[0]!.stop as unknown as ReturnType<typeof vi.fn>;
    expect(stopFn).toHaveBeenCalledTimes(1);
  });

  it("tolerates enumerateDevices failure by returning ok with empty list", async () => {
    const stream = fakeStream();
    const md = makeMedia({
      getUserMedia: async () => stream,
      enumerateDevices: async () => {
        throw new Error("enum boom");
      },
    });
    const r = await probeCameraCapability({ mediaDevices: md });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.devices).toEqual([]);
  });
});