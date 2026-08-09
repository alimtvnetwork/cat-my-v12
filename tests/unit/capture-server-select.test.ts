// Plan 26 Step 5 - proves the selectCaptureDevice failure path surfaces the
// typed E_CFG_UNKNOWN_DEVICE code through the same normalization funnel
// (`toCaptureError`) that `guard()` uses in src/lib/capture.functions.ts.
// Anchors:
//   - src/lib/capture.server.ts::writeSelectedDevice (throws E_CFG_UNKNOWN_DEVICE)
//   - src/lib/capture.shared.ts::toCaptureError (server-fn boundary mapper)
//   - src/components/hmi/DeviceDiscoveryPanel.tsx::BANNER_COPY (UI copy lock)
import { describe, expect, it } from "vitest";

import { selectDeviceWithAudit, writeSelectedDevice } from "@/lib/capture.server";
import { CaptureError, toCaptureError } from "@/lib/capture.shared";

describe("selectCaptureDevice failure surface", () => {
  it("writeSelectedDevice throws a prefixed E_CFG_UNKNOWN_DEVICE for unknown pairs", () => {
    expect(() => writeSelectedDevice("pylon", "SN-ghost", "test")).toThrow(
      /^E_CFG_UNKNOWN_DEVICE: pylon:SN-ghost$/,
    );
  });

  it("selectDeviceWithAudit surfaces E_CFG_UNKNOWN_DEVICE (typed) via toCaptureError", async () => {
    let ce: CaptureError | null = null;
    try {
      await selectDeviceWithAudit("spinnaker", "MISSING", "test", async () => {
        throw new Error("audit should not be reached");
      });
    } catch (err) {
      ce = toCaptureError(err, "cid-test-01");
    }
    expect(ce).not.toBeNull();
    expect(ce!.code).toBe("E_CFG_UNKNOWN_DEVICE");
    expect(ce!.correlationId).toBe("cid-test-01");
    expect(ce!.message).toContain("spinnaker:MISSING");
  });

  it("audit-sink failure remains distinct as E_SEC_AUDIT_FAILED", async () => {
    let ce: CaptureError | null = null;
    try {
      await selectDeviceWithAudit("pylon", "24477108", "test", async () => {
        throw new Error("sink offline");
      });
    } catch (err) {
      ce = toCaptureError(err);
    }
    expect(ce).not.toBeNull();
    expect(ce!.code).toBe("E_SEC_AUDIT_FAILED");
  });
});
