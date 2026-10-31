import { useRecorderStore } from "./recorder-store";
import { captureScreenSnapshot } from "./screenshot-service";
import {
  type AnalysisStepMetric,
  type AnalysisStepTelemetry,
  InspectionPhaseType,
  type RecordAnalysisStepParams,
  type RecorderEvent,
  RecorderActorType,
  RecorderEventType,
} from "./types";

export const PHASE_ORDER_MAP: Record<InspectionPhaseType, number> = {
  [InspectionPhaseType.Preprocessing]: 1,
  [InspectionPhaseType.PatternSearch]: 2,
  [InspectionPhaseType.EdgeDetection]: 3,
  [InspectionPhaseType.DefectCheck]: 4,
  [InspectionPhaseType.ValidationGating]: 5,
};

export async function recordAnalysisStep(
  params: RecordAnalysisStepParams,
): Promise<RecorderEvent | null> {
  const store = useRecorderStore.getState();

  if (!store.isRecording || store.isPaused || !store.session) {
    return null;
  }

  const phaseIndex = PHASE_ORDER_MAP[params.phase] ?? 1;
  const isPassed = params.isPassed;
  const isGated = params.isGated ?? false;
  const confidenceScore = params.confidenceScore ?? (isPassed ? 98.5 : 24.0);
  const metrics: AnalysisStepMetric[] = params.metrics ?? [];
  const ruleId = params.ruleId ?? "sys-inspection";
  const ruleName = params.ruleName ?? params.stepName;
  const route = typeof window !== "undefined" ? window.location.pathname : "/run";

  let screenshotId: string | undefined;
  let hasScreenshot = false;

  try {
    const snapTitle = params.screenshotTitle ?? `Phase ${phaseIndex}: ${params.stepName}`;
    const snapResult = captureScreenSnapshot({
      title: snapTitle,
      source: "step",
      targetElement: params.targetCanvas ?? null,
      quality: 0.7,
    });

    if (snapResult.hasImage && snapResult.dataUrl) {
      screenshotId = store.addScreenshot({
        title: snapTitle,
        dataUrl: snapResult.dataUrl,
        source: "step",
      });
      hasScreenshot = Boolean(screenshotId);
    }
  } catch (snapErr) {
    console.debug("[AnalysisTelemetry] Non-critical snapshot capture fallback:", snapErr);
  }

  const telemetryPayload: AnalysisStepTelemetry = {
    phase: params.phase,
    phaseIndex,
    stepName: params.stepName,
    ruleId,
    ruleName,
    durationMs: Math.max(0, Math.round(params.durationMs)),
    isPassed,
    isGated,
    confidenceScore,
    metrics,
    rawDetails: params.rawDetails ?? {},
  };

  const description = `[Phase ${phaseIndex}/5: ${params.phase}] ${params.stepName} -> ${isPassed ? "PASS" : "FAIL"} (${confidenceScore.toFixed(1)}%)`;

  store.addEvent({
    actor: RecorderActorType.System,
    eventType: RecorderEventType.AnalysisStep,
    description,
    targetComponent: `InspectionEngine:${params.phase}`,
    selector: `canvas[data-inspection-phase="${params.phase}"]`,
    route,
    hasScreenshot,
    screenshotId,
    details: {
      analysisStep: telemetryPayload,
      metricsSummary: metrics.map((m) => `${m.metricName}=${m.metricValue}${m.unit}`).join(", "),
    },
  });

  const updatedSession = useRecorderStore.getState().session;

  return updatedSession?.events[updatedSession.events.length - 1] ?? null;
}
