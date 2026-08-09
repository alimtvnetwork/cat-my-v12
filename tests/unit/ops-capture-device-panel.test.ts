// Plan 26 Step 8 (integration) - drives the full loop for the capture-device
// audit trail on the TSS side: appendOpsEvent for a success + a denial on
// subject 'settings.capture.device', then readOpsEvents() must expose both
// rows so /ops CaptureDeviceAuditPanel can render them keyed by cid.
import { describe, expect, it } from "vitest";

import { appendOpsEvent, readOpsEvents } from "@/lib/ops.server";

describe("capture-device audit trail integration", () => {
  it("appendOpsEvent + readOpsEvents round-trips success and denial rows", () => {
    const cidOk = "cid-int-ok-01";
    const cidNg = "cid-int-ng-01";

    appendOpsEvent({
      code: "I_SEC_ADMIN_WRITE",
      subject: "settings.capture.device",
      actor: "admin-1",
      prior: "pylon:24477108",
      next: "spinnaker:18461209",
      correlationId: cidOk,
      detail: `actor=admin-1 prior=pylon:24477108 next=spinnaker:18461209 cid=${cidOk}`,
    });
    appendOpsEvent({
      code: "E_CFG_UNKNOWN_DEVICE",
      subject: "settings.capture.device",
      correlationId: cidNg,
      detail: `pylon:SN-ghost [cid=${cidNg}]`,
    });

    const { events } = readOpsEvents();
    const scoped = events.filter((e) => e.subject === "settings.capture.device");

    const ok = scoped.find((e) => e.correlationId === cidOk);
    const ng = scoped.find((e) => e.correlationId === cidNg);

    expect(ok).toBeDefined();
    expect(ok!.code).toBe("I_SEC_ADMIN_WRITE");
    expect(ok!.prior).toBe("pylon:24477108");
    expect(ok!.next).toBe("spinnaker:18461209");

    expect(ng).toBeDefined();
    expect(ng!.code).toBe("E_CFG_UNKNOWN_DEVICE");
    expect(ng!.detail).toContain("SN-ghost");
  });
});
