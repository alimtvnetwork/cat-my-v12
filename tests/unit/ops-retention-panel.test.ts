// Plan 20 Step 14 — round-trips the three audit-retention rows the
// RetentionAuditPanel renders on /ops:
//   - I_SEC_ADMIN_WRITE  (success on subject settings.audit.retention)
//   - E_SEC_ROLE_DENIED  (non-admin write denied)
//   - I_SEC_AUDIT_PRUNED (scheduler prune)
// Also asserts the E_SEC_RETENTION_FAILED path is code-visible.
import { describe, expect, it } from "vitest";

import { appendOpsEvent, readOpsEvents } from "@/lib/ops.server";

describe("audit-retention audit trail integration", () => {
  it("append + read round-trips success, denial, prune, and failure rows", () => {
    const cidOk = "cid-ret-ok-01";
    const cidNg = "cid-ret-ng-01";
    const cidPrune = "cid-ret-prune-01";
    const cidFail = "cid-ret-fail-01";

    appendOpsEvent({
      code: "I_SEC_ADMIN_WRITE",
      subject: "settings.audit.retention",
      actor: "admin-1",
      prior: "days=30",
      next: "days=7",
      correlationId: cidOk,
      detail: `actor=admin-1 prior=days=30 next=days=7 cid=${cidOk}`,
    });
    appendOpsEvent({
      code: "E_SEC_ROLE_DENIED",
      subject: "settings.audit.retention",
      correlationId: cidNg,
      detail: `role=viewer cid=${cidNg}`,
    });
    appendOpsEvent({
      code: "I_SEC_AUDIT_PRUNED",
      subject: "settings.audit.retention",
      correlationId: cidPrune,
      detail: `policy=days=7 removed=42 cid=${cidPrune}`,
    });
    appendOpsEvent({
      code: "E_SEC_RETENTION_FAILED",
      subject: "settings.audit.retention",
      correlationId: cidFail,
      detail: `cause=uncaught cid=${cidFail}`,
    });

    const { events } = readOpsEvents();
    const scoped = events.filter(
      (e) =>
        e.subject === "settings.audit.retention" ||
        e.code === "I_SEC_AUDIT_PRUNED" ||
        e.code === "E_SEC_RETENTION_FAILED",
    );

    const ok = scoped.find((e) => e.correlationId === cidOk);
    const ng = scoped.find((e) => e.correlationId === cidNg);
    const prune = scoped.find((e) => e.correlationId === cidPrune);
    const fail = scoped.find((e) => e.correlationId === cidFail);

    expect(ok).toBeDefined();
    expect(ok!.code).toBe("I_SEC_ADMIN_WRITE");
    expect(ok!.next).toBe("days=7");

    expect(ng).toBeDefined();
    expect(ng!.code).toBe("E_SEC_ROLE_DENIED");

    expect(prune).toBeDefined();
    expect(prune!.detail).toContain("removed=42");

    expect(fail).toBeDefined();
    expect(fail!.code).toBe("E_SEC_RETENTION_FAILED");
  });
});
