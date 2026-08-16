import { useState } from "react";
import type { ProjectRunSummary } from "@/lib/projects/project-runner";
import { useImageSamples } from "@/lib/image-samples/useImageSamples";
import { useSelectedSample } from "@/lib/image-samples/use-selected-sample";

export function useProjectEditorState(projectId: string) {
  const [runSummary, setRunSummary] = useState<ProjectRunSummary | null>(null);
  const samples = useImageSamples(projectId).all;
  const selection = useSelectedSample(projectId, samples);
  
  return { runSummary, setRunSummary, samples, selection };
}
