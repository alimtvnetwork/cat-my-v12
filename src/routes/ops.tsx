import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { HmiShell } from "@/components/hmi";
import { getAuditEvents, type OpsEvent } from "@/lib/ops.functions";
import { getDenialTuning, type DenialTuning } from "@/lib/denial-tuning.functions";
import { AuditRetentionTile } from "@/components/ops/audit-retention-tile";
import { formatIdentifierLabel, formatUiText } from "@/lib/display-labels";

/**
 * Ops telemetry surface (M1 remediation from audit v1.34.0, live-bridged in v1.39).
 *
 * Read-only view of security-relevant events emitted by the backend:
 *   - I_SEC_AUDIT_PRUNED  (retention scheduler)
 *   - E_SEC_DENIAL_BURST  (DenialRateLimiter)
 *   - I_SEC_ADMIN_WRITE   (admin settings writes)
 *   - E_SEC_ROLE_DENIED   (auth surface)
 *
 * Now reads from getAuditEvents() server-fn (see src/lib/ops.functions.ts)
 * which owns the worker-side ring buffer mirroring the Python `AuditSink`.
 */
export const Route = createFileRoute("/ops")({
  head: () => ({
    meta: [
      { title: "Ops Telemetry - Control Automation" },
      {
        name: "description",
        content:
          "Live security and retention telemetry: audit prunes, denial bursts, admin writes, and role-denied events.",
      },
      { property: "og:title", content: "Ops Telemetry - Control Automation" },
      {
        property: "og:description",
        content:
          "Read-only operator surface for audit pruning and denial-burst events emitted by the backend.",
      },
    ],
  }),
  component: OpsPage,
});

function codeClass(code: OpsEvent["code"]): string {
  if (code.startsWith("E_")) return "text-ca-status-ng";

  return "text-ca-ink";
}

