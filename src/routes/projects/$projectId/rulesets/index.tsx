import { EmptyStateActionVariantType } from "@/components/common/EmptyState";
import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
// Rulesets list (Plan 34, step 13). Lists rule sets for the current
// project and offers a New button; step 14 (SS-03) will land the
// create-from-image route the button points at.
// Plan 87 step 23: inline "Test run" affordance so operators can dispatch
// a run against the ruleset's attached image without leaving the list.
import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import {
  Plus,
  Image as ImageIcon,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Trash2,
} from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { EmptyState } from "@/components/common/EmptyState";
import { RulesetsIllustration } from "@/components/common/EmptyStateIllustrations";
import { useSeededEmptyStateAction } from "@/lib/seed/useSeededEmptyStateAction";
import { runRuleset, useTrialStore } from "@/lib/projects/trials";
import { notifySuccess, notifyWarning } from "@/lib/notify";
import { toIntParam } from "@/lib/ids/int-alias";

export const Route = createFileRoute("/projects/$projectId/rulesets/")({
  component: RulesetsList,
  errorComponent: RulesetsError,
  notFoundComponent: RulesetsNotFound,
});

function RulesetsList() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const deleteRuleset = useProjectStore((s) => s.deleteRuleset);
  const seeded = useSeededEmptyStateAction("rulesets.list");

  if (!project) {
    console.warn("[projects/$projectId/rulesets] project not found", { projectId });

    throw notFound();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto bg-[#0b0c10] font-mono text-ca-ink antialiased p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#333] pb-4">
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="text-xl font-bold uppercase tracking-wider text-ca-ink flex items-center gap-2">
              <span className="w-2 h-2 bg-ca-primary rounded-full animate-pulse" />
              INSPECTION RULESETS
            </h1>
            <div className="flex items-center gap-2 border border-[#333] bg-[#1a1c23] px-3 py-1">
               <span className="text-xs font-bold text-ca-ink-muted uppercase tracking-widest">{project.name}</span>
            </div>
            <span className="text-xs font-bold tracking-widest tabular-nums text-ca-ink-muted">
              {rulesets.length} {rulesets.length === 1 ? "PROGRAM" : "PROGRAMS"}
            </span>
          </div>
          <Link
            to="/projects/$projectId/rulesets/new"
            params={{ projectId }}
            className="inline-flex items-center gap-2 bg-ca-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-ca-primary-hover transition-colors focus-visible:outline-none"
          >
            <Plus aria-hidden size={16} />
            NEW RULESET
          </Link>
        </header>

        {rulesets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#444] bg-[#1a1c23]">
            <ImageIcon size={48} className="text-[#444] mb-4" />
            <h2 className="text-lg font-bold text-ca-ink uppercase tracking-widest mb-2">NO RULESETS FOUND</h2>
            <p className="text-sm text-ca-ink-muted text-center max-w-sm mb-6">
              Author a ruleset from a reference image. Trial runs and AI testing use the rules you draw here.
            </p>
            <Link
              to="/projects/$projectId/rulesets/new"
              params={{ projectId }}
              className="border border-[#444] bg-transparent px-6 py-2 text-sm font-bold uppercase tracking-wider text-ca-ink hover:border-ca-primary transition-colors"
            >
              INITIALIZE RULESET
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rulesets.map((r) => (
              <li key={r.id} className="group relative flex flex-col border border-[#333] bg-[#1a1c23] transition-colors hover:border-ca-primary">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#333] transition-colors group-hover:bg-ca-primary" />
                
                <Link
                  to="/projects/$projectId/rulesets/$rulesetId"
                  params={{ projectId, rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, r.id) }}
                  className="flex flex-col h-full p-4 focus-visible:outline-none"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="font-bold text-base uppercase tracking-wider text-ca-ink truncate pr-8">
                      {r.name}
                    </h2>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-wider">
                     <span className="border border-[#444] bg-[#0b0c10] px-2 py-1 text-ca-ink-muted">
                       {r.rules.length} {r.rules.length === 1 ? "RULE" : "RULES"}
                     </span>
                     {r.imageRef ? (
                        <span className="border border-ca-primary/50 bg-ca-primary/10 px-2 py-1 text-ca-primary">
                          IMAGE SYNCED
                        </span>
                     ) : (
                        <span className="border border-yellow-500/50 bg-yellow-500/10 px-2 py-1 text-yellow-500">
                          NO IMAGE
                        </span>
                     )}
                  </div>
                  <p className="mt-4 font-mono text-[10px] text-ca-ink-muted">ID: {r.id}</p>
                </Link>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isConfirmed = window.confirm(`Delete ruleset "${r.name}"? This removes its rules from this project.`);
                    if (!isConfirmed) return;
                    deleteRuleset(r.id);
                    notifySuccess(`Ruleset "${r.name}" deleted.`);
                  }}
                  className="absolute right-3 top-3 inline-flex border border-[#444] bg-[#0b0c10] p-1.5 text-[#666] transition-colors hover:border-red-500 hover:text-red-500 focus-visible:outline-none"
                  title="Delete rule set"
                  aria-label={`Delete rule set ${r.name}`}
                >
                  <Trash2 aria-hidden size={14} />
                </button>
                
                <div className="border-t border-[#333] bg-[#0b0c10] px-4 py-2 flex items-center justify-between">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">TRIAL RUN</span>
                   <RulesetTestRunPill ruleset={r} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RulesetsError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[projects/$projectId/rulesets] error boundary", error);
    reportLovableError(error, { boundary: "projects_$projectId_rulesets_error_component" });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        Rule sets didn't load
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

function RulesetsNotFound() {
  const { projectId } = Route.useParams();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        Project not found
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
        No project matches <span className="font-mono">{projectId}</span>.
      </p>
      <Link
        to="/projects"
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        All projects
      </Link>
    </div>
  );
}

// Plan 87 step 23: Inline test-run pill positioned in the bottom-right of the
// ruleset card. Uses the ruleset's attached image (if present) to dispatch a
// synchronous trial run via the existing runRuleset facade and appends it to
// the trial store. Latest verdict is shown as a status badge next to the pill.
type RulesetLike = ReturnType<typeof selectRulesetsForProject>[number];

function RulesetTestRunPill({ ruleset }: { ruleset: RulesetLike }) {
  const appendRun = useTrialStore((s) => s.appendRun);
  const latest = useTrialStore((s) => (s.runsByRuleset[ruleset.id] ?? [])[0] ?? null);
  const [running, setRunning] = useState(false);
  const canRun = Boolean(ruleset.imageRef) && ruleset.rules.length > 0;

  const verdictBadge = useMemo(() => {
    if (!latest) return null;

    if (latest.verdict === "OK") return { Icon: CheckCircle2, cls: "text-ca-ok", label: "Pass" };

    if (latest.verdict === "NG") return { Icon: XCircle, cls: "text-ca-danger", label: "Fail" };

    return { Icon: MinusCircle, cls: "text-ca-ink-muted", label: "Skipped" };
  }, [latest]);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!canRun || running) return;
    setRunning(true);
    try {
      const run = runRuleset({
        rulesetId: ruleset.id,
        imageRef: ruleset.imageRef ?? "",
        rules: ruleset.rules,
      });
      appendRun(run);
      console.info("[rulesets/list] inline test run", {
        rulesetId: ruleset.id,
        runId: run.id,
        verdict: run.verdict,
      });

      if (run.verdict === "OK") notifySuccess(`${ruleset.name}: pass`);
      else notifyWarning(`${ruleset.name}: fail`);
    } catch (err) {
      console.error("[rulesets/list] inline test run failed", err);
      reportLovableError(err instanceof Error ? err : new Error(String(err)), {
        boundary: "rulesets_list_inline_test_run",
      });
      notifyWarning("Test run failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-hmi-4 bottom-hmi-3 flex items-center justify-between gap-hmi-2">
      {verdictBadge ? (
        <span
          className={`pointer-events-auto inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-bg/60 px-hmi-2 py-[2px] text-hmi-caption ${verdictBadge.cls}`}
          title={`Last run ${new Date(latest!.createdAt).toLocaleString()}`}
        >
          <verdictBadge.Icon aria-hidden size={12} />
          {verdictBadge.label}
        </span>
      ) : (
        <span aria-hidden />
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={!canRun || running}
        className="pointer-events-auto ca-focus-ring inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-bg/80 px-hmi-2 py-[2px] text-hmi-caption font-semibold text-ca-ink transition hover:border-ca-select hover:text-ca-select disabled:cursor-not-allowed disabled:opacity-50"
        title={
          canRun ? "Test run against the attached image" : "Attach an image to enable test run"
        }
        data-testid={`ruleset-test-run-${ruleset.id}`}
      >
        {running ? (
          <Loader2 aria-hidden size={12} className="animate-spin" />
        ) : (
          <Play aria-hidden size={12} />
        )}
        {running ? "Running" : "Test run"}
      </button>
    </div>
  );
}
