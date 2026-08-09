import { describe, expect, it, vi } from "vitest";
import { CaptureError } from "@/lib/capture.shared";
import { withSdkRetry, __test__ } from "@/lib/sdk-facade.server";

const noSleep = async () => {};

describe("withSdkRetry", () => {
  it("returns on first success without sleeping", async () => {
    const op = vi.fn().mockResolvedValue("ok");
    const out = await withSdkRetry("t", op, { sleep: noSleep });
    expect(out).toBe("ok");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retries transient E_CAP_ENUM_FAILED and eventually succeeds", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new CaptureError("E_CAP_ENUM_FAILED", "bus busy"))
      .mockRejectedValueOnce(new CaptureError("E_CAP_ENUM_FAILED", "bus busy"))
      .mockResolvedValueOnce("ok");
    const out = await withSdkRetry("enum", op, { maxAttempts: 3, sleep: noSleep, jitter: false });
    expect(out).toBe("ok");
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry permanent E_CFG_UNKNOWN_DEVICE", async () => {
    const op = vi.fn().mockRejectedValue(new CaptureError("E_CFG_UNKNOWN_DEVICE", "gone"));
    await expect(withSdkRetry("open", op, { sleep: noSleep })).rejects.toMatchObject({
      code: "E_CFG_UNKNOWN_DEVICE",
    });
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry E_CAP_SDK_ABSENT", async () => {
    const op = vi.fn().mockRejectedValue(new CaptureError("E_CAP_SDK_ABSENT", "no dll"));
    await expect(withSdkRetry("open", op, { sleep: noSleep })).rejects.toMatchObject({
      code: "E_CAP_SDK_ABSENT",
    });
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("throws the last transient error after exhausting attempts", async () => {
    const op = vi.fn().mockRejectedValue(new CaptureError("E_CAP_ENUM_FAILED", "flaky"));
    await expect(
      withSdkRetry("enum", op, { maxAttempts: 2, sleep: noSleep }),
    ).rejects.toMatchObject({
      code: "E_CAP_ENUM_FAILED",
    });
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("normalizes non-CaptureError throws to E_INTERNAL and retries", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new Error("socket hangup"))
      .mockResolvedValueOnce("ok");
    const out = await withSdkRetry("grab", op, { maxAttempts: 2, sleep: noSleep });
    expect(out).toBe("ok");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("preserves the cid across attempts", async () => {
    const seen: string[] = [];
    const op = vi.fn(async ({ cid }: { cid: string }) => {
      seen.push(cid);
      if (seen.length < 2) throw new CaptureError("E_CAP_ENUM_FAILED", "x");
      return "ok";
    });
    await withSdkRetry("enum", op, { maxAttempts: 3, sleep: noSleep });
    expect(seen[0]).toBe(seen[1]);
  });

  it("computeDelay grows exponentially and respects cap", () => {
    expect(__test__.computeDelay(1, 50, 800, false)).toBe(50);
    expect(__test__.computeDelay(2, 50, 800, false)).toBe(100);
    expect(__test__.computeDelay(5, 50, 800, false)).toBe(800);
  });
});
