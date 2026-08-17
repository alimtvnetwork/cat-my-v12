import type { Project } from "@/lib/projects/store";
import { ProjectCameraSection } from "@/components/projects/sections/ProjectCameraSection";
import { ProjectResultSection } from "@/components/projects/sections/ProjectResultSection";
import type { ProjectRunSummary } from "@/lib/projects/project-runner";
import { MainVisionCanvas } from "@/components/vision/MainVisionCanvas";
import { ImageSourceToggle } from "@/components/vision/ImageSourceToggle";
import { CameraConnectionIndicator } from "@/components/vision/CameraConnectionIndicator";
import { CaptureTriggerButton } from "@/components/vision/CaptureTriggerButton";
import { ImageHistoryRail } from "@/components/vision/ImageHistoryRail";
import { useVisionStore } from "@/lib/vision/store";
import { ImageSourceModeType } from "@/types/vision/ImageSourceModeType";
import { ScoreResultBadge } from "@/components/vision/ScoreResultBadge";

interface Props {
  project: Project;
  summary: ProjectRunSummary | null;
  selectedSampleName: string | null;
}

export function ProjectEditorMainCanvas({ project, summary, selectedSampleName }: Props) {
  const mode = useVisionStore((s) => s.imageSourceMode);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-ca-panel-2 p-hmi-6 space-y-hmi-3">
      {/* Top Controls Row */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <ImageSourceToggle />
          {mode === ImageSourceModeType.LIVE && <CameraConnectionIndicator />}
        </div>
        <div>
          {mode === ImageSourceModeType.LIVE && <CaptureTriggerButton />}
        </div>
      </div>
      
      {/* Main Vision Area */}
      <div className="flex-1 min-h-0 flex flex-col border border-ca-border rounded-md overflow-hidden shadow-sm">
        <div className="flex-1 min-h-0 relative">
          <MainVisionCanvas />
        </div>
        <ScoreResultBadge confidence={98.5} />
        {/* History Rail (Step 63) */}
        <div className="shrink-0 h-[120px] bg-ca-panel-2 border-t border-ca-border">
          <ImageHistoryRail />
        </div>
      </div>

      {/* Legacy Sections */}
      <div className="shrink-0 flex flex-col space-y-hmi-3 max-h-[25vh] overflow-auto">
        <ProjectCameraSection project={project} />
        <ProjectResultSection summary={summary} selectedSampleName={selectedSampleName} />
      </div>
    </div>
  );
}