function OpsPage() {
  const fetchEvents = useServerFn(getAuditEvents);
  const fetchTuning = useServerFn(getDenialTuning);
  const [events, setEvents] = useState<OpsEvent[]>([]);
  const [tuning, setTuning] = useState<DenialTuning | null>(null);
  const [loaded, setLoaded] = useState(false);

  // E5 render SLO (Plan 15 Step 9): poll the worker-side buffer on a fixed
  // interval so a fresh I_SEC_ADMIN_WRITE row from selectCaptureDevice
  // reaches /ops within one refresh window (<= 5s).
  // Pauses while the tab is hidden (useVisibleInterval) so we don't waste
  // server-fn round trips or CPU on unseen renders. The hook fires once on
  // visibility so the first paint after tab-focus is still fresh.
  const REFRESH_MS = 5000;
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    fetchTuning()
      .then((t) => {
        if (aliveRef.current) setTuning(t);
      })
      .catch((err) => console.error("[ops] getDenialTuning failed", err));

    return () => {
      aliveRef.current = false;
    };
  }, [fetchTuning]);

  useVisibleInterval(() => {
    fetchEvents()
      .then((res) => {
        if (!aliveRef.current) return;
        setEvents(res.events);
        setLoaded(true);
      })
      .catch((err) => {
        console.error("[ops] getAuditEvents failed", err);

        if (aliveRef.current) setLoaded(true);
      });
  }, REFRESH_MS);

  const counts = useMemo(() => {
    const c: Record<OpsEvent["code"], number> = {
      I_SEC_AUDIT_PRUNED: 0,
      E_SEC_RETENTION_FAILED: 0,
      E_SEC_DENIAL_BURST: 0,
      I_SEC_ADMIN_WRITE: 0,
      E_SEC_ROLE_DENIED: 0,
      E_SEC_DENIED: 0,
      E_CFG_UNKNOWN_DEVICE: 0,
      AuditBundleExportRequested: 0,
      AuditBundleExported: 0,
      AuditBundleExportDenied: 0,
      AuditBundleExportFailed: 0,
      AuditBundleDownloadUrlIssued: 0,
    };
    for (const e of events) c[e.code] += 1;

    return c;
  }, [events]);

  return (
    <HmiShell
      program="Program 01"
      title="Ops Telemetry"
      headerActions={
        <span className="text-hmi-body text-ca-ink-muted hmi-tabular">
          {loaded ? `${events.length} events in buffer` : "loading..."}
        </span>
      }
      actionBarLeft={
        <Link
          to="/"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink"
        >
          Back to Home
        </Link>
      }
    >
      <div className="flex-1 overflow-auto bg-ca-panel">
        <div className="grid grid-cols-4 gap-hmi-2 p-hmi-3 border-b border-ca-border">
          <Tile label="Audit pruned" value={counts.I_SEC_AUDIT_PRUNED} tone="info" />
          <Tile label="Admin writes" value={counts.I_SEC_ADMIN_WRITE} tone="info" />
          <Tile label="Denial bursts" value={counts.E_SEC_DENIAL_BURST} tone="alert" />
          <Tile label="Role denied" value={counts.E_SEC_ROLE_DENIED} tone="alert" />
        </div>

        <div className="px-hmi-3 pt-hmi-3 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
          Denial bursts: read-only tuning
        </div>
        <div
          className="grid grid-cols-3 gap-hmi-2 p-hmi-3 border-b border-ca-border"
          data-testid="denial-tuning-panel"
          aria-label="Denial bursts tuning (read-only)"
        >
          <Tile label="Denial threshold" value={tuning?.threshold ?? 0} tone="info" />
          <Tile label="Window (s)" value={tuning?.windowSeconds ?? 0} tone="info" />
          <div className="border border-ca-border bg-ca-panel-2 p-hmi-3">
            <div className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              Last derivation
            </div>
            <div className="text-hmi-body hmi-tabular text-ca-ink">
              {tuning?.derivedAt ?? "unknown"}
            </div>
            <div className="text-hmi-caption text-ca-ink-muted mt-hmi-1">
              {formatUiText(tuning?.derivation ?? "read-only, admin via CLI (v2.0.3)")}
            </div>
          </div>
        </div>

        <AuditRetentionTile />

        <RetentionAuditPanel events={events} />

        <CaptureDeviceAuditPanel events={events} />

        <table className="w-full text-hmi-body text-ca-ink">
          <thead className="bg-ca-chrome text-ca-chrome-ink text-hmi-caption uppercase tracking-wide">
            <tr>
              <th className="text-left px-hmi-3 py-hmi-2">Time</th>
              <th className="text-left px-hmi-3 py-hmi-2">Code</th>
              <th className="text-left px-hmi-3 py-hmi-2">Subject</th>
              <th className="text-left px-hmi-3 py-hmi-2">CID</th>
              <th className="text-left px-hmi-3 py-hmi-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr
                key={e.id}
                className="border-b border-ca-border"
                data-cid={e.correlationId ?? undefined}
              >
                <td className="px-hmi-3 py-hmi-2 hmi-tabular">{e.ts}</td>
                <td className={`px-hmi-3 py-hmi-2 hmi-tabular ${codeClass(e.code)}`}>
                  {formatIdentifierLabel(e.code)}
                </td>
                <td className="px-hmi-3 py-hmi-2">{formatUiText(e.subject)}</td>
                <td className="px-hmi-3 py-hmi-2 hmi-tabular text-ca-ink-muted">
                  {e.correlationId ?? "-"}
                </td>
                <td className="px-hmi-3 py-hmi-2 text-ca-ink-muted">{formatUiText(e.detail)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="p-hmi-3 text-hmi-caption text-ca-ink-muted">
          Live bridge active: rows served by getAuditEvents() over TSS RPC, worker-side buffer
          mirrors AuditSink schema.
        </p>
      </div>
    </HmiShell>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: "info" | "alert" }) {
  const valueClass = tone === "alert" ? "text-ca-status-ng" : "text-ca-ink";

  return (
    <div className="border border-ca-border bg-ca-panel-2 p-hmi-3">
      <div className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">{label}</div>
      <div className={`text-hmi-counter hmi-tabular ${valueClass}`}>{value}</div>
    </div>
  );
}

