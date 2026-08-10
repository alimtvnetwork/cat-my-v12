
export enum AuditRetentionTileToneType {
  Info = "info",
  Fault = "fault",
}
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import {
  getAuditRetentionStatus,
  type AuditRetentionStatus,
} from "@/lib/audit-retention.functions";
import { supabase } from "@/integrations/supabase/client";
import { formatIdentifierLabel, formatUiText } from "@/lib/display-labels";

/**
 * Plan 20 Step 8 UI: read-only /ops tile.
 *
 * Contract locked in spec/21-app/71-audit-retention.md §71.6:
 *   - 15s poll cadence via getAuditRetentionStatus
 *   - stale-data guard fires at fetchedAt age > 60s
 *   - status colors bound to --hmi-* tokens
 *   - WCAG 1.4.1 text badges for warn/fault (no icon-only signal)
 *   - no inline mutation, no historical charts in v2.0.4
 *
 * getAuditRetentionStatus is `requireSupabaseAuth` gated, so the poll is
 * skipped entirely until an authenticated session is present. Without this
 * guard, the tile spams 401s on the public /ops route.
 */
const REFRESH_MS = 15_000;
const STALE_MS = 60_000;
const CLOCK_SKEW_FAULT_MS = 2000;

function ageMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);

  if (Number.isNaN(t)) return null;

  return Date.now() - t;
}

export function AuditRetentionTile() {
  const fetchStatus = useServerFn(getAuditRetentionStatus);
  const [status, setStatus] = useState<AuditRetentionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;

    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isAlive = true;
    // Supabase client throws on any access when Lovable Cloud is not
    // connected. Treat that as "no session" so /ops still renders.
    let unsubscribe: (() => void) | null = null;
    try {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (isAlive) setHasSession(Boolean(data.session));
        })
        .catch(() => {
          if (isAlive) setHasSession(false);
        });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isAlive) setHasSession(Boolean(session));
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    } catch {
      if (isAlive) setHasSession(false);
    }

    return () => {
      isAlive = false;

      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Poll while visible and only when the user has a session. Pausing on
  // hidden tabs stops the /ops page from spamming retention status polls
  // in the background (15s cadence, but still meaningful if left open).
  useVisibleInterval(
    () => {
      fetchStatus()
        .then((res) => {
          if (!aliveRef.current) return;
          setStatus(res);
          setError(null);
        })
        .catch((err) => {
          console.error("[ops] getAuditRetentionStatus failed", err);

          if (aliveRef.current) setError(formatUiText(err?.message ?? "fetch failed"));
        });
    },
    REFRESH_MS,
    Boolean(hasSession),
  );

  if (hasSession === false) {
    return (
      <div className="border-b border-ca-border p-hmi-3" data-testid="audit-retention-tile">
        <div className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted mb-hmi-2">
          Audit retention
        </div>
        <div className="text-hmi-caption text-ca-ink-muted">
          Sign in required to view retention status.
        </div>
      </div>
    );
  }

  const stale = (() => {
    const age = ageMs(status?.fetchedAt ?? null);

    return age !== null && age > STALE_MS;
  })();
  const skewFault = status !== null && Math.abs(status.clockSkewMs) >= CLOCK_SKEW_FAULT_MS;

  return (
    <div className="border-b border-ca-border p-hmi-3" data-testid="audit-retention-tile">
      <div className="flex items-center justify-between mb-hmi-2">
        <div className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
          Audit retention
        </div>
        <div className="flex gap-hmi-2 text-hmi-caption hmi-tabular">
          {stale && (
            <span className="px-hmi-1 border border-ca-border text-ca-status-warn">STALE</span>
          )}
          {skewFault && (
            <span className="px-hmi-1 border border-ca-border text-ca-status-ng">CLOCK SKEW</span>
          )}
          {error && (
            <span className="px-hmi-1 border border-ca-border text-ca-status-ng">ERROR</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-hmi-2">
        <HeaderCell label="Last run" value={status?.lastRun ?? "never"} />
        <HeaderCell label="Next run" value={status?.nextScheduledAt ?? "unscheduled"} />
        <HeaderCell label="Cadence (h)" value={String(status?.cadenceHours ?? "-")} />
        <HeaderCell
          label="Clock skew (ms)"
          value={String(status?.clockSkewMs ?? 0)}
          tone={skewFault ? "fault" : "info"}
        />
      </div>

      <div className="mt-hmi-2 grid grid-cols-4 gap-hmi-2">
        {(status?.perPolicy ?? []).map((p) => (
          <div key={p.policy} className="border border-ca-border bg-ca-panel-2 p-hmi-2">
            <div className="text-hmi-caption text-ca-ink-muted">
              {formatIdentifierLabel(p.policy)} ({p.windowDays}d)
            </div>
            <div className="text-hmi-body hmi-tabular text-ca-ink">
              purged 24h: {p.rowsPurgedLast24h}
            </div>
            <div className="text-hmi-caption text-ca-ink-muted hmi-tabular">
              last run: {p.rowsPurgedLastRun}
              {p.batchOverrunLastRun && (
                <span className="ml-hmi-1 text-ca-status-warn">OVERRUN</span>
              )}
            </div>
            <div className="text-hmi-caption text-ca-ink-muted hmi-tabular">
              oldest: {p.oldestSurvivingTs ?? "-"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeaderCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: AuditRetentionTileToneType;
}) {
  const cls = tone === "fault" ? "text-ca-status-ng" : "text-ca-ink";

  return (
    <div className="border border-ca-border bg-ca-panel-2 p-hmi-2">
      <div className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">{label}</div>
      <div className={`text-hmi-body hmi-tabular ${cls}`}>{value}</div>
    </div>
  );
}
