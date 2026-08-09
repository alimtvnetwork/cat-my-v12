/**
 * Route: `/cli/sessions` - CLI runs list, nested under the `/cli` layout.
 *
 * Plan 90 Step 107. Nested-child sibling to the pre-existing flat
 * `/cli-sessions` route: the flat route (Step 75) reads disk JSONL directly
 * via `getCliSessions`; this nested route reads the Root-DB projection via
 * `getObservabilitySessions` (BE `GET /observability/sessions`, Plan 90
 * Step 71/72). Both surfaces are intentional and documented on the layout
 * shell (`src/routes/cli.tsx`, Plan 90 Step 106):
 *   - Root-DB-backed rows carry the fields Step 107 specifies verbatim
 *     (`StartedAt`, `CliName`, `Subcommand` as "Command", `ExitCode`,
 *     `DurationMs`). Disk-backed rows do not have `ExitCode`/`DurationMs`
 *     until the session ends, which is why Step 107 pins to the Root-DB
 *     projection.
 *   - Deep-link contract stays consistent with sibling observability
 *     routes: rows navigate to `/observability/sessions/$cliInvocationId/logs`
 *     (Steps 108-110 will land the drill-down at `/cli/sessions/$sessionId`
 *     and replace this Link then).
 *
 * Root cause guarded: without this nested route the `/cli` shell's Sessions
 * tab still had to point at `/cli-sessions` (documented deviation in
 * `cli.tsx`), so Steps 108-116 could not deep-link relative to `/cli/*`
 * without breaking TanStack Router's type-safe `to=` check.
 *
 * `robots: noindex`: internal operator screen.
 */
import { pausePollOnError } from "@/lib/react-query/poll";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAppQuery } from "@/hooks/use-app-query";
import { Loader2, RefreshCw, AlertTriangle, Terminal } from "lucide-react";

import {
  getObservabilitySessions,
  type ObservabilitySession,
} from "@/lib/observability/sessions.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusPill, toneForExitCode } from "@/components/cli/status-pill";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/cli/EmptyState";
import { TableSkeleton } from "@/components/cli/ListSkeleton";
import { CliRouteError } from "@/components/cli/CliRouteError";
import { CliRouteNotFound } from "@/components/cli/CliRouteNotFound";

