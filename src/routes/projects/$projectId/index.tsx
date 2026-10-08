import { RunningOpKindType } from "@/lib/stores/running-ops-store";
// Project overview index (Plan 34, step 11). Renders inside the
// projects.$projectId layout's <Outlet />, so it does NOT re-mount
// HmiShell or SectionTopBar. Shows project name, ruleset count, quick
// links to the plan's project sub-surfaces, and a legacy operator group.
import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Layers,
  PlayCircle,
  Sparkles,
  Gauge,
  ListChecks,
  AlertTriangle,
  Settings,
  Play,
  Download,
  FileDown,
  Archive,
  ScanSearch,
  Plus,
} from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import { resolveAllCategories } from "@/lib/projects/category-resolver";
import { RulesetPicker } from "@/components/projects/RulesetPicker";
import { ProjectEditorSections } from "@/components/projects/ProjectEditorSections";

import { WorkpieceAnalyzeWorkspace } from "@/components/vision/workpiece";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { runProject } from "@/lib/run-project.functions";
import { useRunning } from "@/hooks/useRunning";
import { evaluateCurrentVision } from "@/hooks/useAutoEvaluate";
import {
  downloadProjectExport,
  downloadProjectExportYaml,
  downloadProjectExportZip,
} from "@/lib/export-project";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectOverview,
  errorComponent: OverviewError,
  notFoundComponent: OverviewNotFound,
});

function ProjectOverview() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const [activeRulesetId, setActiveRulesetId] = useState<string | null>(null);

  if (!project) {
    console.warn("[projects/$projectId/index] project not found", { projectId });
    throw notFound();
  }

  const activeRuleset = (activeRulesetId ? rulesets.find((r) => r.id === activeRulesetId) : null) ?? rulesets[0];

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0b0c10]">
      {activeRuleset ? (
        <WorkpieceAnalyzeWorkspace
          key={activeRuleset.id}
          project={project}
          ruleset={activeRuleset}
          rulesets={rulesets}
          onSelectRuleset={(rid) => setActiveRulesetId(rid)}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-ca-ink-muted text-xs font-mono uppercase">No rulesets available.</p>
        </div>
      )}
    </div>
  );
}

function OverviewError() {
  return (
    <div className="flex h-full items-center justify-center bg-ca-panel p-8">
      <div className="max-w-md text-center text-red-500">
        <h2 className="mb-2 text-xl font-bold">Error loading project overview</h2>
        <p className="text-sm">Please try again or go back to projects list.</p>
      </div>
    </div>
  );
}

function OverviewNotFound() {
  return (
    <div className="flex h-full items-center justify-center bg-ca-panel p-8">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-xl font-bold">Project Overview Not Found</h2>
        <p className="text-sm">The project overview could not be found.</p>
      </div>
    </div>
  );
}

