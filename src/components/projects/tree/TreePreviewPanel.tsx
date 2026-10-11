// Plan 03 step 4. Preview panel shell (§6).
// Selection-driven: Project → ProjectPreview, Recipe → RecipePreview,
// Rule → RulePreview. Empty selection → §6.4 placeholder (never blank).

import { TreeNodeKindType } from "@/lib/recipes/tree-types";
import type { TreeSelection } from "./ProjectTreeView";
import { ProjectPreview } from "./ProjectPreview";
import { RecipePreview } from "./RecipePreview";
import { RulePreview } from "./RulePreview";

const KIND_LABEL: Record<TreeNodeKindType, string> = {
  [TreeNodeKindType.Project]: "Project",
  [TreeNodeKindType.Recipe]: "Recipe",
  [TreeNodeKindType.Rule]: "Rule",
};

export function TreePreviewPanel({ selection }: { selection: TreeSelection | null }): React.JSX.Element {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-ca-ink-muted">Preview</p>
      <div className="mt-2">
        {selection === null ? (
          <p className="text-xs text-ca-ink-muted">Select a project, recipe, or rule to preview.</p>
        ) : (
          <>
            <p className="mb-2 inline-block rounded bg-ca-select/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ca-ink">
              {KIND_LABEL[selection.kind]}
            </p>
            {selection.kind === TreeNodeKindType.Project ? (
              <ProjectPreview projectId={selection.id} />
            ) : null}
            {selection.kind === TreeNodeKindType.Recipe ? (
              <RecipePreview recipeId={selection.id} />
            ) : null}
            {selection.kind === TreeNodeKindType.Rule ? (
              <RulePreview ruleId={selection.id} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
