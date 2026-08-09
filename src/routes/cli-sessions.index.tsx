/**
 * Route: `/cli-sessions` - disk-backed CLI session list.
 *
 * Plan 90 Step 75. First operator surface for the disk-backed enumerator
 * `GET /api/cli/sessions` (Step 71). Complements `/observability/sessions`
 * (Root-DB-backed): this page shows JSONL files as they exist on the host
 * even when the Root-DB writer is unavailable or lagging, so operators
 * can still triage a failed run.
 *
 * Plan wording said `_authenticated/cli-sessions.tsx`; there is no
 * `_authenticated` layout in this project (all sibling observability
 * routes are flat), so the file is mounted flat to match the project's
 * actual convention. Documenting the deviation instead of inventing an
 * unrelated auth gate.
 *
 * Each row deep-links to `/observability/runs/{runId}` (Step 77's live
 * SSE tail viewer). Rows with `RunId=null` (unreadable/corrupt first
 * line) are shown with a disabled link and a status pill so operators
 * see the file exists.
 *
 * `robots: noindex`: internal operator screen.
 */
import { pausePollOnError } from "@/lib/react-query/poll";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAppQuery } from "@/hooks/use-app-query";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";

import { getCliSessions, type CliSessionSummary } from "@/lib/observability/cliSessions.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/cli-sessions/")({
  head: () => ({
    meta: [
      { title: "CLI Sessions, Observability" },
      {
        name: "description",
        content:
          "Disk-backed list of worker-cli and processing-cli JSONL sessions with deep-links to the live SSE tail viewer.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "CLI Sessions, Observability" },
      {
        property: "og:description",
        content:
          "Enumerate on-disk CLI JSONL sessions with size, first-seen, and RunId deep-links to the live SSE tail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),

  component: CliSessionsPage,
});

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;

  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;

  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

function SourceBadge({ source }: { source: string }) {
  // Source is the closest disk-side analog to a run status: the DB is
  // silent about "did this run finish", but the source tag tells the
  // operator which CLI produced the file.
  const variant =
    source === "worker-cli" ? "default" : source === "processing-cli" ? "secondary" : "outline";

  return <Badge variant={variant}>{source}</Badge>;
}

function CliSessionsPage() {
  const fetchSessions = useServerFn(getCliSessions);
  const query = useAppQuery({
    queryKey: ["cli-sessions", { limit: 50 }],
    queryFn: () => fetchSessions({ data: { limit: 50 } }),
    // Auto-refresh is intentional: this is a live-ops screen and 5 s
    // matches `/observability/sessions`. Kept off `refetchInterval` when
    // the tab is hidden to avoid pointless background work.
    refetchInterval: pausePollOnError(5000),
    refetchIntervalInBackground: false,
    meta: { hasVisibility: false },
  });

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">CLI sessions (disk)</h1>
          <p className="text-xs text-muted-foreground">
            JSONL files under <code>APP_LOG_ROOT</code>. Auto-refresh every 5 s.
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
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Failed to load CLI sessions</div>
            <code className="text-xs opacity-80">
              {query.error instanceof Error ? query.error.message : String(query.error)}
            </code>
          </div>
        </div>
      )}

      {query.isPending && !query.data ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading sessions...
        </div>
      ) : (
        <SessionsTable items={query.data?.items ?? []} />
      )}
    </main>
  );
}

function SessionsTable({ items }: { items: CliSessionSummary[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No CLI sessions on disk yet. Run <code>worker-cli</code> or <code>processing-cli</code> to
        produce one.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Started</th>
            <th className="px-3 py-2">Subcmd</th>
            <th className="px-3 py-2">PID</th>
            <th className="px-3 py-2">Size</th>
            <th className="px-3 py-2">RunId</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => {
            const key = `${s.LogPath}`;

            return (
              <tr key={key} className="border-t">
                <td className="px-3 py-2">
                  <SourceBadge source={s.Source} />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{s.StartedAt}</td>
                <td className="px-3 py-2">{s.Subcmd}</td>
                <td className="px-3 py-2 font-mono text-xs">{s.Pid}</td>
                <td className="px-3 py-2 text-xs">{formatBytes(s.SizeBytes)}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {s.RunId ?? <span className="text-muted-foreground italic">unreadable</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  {s.RunId ? (
                    <div className="flex justify-end gap-3">
                      <Link
                        to="/cli-sessions/$runId"
                        params={{ runId: s.RunId }}
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        Details
                      </Link>
                      <Link
                        to="/observability/runs/$runId"
                        params={{ runId: s.RunId }}
                        className="text-xs text-primary underline-offset-2 hover:underline"
                      >
                        Live tail
                      </Link>
                    </div>
                  ) : (
                    <span
                      className="text-xs text-muted-foreground"
                      title="First JSONL line was unreadable; no RunId to deep-link with"
                    >
                      -
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
