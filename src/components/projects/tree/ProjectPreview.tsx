// Plan 03 step 4. Project preview (§6.1).
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md.
// Counts, bindings, created date. Actions: open trial run.

import { PlayCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useProjectStore, selectProject } from "@/lib/projects/store";
import { useRecipesForProject } from "@/lib/recipes/useRecipeLibrary";

function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-sm border border-ca-border bg-ca-panel-2 p-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-ca-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-ca-ink">{value}</p>
    </div>
  );
}

export function ProjectPreview({ projectId }: { projectId: string }): React.JSX.Element {
  const navigate = useNavigate();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const recipes = useRecipesForProject(projectId);

  if (!project) return <p className="text-xs text-ca-ink-muted">Project not found.</p>;

  const totalRules = recipes.reduce((sum, r) => sum + r.ruleIds.length, 0);
  const enabledRecipes = recipes.filter((r) => r.isEnabled !== false).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Recipes" value={String(recipes.length)} />
        <Stat label="Enabled" value={String(enabledRecipes)} />
        <Stat label="Rules" value={String(totalRules)} />
      </div>
      <dl className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-ca-ink-muted">Camera</dt>
          <dd className="truncate text-ca-ink">{project.cameraName ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ca-ink-muted">Mic settings</dt>
          <dd className="truncate font-mono text-ca-ink">{project.micSettingsId ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ca-ink-muted">Created</dt>
          <dd className="text-ca-ink">{new Date(project.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => void navigate({ to: "/projects/$projectId/trial-run", params: { projectId } })}
        className="flex w-full items-center justify-center gap-1.5 rounded-sm bg-ca-select px-2 py-1.5 text-xs font-semibold text-ca-bg hover:brightness-110"
      >
        <PlayCircle size={14} />
        Open trial run
      </button>
    </div>
  );
}
