import { RunningOpKindType } from "@/lib/stores/running-ops-store";
// Project overview index (Plan 34, step 11). Renders inside the
// projects.$projectId layout's <Outlet />, so it does NOT re-mount
// HmiShell or SectionTopBar. Shows project name, ruleset count, quick
// links to the plan's project sub-surfaces, and a legacy operator group.
import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Layers, Plus } from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import { resolveIdParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";
import { WorkpieceAnalyzeWorkspace } from "@/components/vision/workpiece";

interface ProjectOverviewSearch {
  ruleset?: string;
  rule?: string;
}

export const Route = createFileRoute("/projects/$projectId/")({
  validateSearch: (search: Record<string, unknown>): ProjectOverviewSearch => {
    const ruleset = typeof search.ruleset === "string" && search.ruleset.length > 0 ? search.ruleset : undefined;
    const rule = typeof search.rule === "string" && search.rule.length > 0 ? search.rule : undefined;

    return { ruleset, rule };
  },
  component: ProjectOverview,
  errorComponent: OverviewError,
  notFoundComponent: OverviewNotFound,
});

function ProjectOverview() {
  const { projectId } = Route.useParams();
  const { ruleset: rulesetSearchParam, rule: ruleSearchParam } = Route.useSearch();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const [activeRulesetId, setActiveRulesetId] = useState<string | null>(rulesetSearchParam ?? null);

  useEffect(() => {
    if (rulesetSearchParam) {
      setActiveRulesetId(rulesetSearchParam);
    }
  }, [rulesetSearchParam]);

  if (!project) {
    console.warn("[projects/$projectId/index] project not found", { projectId });

    throw notFound();
  }

  const activeRuleset =
    (activeRulesetId
      ? rulesets.find(
          (r) =>
            r.id === activeRulesetId ||
            resolveIdParam(IntAliasNamespaceType.Ruleset, r.id) === activeRulesetId ||
            resolveIdParam(IntAliasNamespaceType.Ruleset, activeRulesetId) === r.id,
        )
      : null) ?? rulesets[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#07090e]">
      {activeRuleset ? (
        <WorkpieceAnalyzeWorkspace
          key={activeRuleset.id}
          project={project}
          ruleset={activeRuleset}
          rulesets={rulesets}
          searchRule={ruleSearchParam}
          onSelectRuleset={(rid) => setActiveRulesetId(rid)}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-8">
          <div
            data-tour="project-overview-empty"
            className="flex max-w-sm flex-col items-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center shadow-2xl backdrop-blur-xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
              <Layers size={22} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">No Rulesets Defined</h3>
            <p className="mt-1 text-xs text-white/50">
              Create an inspection ruleset program to begin automated vision analysis.
            </p>
            <Link
              data-tour="project-overview-add-ruleset"
              to="/projects/$projectId/rulesets/new"
              params={{ projectId }}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ca-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-ca-primary/20 transition hover:brightness-110"
            >
              <Plus size={14} />
              New Ruleset
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewError() {
  return (
    <div className="flex h-full items-center justify-center bg-[#07090e] p-8">
      <div className="max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center backdrop-blur-xl">
        <h2 className="mb-2 text-lg font-bold uppercase tracking-wider text-rose-400">Error loading project overview</h2>
        <p className="text-xs text-white/60">Please try again or return to the projects database.</p>
      </div>
    </div>
  );
}

function OverviewNotFound() {
  return (
    <div className="flex h-full items-center justify-center bg-[#07090e] p-8">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center backdrop-blur-xl">
        <h2 className="mb-2 text-lg font-bold uppercase tracking-wider text-white">Project Overview Not Found</h2>
        <p className="text-xs text-white/60">The project overview could not be located in this session.</p>
      </div>
    </div>
  );
}
