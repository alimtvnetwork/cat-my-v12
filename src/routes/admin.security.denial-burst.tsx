// Plan 51 slice-1: Denial-burst dashboard route.
//
// Route path chosen: `/admin/security/denial-burst`. No `_authenticated`
// layout exists in this repo yet; the parent Plan 51 file assumed one. We
// call `getDenialBurstWindow` from the component via `useServerFn` so the
// auth middleware runs at request time; a public loader would fail SSR with
// "Unauthorized: No authorization header provided" (see
// tanstack-execution-model rules). Admin gating happens server-side inside
// the server-fn (throws typed `E_SEC_ROLE_DENIED`); non-admin callers see
// the deny card below.

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAppQuery } from "@/hooks/use-app-query";
import { useMemo } from "react";
import { getDenialBurstWindow } from "@/lib/security-telemetry.functions";
import { computeBurstPercentiles } from "@/lib/denial-burst-query";
import { HmiShell } from "@/components/hmi";

const SHELL_TITLE = "Denial-burst dashboard";

export const Route = createFileRoute("/admin/security/denial-burst")({
  head: () => ({
    meta: [
      { title: "Denial-burst dashboard, Control Automation" },
      {
        name: "description",
        content:
          "Admin-gated view of denial-burst percentiles per (1m, 5m, 15m) window with the last 50 audit rows.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DenialBurstPage,
});

function DenialBurstPage() {
  const fetchWindow = useServerFn(getDenialBurstWindow);
  const q = useAppQuery({
    queryKey: ["denial-burst-window", 24],
    queryFn: () => fetchWindow({ data: { hours: 24 } }),
    staleTime: 30_000,
    retry: 1,
  });

  const rows = useMemo(() => q.data?.rows ?? [], [q.data?.rows]);
  const percentiles = useMemo(() => computeBurstPercentiles(rows), [rows]);

  if (q.isPending) {
    return (
      <HmiShell title={SHELL_TITLE}>
        <div className="p-6 text-sm text-muted-foreground" data-testid="denial-burst-loading">
          Loading denial-burst window...
        </div>
      </HmiShell>
    );
  }

  if (q.isFail) {
    const msg = q.error instanceof Error ? q.error.message : String(q.error);
    const isRoleDenied =
      msg.toLowerCase().includes("role required") || msg.includes("E_SEC_ROLE_DENIED");

    return (
      <HmiShell title={SHELL_TITLE}>
        <div className="p-6" data-testid="denial-burst-error">
          <h1 className="text-xl font-semibold">Denial-burst dashboard</h1>
          <p className="mt-2 text-sm text-ca-status-ng">
            {isRoleDenied ? "Admin role required." : `Failed to load: ${msg}`}
          </p>
        </div>
      </HmiShell>
    );
  }

  return (
    <HmiShell title={SHELL_TITLE}>
      <div className="p-6" data-testid="denial-burst-page">
        <header className="mb-4">
          <h1 className="text-xl font-semibold">Denial-burst dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Last {q.data?.hours ?? 24}h since {q.data?.cutoffIso ?? "-"}. Tuning:{" "}
            {q.data?.tuningVersion ?? "-"}.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3" data-testid="denial-burst-cards">
          {percentiles.map((p) => (
            <div
              key={p.windowSeconds}
              data-testid={`denial-burst-card-${p.windowSeconds}`}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {p.windowSeconds === 60
                  ? "1 minute"
                  : p.windowSeconds === 300
                    ? "5 minutes"
                    : "15 minutes"}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <Metric label="p50" value={p.p50} />
                <Metric label="p95" value={p.p95} />
                <Metric label="p99" value={p.p99} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">buckets: {p.buckets}</div>
            </div>
          ))}
        </section>

        <section className="mt-6" aria-label="Recent denial events">
          <h2 className="mb-2 text-sm font-semibold">
            Recent events ({Math.min(rows.length, 50)} of {rows.length})
          </h2>
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-xs" data-testid="denial-burst-table">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2">Timestamp</th>
                  <th className="p-2">Code</th>
                  <th className="p-2">Correlation</th>
                  <th className="p-2">Payload</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r) => (
                  <tr key={r.event_id} className="border-t border-border">
                    <td className="p-2 font-mono">{r.ts}</td>
                    <td className="p-2 font-mono">{r.code}</td>
                    <td className="p-2 font-mono">{r.correlation_id}</td>
                    <td className="p-2 font-mono">{safeJson(r.payload)}</td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      No denial events in window.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </HmiShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-base" data-testid={`metric-${label}`}>
        {value}
      </div>
    </div>
  );
}

function safeJson(v: unknown): string {
  try {
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}
