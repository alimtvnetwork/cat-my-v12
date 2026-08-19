// Trial run results detail (Plan 34 companion). Shows outputs (per-rule
// score, verdict, kind), engine logs captured during the run, and the
// aggregate pass/fail status. Read-only; runs are immutable once appended.
import { useEffect, useMemo } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useProjectStore, selectProject, selectRuleset } from "@/lib/projects/store";
import { useTrialStore, selectRunById } from "@/lib/projects/trials";
import { editorKindLabel } from "@/lib/editor/tools";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export const Route = createFileRoute("/projects/$projectId/trial-run/$runId")({
  component: TrialRunResults,
  errorComponent: TrialRunResultsError,
  notFoundComponent: TrialRunResultsNotFound,
});

function TrialRunResults() {
  const { projectId, runId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const run = useTrialStore((s) => selectRunById(s, runId));
  const ruleset = useProjectStore((s) => (run ? selectRuleset(s, run.rulesetId) : undefined));

  if (!project) {
    console.warn("[trial-run/$runId] project not found", { projectId });

    throw notFound();
  }

  if (!run) {
    console.warn("[trial-run/$runId] run not found", { runId });

    throw notFound();
  }

  if (!ruleset || ruleset.projectId !== projectId) {
    console.warn("[trial-run/$runId] ruleset mismatch", {
      runId,
      projectId,
      rulesetId: run.rulesetId,
    });

    throw notFound();
  }

  const okCount = useMemo(
    () => run.results.filter((r) => r.verdict === "OK").length,
    [run.results],
  );
  const ngCount = run.results.length - okCount;
  const threshold = run.threshold ?? 0.5;
  const StatusIcon = run.verdict === "OK" ? CheckCircle2 : XCircle;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto p-hmi-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-hmi-5">
          <Link
            to="/projects/$projectId/trial-run"
            params={{ projectId }}
            className="inline-flex items-center gap-hmi-1 text-hmi-caption uppercase tracking-wide text-ca-ink-muted hover:text-ca-ink"
          >
            <ArrowLeft aria-hidden size={14} /> Trial run
          </Link>
          <h1 className="mt-hmi-2 font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
            Run results
          </h1>
          <p className="mt-hmi-1 text-hmi-body text-ca-ink-muted">
            {ruleset.name} · {new Date(run.createdAt).toLocaleString()}
            {typeof run.durationMs === "number" ? ` · ${run.durationMs} ms` : ""}
          </p>
          <p className="mt-hmi-1 font-mono text-hmi-caption text-ca-ink-muted">{run.id}</p>
        </header>

        <section
          aria-label="Run summary"
          className={`mb-hmi-5 flex items-center gap-hmi-4 rounded-lg border p-hmi-4 ${
            run.verdict === "OK" ? "border-ca-ok/40 bg-ca-ok/5" : "border-ca-ng/40 bg-ca-ng/5"
          }`}
        >
          <StatusIcon
            aria-hidden
            size={40}
            className={run.verdict === "OK" ? "text-ca-ok" : "text-ca-ng"}
          />
          <div className="min-w-0">
            <p
              className={`font-display text-hmi-header font-extrabold uppercase tracking-wide ${
                run.verdict === "OK" ? "text-ca-ok" : "text-ca-ng"
              }`}
            >
              {run.verdict === "OK" ? "Pass" : "Fail"}
            </p>
            <p className="text-hmi-caption text-ca-ink-muted">
              {okCount} passed, {ngCount} failed, of {run.results.length} rules · threshold{" "}
              {threshold.toFixed(2)}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-hmi-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-label="Outputs" className="rounded-lg border border-ca-border bg-ca-panel">
            <header className="border-b border-ca-border px-hmi-3 py-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              Outputs
            </header>
            {run.results.length === 0 ? (
              <p className="p-hmi-4 text-hmi-body text-ca-ink-muted">
                No rules ran (all were hidden).
              </p>
            ) : (
              <table className="w-full text-hmi-body">
                <thead>
                  <tr className="border-b border-ca-border text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                    <th className="px-hmi-3 py-hmi-2 text-left">Rule</th>
                    <th className="px-hmi-3 py-hmi-2 text-left">Kind</th>
                    <th className="px-hmi-3 py-hmi-2 text-right">Score</th>
                    <th className="px-hmi-3 py-hmi-2 text-right">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {run.results.map((r) => (
                    <tr key={r.ruleId} className="border-b border-ca-border/60 last:border-0">
                      <td className="px-hmi-3 py-hmi-2 text-ca-ink">{r.ruleName}</td>
                      <td className="px-hmi-3 py-hmi-2 text-ca-ink-muted">
                        {editorKindLabel(r.kind)}
                      </td>
                      <td className="px-hmi-3 py-hmi-2 text-right font-mono text-ca-ink">
                        {r.score.toFixed(3)}
                      </td>
                      <td className="px-hmi-3 py-hmi-2 text-right">
                        <span
                          className={`inline-flex items-center rounded-sm px-hmi-2 py-hmi-1 text-hmi-caption font-semibold ${
                            r.verdict === "OK" ? "bg-ca-ok/10 text-ca-ok" : "bg-ca-ng/10 text-ca-ng"
                          }`}
                        >
                          {r.verdict}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <aside
            aria-label="Logs"
            className="flex min-h-0 flex-col rounded-lg border border-ca-border bg-ca-panel"
          >
            <header className="flex items-center justify-between border-b border-ca-border px-hmi-3 py-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              <span>Logs</span>
              <span>{run.logs?.length ?? 0}</span>
            </header>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-hmi-3 font-mono text-hmi-caption text-ca-ink">
              {(run.logs ?? ["No logs captured for this run."]).join("\n")}
            </pre>
          </aside>
        </div>

        {run.imageRef ? (
          <section
            aria-label="Image"
            className="mt-hmi-5 rounded-lg border border-ca-border bg-ca-panel p-hmi-3"
          >
            <p className="mb-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              Image
            </p>
            <img
              src={run.imageRef}
              alt="Trial run source"
              className="mx-auto max-h-[60vh] w-auto rounded-sm border border-ca-border object-contain"
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}

function TrialRunResultsError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[trial-run/$runId] error boundary", error);
    reportLovableError(error, { boundary: "projects_$projectId_trial_run_$runId_error_component" });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        Run results didn't load
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">{error.message}</p>
      <button
        type="button"
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}

function TrialRunResultsNotFound() {
  const { projectId, runId } = Route.useParams();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        Run not found
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
        No trial run matches <span className="font-mono">{runId}</span>.
      </p>
      <Link
        to="/projects/$projectId/trial-run"
        params={{ projectId }}
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        Back to Trial run
      </Link>
    </div>
  );
}
