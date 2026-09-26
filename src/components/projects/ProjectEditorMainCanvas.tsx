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
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { evaluateCurrentVision, useAutoEvaluate } from "@/hooks/useAutoEvaluate";
import { getReferenceImage } from "@/lib/stores/reference-image-store";

interface Props {
  project: Project;
  summary: ProjectRunSummary | null;
  selectedSampleName: string | null;
}

export function ProjectEditorMainCanvas({
  project,
  summary,
  selectedSampleName,
}: Props): React.JSX.Element | null {
  const mode = useVisionStore((s) => s.imageSourceMode);
  const lastScoreResult = useVisionStore((s) => s.lastScoreResult);
  const refImage = getReferenceImage();

  useAutoEvaluate(refImage);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-ca-panel-2 p-hmi-4 space-y-hmi-3">
      {/* Top Controls Row */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <ImageSourceToggle />
          {mode === ImageSourceModeType.LIVE && <CameraConnectionIndicator />}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => void evaluateCurrentVision()}
            className="flex items-center gap-1.5 text-xs font-semibold shadow-sm"
            title="Execute inspection rule against current frame and ROI"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Evaluate Inspection
          </Button>
          {mode === ImageSourceModeType.LIVE && <CaptureTriggerButton />}
        </div>
      </div>

      {/* Main Vision Area */}
      <div className="flex-1 min-h-0 flex flex-col border border-ca-border rounded-md overflow-hidden shadow-sm shrink-0">
        <div className="flex-1 min-h-[260px] relative w-full overflow-hidden bg-black/40">
          <MainVisionCanvas />
        </div>
        <ScoreResultBadge result={lastScoreResult ?? undefined} />
        {/* History Rail (Step 63) */}
        <div className="shrink-0 min-h-[145px] bg-ca-panel-2 border-t border-ca-border">
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
