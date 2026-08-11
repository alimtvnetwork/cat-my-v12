/**
 * Route: `/cli-sessions/{runId}` - drill-down for a disk-backed CLI session.
 *
 * Plan 90 Step 76. First-paint hits the static summary endpoint
 * (`GET /api/cli/sessions/{runId}`, Step 73) via `getCliSession` for
 * header + bounded backlog, then mounts `LogTailViewer` (Step 76-A) to
 * live-follow the SSE tail (Step 72).
 *
 * Deviation from plan wording: plan said
 * `src/routes/_authenticated/cli-sessions.$runId.tsx` but this project
 * has no `_authenticated` layout (Step 75 recorded the same deviation).
 * Mounted flat to match `/cli-sessions` and every sibling observability
 * route.
 *
 * Distinct from `/observability/runs/$runId` which is pure live-tail
 * with no static header. This route is reached from the `/cli-sessions`
 * list and gives operators the file metadata + backlog context BEFORE
 * the stream connects.
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useAppQuery } from "@/hooks/use-app-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { LogTailViewer } from "@/components/ops/LogTailViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCliSession } from "@/lib/observability/cliSession.functions";

export const Route = createFileRoute("/cli-sessions/$runId")({
  head: ({ params }) => ({
    meta: [
      { title: `CLI Session ${params.runId}` },
      {
        name: "description",
        content:
          "Disk-backed CLI session detail: file metadata, backlog tail, and live SSE stream from the worker or processing CLI.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `CLI Session ${params.runId}` },
      {
        property: "og:description",
        content: `File metadata, backlog tail, and live SSE stream for CLI RunId ${params.runId}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),

  component: CliSessionDetailPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();

    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-3 p-6">
        <h1 className="text-lg font-semibold">Session unavailable</h1>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Retry
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/cli-sessions">Back to sessions</Link>
          </Button>
        </div>
      </main>
    );
  },
  notFoundComponent: () => (
    <main className="mx-auto flex max-w-4xl flex-col gap-3 p-6">
      <h1 className="text-lg font-semibold">Session not found</h1>
      <Button asChild size="sm" variant="ghost">
        <Link to="/cli-sessions">Back to sessions</Link>
      </Button>
    </main>
  ),
});

function sourceTone(source: string): string {
  switch (source) {
    case "worker-cli":

      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "processing-cli":

      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "be":

      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    default:

      return "bg-muted text-muted-foreground";
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;

  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function CliSessionDetailPage() {
  const { runId } = Route.useParams();
  const fetchSession = useServerFn(getCliSession);
  const query = useAppQuery({
    queryKey: ["cli-session", runId],
    queryFn: () => fetchSession({ data: { runId, tail: 200 } }),
    refetchOnWindowFocus: false,
  });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">CLI session</h1>
          <code className="text-xs text-muted-foreground">{runId}</code>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh header
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/cli-sessions" className="inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Sessions
            </Link>
          </Button>
        </div>
      </header>

      <section className="rounded-md border bg-card p-4 text-sm">
        {query.isLoading ? (
          <p className="text-muted-foreground">Loading session metadata...</p>
        ) : query.isFail ? (
          <p className="text-destructive">
            Failed to load session: {(query.error as Error).message}
          </p>
        ) : query.data ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Source</dt>
              <dd>
                <Badge variant="outline" className={sourceTone(query.data.Summary.Source)}>
                  {query.data.Summary.Source}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Subcommand</dt>
              <dd className="font-mono text-xs">{query.data.Summary.Subcmd || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Started</dt>
              <dd className="font-mono text-xs">{query.data.Summary.StartedAt}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">PID</dt>
              <dd className="font-mono text-xs">{query.data.Summary.Pid}</dd>
            </div>
            <div className="col-span-2 md:col-span-4">
              <dt className="text-xs uppercase text-muted-foreground">Log path</dt>
              <dd className="break-all font-mono text-xs">{query.data.Summary.LogPath}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Size</dt>
              <dd className="font-mono text-xs">{formatSize(query.data.Summary.SizeBytes)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Backlog lines</dt>
              <dd className="font-mono text-xs">{query.data.TailLines}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Requested</dt>
              <dd className="font-mono text-xs">{query.data.Requested}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Dropped invalid</dt>
              <dd className="font-mono text-xs">
                {query.data.DroppedInvalid > 0 ? (
                  <span className="text-amber-400">{query.data.DroppedInvalid}</span>
                ) : (
                  "0"
                )}
              </dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Live tail</h2>
        <LogTailViewer runId={runId} follow heightClass="h-[60vh]" />
      </section>
    </main>
  );
}