export const Route = createFileRoute("/cli/sessions")({
  head: () => ({
    meta: [
      { title: "CLI Sessions" },
      {
        name: "description",
        content:
          "Recent worker-cli and processing-cli runs with exit codes and durations, sourced from the Root-DB session projection.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "CLI Sessions" },
      {
        property: "og:description",
        content: "Recent worker-cli and processing-cli runs with exit codes and durations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CliSessionsNested,
  errorComponent: (props) => <CliRouteError {...props} title="Failed to load CLI sessions" />,
  notFoundComponent: () => (
    <CliRouteNotFound
      icon={Terminal}
      title="Session not found"
      body="It may have been garbage-collected after 14 days, or the run id is a typo. Sessions older than the retention window are pruned by the CLI janitor."
    />
  ),
});

function formatTs(ts: number | null): string {
  if (ts == null) return "-";
  try {
    return new Date(ts * 1000).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return String(ts);
  }
}

function formatDuration(ms: number | null, endedAt: number | null): string {
  if (ms == null) return endedAt == null ? "running..." : "-";

  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;

  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s - m * 60);

  return `${m}m ${rem}s`;
}

function ExitBadge({ code, endedAt }: { code: number | null; endedAt: number | null }) {
  // Delegates to the shared StatusPill (Plan 90 Step 124). Tone mapping
  // is now the single source of truth in `status-pill.tsx`.
  const tone = toneForExitCode(code, endedAt);
  const label = endedAt == null ? "running" : code == null ? "?" : String(code);

  return <StatusPill tone={tone} label={label} outline />;
}

function CliBadge({ name }: { name: string }) {
  const variant =
    name === "worker-cli" ? "default" : name === "processing-cli" ? "secondary" : "outline";

  return <Badge variant={variant}>{name}</Badge>;
}

function CliSessionsNested() {
  const fetchSessions = useServerFn(getObservabilitySessions);
  const query = useAppQuery({
    queryKey: ["cli-sessions-nested", { limit: 50, sort: "StartedAt", dir: "desc" }],
    queryFn: () =>
      fetchSessions({
        data: { limit: 50, sort: "StartedAt" as const, dir: "desc" as const },
      }),
    refetchInterval: pausePollOnError(5000),
    meta: { hasVisibility: false },
    refetchIntervalInBackground: false,
  });

  const items: ObservabilitySession[] = query.data?.items ?? [];

  return (
    <section className="flex flex-col gap-hmi-3">
      <header className="flex items-center justify-between gap-hmi-2">
        <div className="flex flex-col">
          <h1 className="text-hmi-h2 font-semibold text-ca-ink">CLI Sessions</h1>
          <p className="text-hmi-caption text-ca-ink-muted">
            Root-DB projection of recent CLI runs. Auto-refresh every 5 s.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </header>

      {query.isFail && (
        <div
          role="alert"
          className="flex items-start gap-hmi-2 rounded-hmi-sm border border-destructive/40 bg-destructive/5 p-hmi-3 text-hmi-body text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Failed to load CLI sessions</div>
            <code className="text-hmi-caption opacity-80">
              {query.error instanceof Error ? query.error.message : String(query.error)}
            </code>
          </div>
        </div>
      )}

      {query.isPending && !query.data ? (
        <TableSkeleton columns={5} rows={6} testId="cli-sessions-skeleton" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title="No CLI sessions recorded yet"
          body={
            <>
              Run <code className="font-mono">worker-cli</code> or{" "}
              <code className="font-mono">processing-cli</code> to produce one.
            </>
          }
          testId="cli-sessions-empty"
        />
      ) : (
        <div className={cn("overflow-x-auto rounded-hmi-sm border border-ca-border bg-ca-surface")}>
          <table className="w-full text-hmi-body">
            <thead className="bg-ca-surface-alt text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              <tr>
                <th className="px-hmi-3 py-hmi-2 text-left">Started At</th>
                <th className="hidden px-hmi-3 py-hmi-2 text-left md:table-cell">CLI</th>
                <th className="px-hmi-3 py-hmi-2 text-left">Command</th>
                <th className="px-hmi-3 py-hmi-2 text-left">Exit</th>
                <th className="hidden px-hmi-3 py-hmi-2 text-left md:table-cell">Duration</th>
                <th className="px-hmi-3 py-hmi-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.CliInvocationId} className="border-t border-ca-border">
                  <td className="px-hmi-3 py-hmi-2 font-mono text-hmi-caption">
                    {formatTs(s.StartedAt)}
                  </td>
                  <td className="hidden px-hmi-3 py-hmi-2 md:table-cell">
                    <CliBadge name={s.CliName} />
                  </td>
                  <td className="px-hmi-3 py-hmi-2 font-mono text-hmi-caption text-ca-ink">
                    {s.Subcommand ?? "-"}
                  </td>
                  <td className="px-hmi-3 py-hmi-2">
                    <ExitBadge code={s.ExitCode} endedAt={s.EndedAt} />
                  </td>
                  <td className="hidden px-hmi-3 py-hmi-2 font-mono text-hmi-caption md:table-cell">
                    {formatDuration(s.DurationMs, s.EndedAt)}
                  </td>
                  <td className="px-hmi-3 py-hmi-2 text-right">
                    <Link
                      to="/observability/sessions/$cliInvocationId/logs"
                      params={{ cliInvocationId: s.CliInvocationId }}
                      className="text-hmi-caption text-ca-accent underline-offset-2 hover:underline"
                    >
                      Logs
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
