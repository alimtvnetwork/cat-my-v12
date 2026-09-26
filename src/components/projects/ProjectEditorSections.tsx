import { useEffect } from "react";
import type { Project, RuleSet } from "@/lib/projects/store";
import { useProjectEditorState } from "./useProjectEditorState";
import { ProjectEditorToolbar } from "./ProjectEditorToolbar";
import { ProjectEditorMainCanvas } from "./ProjectEditorMainCanvas";
import { ProjectEditorSidePanel } from "./ProjectEditorSidePanel";
import { setReferenceImage } from "@/lib/stores/reference-image-store";
import { evaluateCurrentVision } from "@/hooks/useAutoEvaluate";

interface Props {
  project: Project;
  rulesets: readonly RuleSet[];
}

export function ProjectEditorSections({ project, rulesets }: Props): React.JSX.Element | null {
  const state = useProjectEditorState(project.id);

  // Sync right-panel carousel selection with main canvas & vision evaluator
  useEffect(() => {
    if (state.selection.selected?.dataUrl) {
      setReferenceImage(state.selection.selected.dataUrl);
      void evaluateCurrentVision();
    }
  }, [state.selection.selected?.id, state.selection.selected?.dataUrl]);

  return (
    <div
      className="mb-hmi-6 flex min-h-[880px] flex-col rounded-lg border border-ca-border bg-ca-panel shadow-hmi-panel"
      data-testid="project-editor-sections"
    >
      <ProjectEditorToolbar project={project} rulesets={rulesets} />
      <div className="flex flex-1 overflow-hidden">
        <ProjectEditorMainCanvas
          project={project}
          summary={state.runSummary}
          selectedSampleName={state.selection.selected?.name ?? null}
        />
        <ProjectEditorSidePanel
          project={project}
          rulesets={rulesets}
          summary={state.runSummary}
          onRan={state.setRunSummary}
          samples={state.samples}
          selection={state.selection}
        />
      </div>
    </div>
  );
}
