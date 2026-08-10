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
  const seeded = useSeededEmptyStateAction("rulesets.list");

  if (!project) {
    console.warn("[projects/$projectId/rulesets] project not found", { projectId });

    throw notFound();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto p-hmi-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-hmi-5 flex items-end justify-between gap-hmi-4">
          <div>
            <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              {project.name}
            </p>
            <h1 className="mt-hmi-1 font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
              Rule sets
            </h1>
            <p className="mt-hmi-1 text-hmi-body text-ca-ink-muted">
              {rulesets.length} {rulesets.length === 1 ? "rule set" : "rule sets"}
            </p>
          </div>
          <Link
            to="/projects/$projectId/rulesets/new"
            params={{ projectId }}
            className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            <Plus aria-hidden size={18} />
            New rule set
          </Link>
        </header>

        {rulesets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ca-border bg-ca-panel">
            <EmptyState
              icon={ImageIcon}
              illustration={<RulesetsIllustration />}
              title={seeded.title ?? "No rule sets yet"}
              description={
                seeded.body ??
                "Author a rule set from a reference image. Trial runs and AI testing use the rules you draw here."
              }
              actions={
                seeded.cta
                  ? [
                      {
                        label: seeded.cta.label,
                        onClick: seeded.cta.onClick,
                        testId: seeded.cta.testId,
                        variant: EmptyStateActionVariantType.Secondary as const,
                      },
                    ]
                  : undefined
              }
              testId="rulesets-empty"
            />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-hmi-3 md:grid-cols-2 xl:grid-cols-3">
            {rulesets.map((r) => (
              <li key={r.id} className="relative">
                <Link
                  to="/projects/$projectId/rulesets/$rulesetId"
                  params={{ projectId, rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, r.id) }}
                  className="group flex h-full flex-col rounded-lg border border-ca-border bg-ca-panel p-hmi-4 shadow-hmi-panel transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                >
                  <h2 className="font-display text-hmi-header font-extrabold text-ca-ink">
                    {r.name}
                  </h2>
                  <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
                    {r.rules.length} {r.rules.length === 1 ? "rule" : "rules"}
                    {r.imageRef ? ", image attached" : ", no image"}
                  </p>
                  <p className="mt-hmi-1 font-mono text-hmi-caption text-ca-ink-muted">{r.id}</p>
                  <div className="mt-auto pt-hmi-3" />
                </Link>
                <RulesetTestRunPill ruleset={r} />
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
