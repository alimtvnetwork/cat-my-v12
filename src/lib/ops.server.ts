import { OpsEventCodeType } from "@/lib/ops.shared";
import type { OpsEvent } from "./ops.shared";

const MAX_BUFFER = 500;

const seed: OpsEvent[] = [
  {
    id: 1,
    ts: "2026-07-13 09:14:22",
    code: OpsEventCodeType.I_SEC_AUDIT_PRUNED,
    subject: "audit_log",
    detail: "pruned 42 rows older than 90d",
  },
  {
    id: 2,
    ts: "2026-07-13 09:18:07",
    code: OpsEventCodeType.I_SEC_ADMIN_WRITE,
    subject: "settings.capture.vendor",
    detail: "pylon -> spinnaker",
  },
  {
    id: 3,
    ts: "2026-07-13 09:22:41",
    code: OpsEventCodeType.E_SEC_DENIAL_BURST,
    subject: "auth.settings.write",
    detail: "5 denials / 10s window",
  },
  {
    id: 4,
    ts: "2026-07-13 09:24:03",
    code: OpsEventCodeType.E_SEC_ROLE_DENIED,
    subject: "operator/alice",
    detail: "role=operator, needed=admin",
  },
  {
    id: 5,
    ts: "2026-07-13 09:31:55",
    code: OpsEventCodeType.I_SEC_AUDIT_PRUNED,
    subject: "audit_log",
    detail: "pruned 12 rows older than 90d",
  },
];

const buffer: OpsEvent[] = [...seed];
let nextId = seed.length + 1;

export function appendOpsEvent(evt: Omit<OpsEvent, "id" | "ts"> & { ts?: string }): OpsEvent {
  const row: OpsEvent = {
    id: nextId++,
    ts: evt.ts ?? new Date().toISOString().replace("T", " ").slice(0, 19),
    code: evt.code,
    subject: evt.subject,
    detail: evt.detail,
    actor: evt.actor,
    prior: evt.prior,
    next: evt.next,
    correlationId: evt.correlationId,
  };
  buffer.push(row);

  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);

  return row;
}

export function readOpsEvents(): { events: OpsEvent[]; total: number } {
  return { events: buffer.slice().reverse(), total: buffer.length };
}
