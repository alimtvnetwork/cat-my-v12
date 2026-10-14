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

  const okCount = useMemo(
    () => (run ? run.results.filter((r) => r.verdict === "OK").length : 0),
    [run],
  );

  if (!project) {
    if (typeof window === "undefined") {
      return null;
    }

    console.warn("[trial-run/$runId] project not found", { projectId });

    return <TrialRunResultsNotFound />;
  }

  if (!run) {
    if (typeof window === "undefined") {
      return null;
    }

    console.warn("[trial-run/$runId] run not found", { runId });

    return <TrialRunResultsNotFound />;
  }

  if (!ruleset || (project && ruleset.projectId !== project.id)) {
    if (typeof window === "undefined") {
      return null;
    }

    console.warn("[trial-run/$runId] ruleset mismatch", {
      runId,
      projectId,
      expectedProjectId: project?.id,
      actualProjectId: ruleset?.projectId,
      rulesetId: run.rulesetId,
    });

    return <TrialRunResultsNotFound />;
  }
  const ngCount = run.results.length - okCount;
  const threshold = run.threshold ?? 0.5;
  const StatusIcon = run.verdict === "OK" ? CheckCircle2 : XCircle;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto bg-[#06080d] text-slate-100 font-sans antialiased p-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6">
          <Link
            to="/projects/$projectId/trial-run"
            params={{ projectId }}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft aria-hidden size={14} /> Back to Trial Run Console
          </Link>
          <h1 className="mt-2 text-base font-bold uppercase tracking-widest text-slate-100 font-mono">
            Execution Results & Telemetry
          </h1>
          <p className="mt-1 text-xs text-slate-400 font-mono">
            {ruleset.name} · {new Date(run.createdAt).toLocaleString()}
            {typeof run.durationMs === "number" ? ` · ${run.durationMs} ms` : ""}
          </p>
          <span className="mt-1.5 inline-block text-[10px] font-mono text-slate-400 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">
            RUN // {run.id}
          </span>
        </header>

        <section
          aria-label="Run summary"
          className={`mb-6 flex items-center gap-5 rounded-2xl border p-5 backdrop-blur-xl ${
            run.verdict === "OK"
              ? "border-emerald-500/30 bg-emerald-950/20 shadow-[0_0_24px_rgba(16,185,129,0.15)]"
              : "border-rose-500/30 bg-rose-950/20 shadow-[0_0_24px_rgba(244,63,94,0.15)]"
          }`}
        >
          <StatusIcon
            aria-hidden
            size={40}
            className={run.verdict === "OK" ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]"}
          />
          <div className="min-w-0">
            <p
              className={`text-2xl font-bold font-mono uppercase tracking-wider ${
                run.verdict === "OK" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {run.verdict === "OK" ? "VERDICT: PASS" : "VERDICT: FAIL"}
            </p>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              {okCount} passed, {ngCount} failed, of {run.results.length} rules · threshold{" "}
              {threshold.toFixed(2)}
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section aria-label="Outputs" className="rounded-2xl border border-white/[0.08] bg-[#0a0d14]/85 overflow-hidden backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_12px_32px_-8px_rgba(0,0,0,0.6)]">
            <header className="border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
              Evaluation Metrics
            </header>
            {run.results.length === 0 ? (
              <p className="p-6 text-xs font-mono text-slate-400">
                No rules ran (all were hidden).
              </p>
            ) : (
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/[0.02]">
                    <th className="px-4 py-2.5 text-left">Rule</th>
                    <th className="px-4 py-2.5 text-left">Kind</th>
                    <th className="px-4 py-2.5 text-right">Score</th>
                    <th className="px-4 py-2.5 text-right">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {run.results.map((r) => (
                    <tr key={r.ruleId} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-200 font-bold">{r.ruleName}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {editorKindLabel(r.kind)}
                      </td>
                      <td className="px-4 py-3 text-xs text-right font-mono text-slate-200">
                        {r.score.toFixed(3)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider ${
                            r.verdict === "OK"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
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
            className="rounded-2xl border border-white/[0.08] bg-[#050608] overflow-hidden flex min-h-0 flex-col shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_12px_32px_-8px_rgba(0,0,0,0.6)]"
          >
            <header className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs font-mono font-bold uppercase tracking-widest text-slate-400">
              <span>Telemetry Logs</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {run.logs?.length ?? 0} events
              </span>
            </header>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-4 font-mono text-xs text-emerald-400 leading-relaxed">
              {(run.logs ?? ["No logs captured for this run."]).join("\n")}
            </pre>
          </aside>
        </div>

        {run.imageRef ? (
          <section
            aria-label="Image"
            className="mt-6 rounded-2xl border border-white/[0.08] bg-[#0a0d14]/85 p-4 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_12px_32px_-8px_rgba(0,0,0,0.6)]"
          >
            <p className="mb-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Captured Workpiece Image
            </p>
            <img
              src={run.imageRef}
              alt="Trial run source"
              className="mx-auto max-h-[60vh] w-auto rounded-xl border border-white/[0.1] object-contain shadow-2xl"
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
