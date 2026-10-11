// Plan 03 step 2. "Structure" section for /projects/$projectId/.
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §4.1.
// Layout: tree panel (flex-1) + preview rail (w-80, step 4).
// Standard mode only — the caller gates on UiModeType.

import { useState } from "react";
import { ProjectTreeView, type TreeSelection } from "./ProjectTreeView";
import { TreePreviewPanel } from "./TreePreviewPanel";

interface ProjectStructureSectionProps {
  projectId: string;
  projectName: string;
}

export function ProjectStructureSection(props: ProjectStructureSectionProps): React.JSX.Element {
  const [selection, setSelection] = useState<TreeSelection | null>(null);

  return (
    <section
      aria-label="Project structure"
      className="mb-hmi-6 rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
    >
      <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
        Structure
      </h2>
      <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
        Project → recipes → rules. Drag rows to reorder or move rules between recipes.
      </p>
      <div className="mt-hmi-3 flex min-h-[320px] gap-hmi-3">
        <ProjectTreeView
          projectId={props.projectId}
          projectName={props.projectName}
          selection={selection}
          onSelectNode={setSelection}
        />
        <aside
          aria-label="Preview"
          className="w-80 shrink-0 overflow-auto rounded-md border border-ca-border bg-ca-bg p-3"
        >
          <TreePreviewPanel selection={selection} />
        </aside>
      </div>
    </section>
  );
}
