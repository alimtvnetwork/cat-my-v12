// Plan 79 steps 41 + 42. V4 project editor: 6 fixed sections in order
// Rules, Image Samples, Camera Setup, Mics Settings, Run, Result.
import { useState } from "react";
import type { Project, RuleSet } from "@/lib/projects/store";
import { ProjectRulesSection } from "@/features/projects/sections/ProjectRulesSection";
import { ImageSamplesSection } from "@/components/projects/sections/ProjectImageSamplesSection";
import { ProjectCameraSection } from "@/components/projects/sections/ProjectCameraSection";
import { ProjectMicsSection } from "@/components/projects/sections/ProjectMicsSection";
import { ProjectRunSection } from "@/components/projects/sections/ProjectRunSection";
import { ProjectResultSection } from "@/components/projects/sections/ProjectResultSection";
import { useSelectedSample } from "@/lib/image-samples/use-selected-sample";
import { useImageSamples } from "@/lib/image-samples/useImageSamples";
import type { ProjectRunSummary } from "@/lib/projects/project-runner";

interface Props {
  project: Project;
  rulesets: readonly RuleSet[];
}

export function ProjectEditorSections({ project, rulesets }: Props) {
  const [runSummary, setRunSummary] = useState<ProjectRunSummary | null>(null);
  const samples = useImageSamples(project.id).all;
  const selection = useSelectedSample(project.id, samples);

  return (
    <div className="mb-hmi-6 space-y-hmi-3" data-testid="project-editor-sections">
      <ProjectRulesSection project={project} rulesets={rulesets} />
      <ImageSamplesSection project={project} />
      <ProjectCameraSection project={project} />
      <ProjectMicsSection project={project} />
      <ProjectRunSection
        project={project}
        rulesets={rulesets}
        onRan={setRunSummary}
        summary={runSummary}
        samples={samples}
        selection={selection}
      />
      <ProjectResultSection summary={runSummary} selectedSampleName={selection.selected?.name ?? null} />
    </div>
  );
}