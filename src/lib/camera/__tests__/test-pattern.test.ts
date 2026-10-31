// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createSyntheticCameraStream } from "../test-pattern";

describe("createSyntheticCameraStream", () => {
  it("creates a synthetic media stream with close teardown", () => {
    const handle = createSyntheticCameraStream(640, 480, 30);

    expect(handle).toBeDefined();
    expect(handle.stream).toBeDefined();
    expect(typeof handle.close).toBe("function");

    // Invoke close to ensure it stops animation and tracks cleanly
    expect(() => handle.close()).not.toThrow();
  });
});
