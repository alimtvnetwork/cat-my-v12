/** @vitest-environment jsdom */
// Plan 80 step 47: capture-frame helper.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureFrameFromStream, estimateDataUrlBytes } from "../capture-frame";

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("estimateDataUrlBytes", () => {
  it("returns 0 for a string without a comma", () => {
    expect(estimateDataUrlBytes("no-comma")).toBe(0);
  });
  it("approximates base64 length ignoring padding", () => {
    // "AAAA" = 4 chars, 0 padding => 3 bytes.
    expect(estimateDataUrlBytes("data:image/png;base64,AAAA")).toBe(3);
    // "AAAA==" = 6 chars, 2 padding => floor(6*3/4) - 2 = 4 - 2 = 2 bytes.
    expect(estimateDataUrlBytes("data:image/png;base64,AAAA==")).toBe(2);
  });
});

describe("captureFrameFromStream", () => {
  function makeFakeDoc(): { doc: Document; drawImage: ReturnType<typeof vi.fn> } {
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage })),
      toDataURL: vi.fn(() => "data:image/jpeg;base64,AAAA"),
    };
    const video: Record<string, unknown> = {
      muted: false,
      playsInline: false,
      srcObject: null,
      videoWidth: 640,
      videoHeight: 480,
      _listeners: {} as Record<string, EventListener[]>,
      addEventListener(ev: string, l: EventListener) {
        const arr = ((video._listeners as Record<string, EventListener[]>)[ev] ??= []);
        arr.push(l);
      },
      play: vi.fn(async () => {
        // Fire loadedmetadata on next microtask.
        queueMicrotask(() => {
          for (const l of (video._listeners as Record<string, EventListener[]>).loadedmetadata ??
            []) {
            l(new Event("loadedmetadata"));
          }
        });
      }),
    };
    const doc = {
      createElement: (tag: string) => (tag === "canvas" ? canvas : video),
    } as unknown as Document;

    return { doc, drawImage };
  }

  it("captures a frame with correct dims and non-zero bytes", async () => {
    const { doc, drawImage } = makeFakeDoc();
    const frame = await captureFrameFromStream({} as MediaStream, { doc });
    expect(frame.width).toBe(640);
    expect(frame.height).toBe(480);
    expect(frame.byteSize).toBeGreaterThan(0);
    expect(frame.dataUrl.startsWith("data:image/")).toBe(true);
    expect(drawImage).toHaveBeenCalledTimes(1);
  });

  it("throws when video reports zero dimensions", async () => {
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toDataURL: () => "data:image/jpeg;base64,AAAA",
    };
    const video: Record<string, unknown> = {
      videoWidth: 0,
      videoHeight: 0,
      _listeners: {} as Record<string, EventListener[]>,
      addEventListener(ev: string, l: EventListener) {
        const arr = ((video._listeners as Record<string, EventListener[]>)[ev] ??= []);
        arr.push(l);
      },
      play: vi.fn(async () => {
        queueMicrotask(() => {
          for (const l of (video._listeners as Record<string, EventListener[]>).loadedmetadata ??
            []) {
            l(new Event("loadedmetadata"));
          }
        });
      }),
    };
    const doc = {
      createElement: (tag: string) => (tag === "canvas" ? canvas : video),
    } as unknown as Document;
    await expect(captureFrameFromStream({} as MediaStream, { doc })).rejects.toThrow(
      /zero dimensions/,
    );
  });

  it("rejects when play() fails (autoplay policy)", async () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toDataURL: () => "data:image/jpeg;base64,AAAA",
    };
    const video = {
      videoWidth: 100,
      videoHeight: 100,
      addEventListener: () => {},
      play: vi.fn(async () => {
        throw new Error("autoplay blocked");
      }),
    };
    const doc = {
      createElement: (tag: string) => (tag === "canvas" ? canvas : video),
    } as unknown as Document;
    await expect(captureFrameFromStream({} as MediaStream, { doc })).rejects.toThrow(
      /autoplay blocked/,
    );
  });
});
