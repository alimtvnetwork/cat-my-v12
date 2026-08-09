// Plan 64 step 78: Runs tab. Lists in-flight ops from `useRunning()` and
// shows an empty state for the persisted history until step 85's `runs`
// table lands.
import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle, Loader2 } from "lucide-react";
import { useRunning } from "@/hooks/useRunning";

export const Route = createFileRoute("/projects/$projectId/runs")({
  staticData: { crumb: "Runs" },
  component: ProjectRunsTab,
});

function ProjectRunsTab() {
  const { projectId } = Route.useParams();
  const { ops } = useRunning();
  const runOps = ops.filter((o) => o.kind === "run");

  return (
    <section
      aria-labelledby="runs-tab-heading"
      className="mx-auto w-full max-w-4xl p-hmi-6"
      data-project-id={projectId}
    >
      <h2 id="runs-tab-heading" className="flex items-center gap-2 text-hmi-title text-ca-ink">
        <PlayCircle className="h-5 w-5 text-ca-primary" aria-hidden /> Runs
      </h2>
      {runOps.length > 0 ? (
        <ul
          aria-label="In-flight runs"
          className="mt-3 divide-y divide-ca-border rounded-md border border-ca-border"
        >
          {runOps.map((op) => (
            <li key={op.id} className="flex items-center justify-between px-3 py-2">
              <span className="flex items-center gap-2 text-hmi-body text-ca-ink">
                <Loader2 className="h-4 w-4 animate-spin text-ca-primary" aria-hidden />
                <span className="truncate">{op.label}</span>
              </span>
              <span className="text-hmi-caption text-ca-ink-muted">
                {new Date(op.startedAt).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-hmi-body text-ca-ink-muted" role="status">
        {runOps.length === 0
          ? "No runs in flight. Persisted run history lands with the step 85 migration bundle."
          : "Persisted run history lands with the step 85 migration bundle."}
      </p>
    </section>
  );
}
