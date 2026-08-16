import type { Project } from "@/lib/projects/store";
import { ProjectCameraSection } from "@/components/projects/sections/ProjectCameraSection";
import { ProjectResultSection } from "@/components/projects/sections/ProjectResultSection";
import type { ProjectRunSummary } from "@/lib/projects/project-runner";

interface Props {
  project: Project;
  summary: ProjectRunSummary | null;
  selectedSampleName: string | null;
}

export function ProjectEditorMainCanvas({ project, summary, selectedSampleName }: Props) {
  return (
    <div className="flex flex-1 flex-col overflow-auto bg-ca-panel-2 p-hmi-6 space-y-hmi-3">
      <ProjectCameraSection project={project} />
      <ProjectResultSection summary={summary} selectedSampleName={selectedSampleName} />
    </div>
  );
}
