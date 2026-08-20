import type { Project, RuleSet } from "@/lib/projects/store";
import { ProjectRulesSection } from "@/features/projects/sections/ProjectRulesSection";
import { ImageSamplesSection } from "@/components/projects/sections/ProjectImageSamplesSection";
import { ProjectMicsSection } from "@/components/projects/sections/ProjectMicsSection";
import { ProjectRunSection } from "@/components/projects/sections/ProjectRunSection";
import type { ProjectRunSummary } from "@/lib/projects/project-runner";

interface Props {
  project: Project;
  rulesets: readonly RuleSet[];
  summary: ProjectRunSummary | null;
  onRan: (s: ProjectRunSummary) => void;
  samples: readonly any[];
  selection: any;
}

export function ProjectEditorSidePanel({
  project,
  rulesets,
  summary,
  onRan,
  samples,
  selection,
}: Props): React.JSX.Element | null {
  return (
    <div className="w-96 flex-shrink-0 overflow-auto border-l border-ca-border bg-ca-panel p-hmi-4 space-y-hmi-3">
      <ProjectRulesSection project={project} rulesets={rulesets} />
      <ImageSamplesSection project={project} />
      <ProjectMicsSection project={project} />
      <ProjectRunSection
        project={project}
        rulesets={rulesets}
        onRan={onRan}
        summary={summary}
        samples={samples}
        selection={selection}
      />
    </div>
  );
}