function CaptureDeviceAuditPanel({ events }: { events: OpsEvent[] }) {
  // Plan 26 Step 7: filtered slice of the audit buffer scoped to subject
  // 'settings.capture.device'. Rendered so an operator can cross-reference
  // the inline `cid=...` shown by DeviceDiscoveryPanel with the persisted
  // audit row (success I_SEC_ADMIN_WRITE and denial E_CFG_UNKNOWN_DEVICE /
  // E_SEC_ROLE_DENIED / E_SEC_DENIED).
  const rows = events.filter((e) => e.subject === "settings.capture.device");

  return (
    <section
      className="border-b border-ca-border"
      data-testid="capture-device-audit-panel"
      aria-label="Capture device audit rows"
    >
      <div className="px-hmi-3 pt-hmi-3 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
        Capture device: audit trail ({rows.length})
      </div>
      <table className="w-full text-hmi-body text-ca-ink">
        <thead className="bg-ca-chrome text-ca-chrome-ink text-hmi-caption uppercase tracking-wide">
          <tr>
            <th className="text-left px-hmi-3 py-hmi-2">Time</th>
            <th className="text-left px-hmi-3 py-hmi-2">Code</th>
            <th className="text-left px-hmi-3 py-hmi-2">Actor</th>
            <th className="text-left px-hmi-3 py-hmi-2">Prior</th>
            <th className="text-left px-hmi-3 py-hmi-2">Next</th>
            <th className="text-left px-hmi-3 py-hmi-2">CID</th>
            <th className="text-left px-hmi-3 py-hmi-2">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-hmi-3 py-hmi-2 text-ca-ink-muted" colSpan={7}>
                No capture-device events in buffer.
              </td>
            </tr>
          ) : (
            rows.map((e) => (
              <tr
                key={e.id}
                className="border-b border-ca-border"
                data-row-code={e.code}
                data-cid={e.correlationId ?? undefined}
              >
                <td className="px-hmi-3 py-hmi-2 hmi-tabular">{e.ts}</td>
                <td
                  className={`px-hmi-3 py-hmi-2 hmi-tabular ${e.code.startsWith("E_") ? "text-ca-status-ng" : "text-ca-ink"}`}
                >
                  {formatIdentifierLabel(e.code)}
                </td>
                <td className="px-hmi-3 py-hmi-2 hmi-tabular">
                  {e.actor ? formatUiText(e.actor) : "-"}
                </td>
                <td className="px-hmi-3 py-hmi-2 hmi-tabular text-ca-ink-muted">
                  {e.prior ? formatUiText(e.prior) : "-"}
                </td>
                <td className="px-hmi-3 py-hmi-2 hmi-tabular text-ca-ink-muted">
                  {e.next ? formatUiText(e.next) : "-"}
                </td>
                <td className="px-hmi-3 py-hmi-2 hmi-tabular text-ca-ink-muted">
                  {e.correlationId ?? "-"}
                </td>
                <td className="px-hmi-3 py-hmi-2 text-ca-ink-muted">{formatUiText(e.detail)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

function RetentionAuditPanel({ events }: { events: OpsEvent[] }) {
  // Plan 20 Step 13: filtered slice for audit retention. Includes the admin
  // write path (subject='settings.audit.retention') and worker-emitted
  // prune/failure codes so operators can trace policy changes and the
  // resulting scheduled prunes via correlation id.
  const rows = events.filter(
    (e) =>
      e.subject === "settings.audit.retention" ||
      e.code === "I_SEC_AUDIT_PRUNED" ||
      e.code === "E_SEC_RETENTION_FAILED",
  );

  return (
    <section
      className="border-b border-ca-border"
      data-testid="retention-audit-panel"
      aria-label="Audit retention rows"
    >
      <div className="px-hmi-3 pt-hmi-3 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
        Audit retention: audit trail ({rows.length})
      </div>
      <table className="w-full text-hmi-body text-ca-ink">
        <thead className="bg-ca-chrome text-ca-chrome-ink text-hmi-caption uppercase tracking-wide">
          <tr>
            <th className="text-left px-hmi-3 py-hmi-2">Time</th>
            <th className="text-left px-hmi-3 py-hmi-2">Code</th>
            <th className="text-left px-hmi-3 py-hmi-2">Actor</th>
            <th className="text-left px-hmi-3 py-hmi-2">Prior</th>
            <th className="text-left px-hmi-3 py-hmi-2">Next</th>
            <th className="text-left px-hmi-3 py-hmi-2">CID</th>
            <th className="text-left px-hmi-3 py-hmi-2">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-hmi-3 py-hmi-2 text-ca-ink-muted" colSpan={7}>
                No retention events in buffer.
              </td>
            </tr>
          ) : (
            rows.map((e) => (
              <tr
                key={e.id}
                className="border-b border-ca-border"
                data-row-code={e.code}
                data-cid={e.correlationId ?? undefined}
              >
                <td className="px-hmi-3 py-hmi-2 hmi-tabular">{e.ts}</td>
                <td
                  className={`px-hmi-3 py-hmi-2 hmi-tabular ${e.code.startsWith("E_") ? "text-ca-status-ng" : "text-ca-ink"}`}
                >
                  {formatIdentifierLabel(e.code)}
                </td>
                <td className="px-hmi-3 py-hmi-2 hmi-tabular">
                  {e.actor ? formatUiText(e.actor) : "-"}
                </td>
                <td className="px-hmi-3 py-hmi-2 hmi-tabular text-ca-ink-muted">
                  {e.prior ? formatUiText(e.prior) : "-"}
                </td>
                <td className="px-hmi-3 py-hmi-2 hmi-tabular text-ca-ink-muted">
                  {e.next ? formatUiText(e.next) : "-"}
                </td>
                <td className="px-hmi-3 py-hmi-2 hmi-tabular text-ca-ink-muted">
                  {e.correlationId ?? "-"}
                </td>
                <td className="px-hmi-3 py-hmi-2 text-ca-ink-muted">{formatUiText(e.detail)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
