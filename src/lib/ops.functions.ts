import { createServerFn } from "@tanstack/react-start";
import { readOpsEvents } from "./ops.server";
import type { OpsEvent, OpsEventCode } from "./ops.shared";
import { HttpMethod } from "@/lib/constants";

/**
 * Ops telemetry server-fn bridge (closes v1.37 L1').
 *
 * Worker-side in-memory ring buffer mirroring the Python `AuditSink` schema
 * (see app/core/security/audit_sink.py). The Python process is out-of-band
 * in this study clone; this bridge gives the UI a real server round-trip so
 * `/ops` is no longer purely client state. The buffer seeds with the same
 * canonical sample rows previously inlined in src/routes/ops.tsx so parity
 * is preserved and the E2E shape matches the Python emitter contract.
 */

export type { OpsEvent, OpsEventCode };

export const getAuditEvents = createServerFn({ method: HttpMethod.Get }).handler(async () => {
  return readOpsEvents();
});
