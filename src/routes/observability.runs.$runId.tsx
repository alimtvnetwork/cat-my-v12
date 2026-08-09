/**
 * Route: `/observability/runs/{runId}` - live SSE tail for a CLI run.
 *
 * Plan 90 Step 77. Third FE surface for CLI observability, and the first
 * consumer of the streaming path built in Steps 72-76:
 *   BE disk tail (Step 72) -> TanStack SSE proxy (Step 73) ->
 *   `useSessionLogTail` (Step 74) -> auto-reconnect (Step 75) ->
 *   `LogTailViewer` (Step 76) -> THIS ROUTE.
 *
 * Root cause guarded (one sentence): Step 76 shipped the viewer
 * component but no route mounted it, so the SSE stack was reachable but
 * still had no operator entry point in the app shell.
 *
 * Notes:
 *  - Distinct from `/observability/sessions/{cliInvocationId}/logs`
 *    (polling-based, keyed by DB invocation id). This route is keyed by
 *    the disk `RunId` used by the JSONL writer + SSE endpoint.
 *  - `robots: noindex`: internal operator surface.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { LogTailViewer } from "@/components/ops/LogTailViewer";

export const Route = createFileRoute("/observability/runs/$runId")({
  head: () => ({
    meta: [
      { title: "Live Run Tail, Observability" },
      {
        name: "description",
        content:
          "Live SSE tail of a worker-cli or processing-cli run's JSONL log with auto-reconnect and drift toasts.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RunLiveTailPage,
});

function RunLiveTailPage() {
  const { runId } = Route.useParams();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">Live run tail</h1>
          <code className="text-xs text-muted-foreground">{runId}</code>
        </div>
        <Link
          to="/observability/sessions"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sessions
        </Link>
      </header>
      <LogTailViewer runId={runId} follow heightClass="h-[70vh]" />
    </main>
  );
}
