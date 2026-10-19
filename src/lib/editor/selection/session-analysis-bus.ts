import { ClientLogger } from "@/lib/observability/client-logger";
import type { TapeStripEvaluationResult } from "@/lib/vision/workpiece-rule-analyzer";

type SessionAnalysisListener = (result: TapeStripEvaluationResult | null) => void;

const listeners = new Set<SessionAnalysisListener>();

/**
 * Tells the analyze workspace that the current session produced analysis
 * results (e.g. the guided simulation's scripted run), so the workspace
 * lifts its stale-result gate and shows them. Mirrors the Analyze button's
 * own session flag. Carries the tape-strip result so the canvas draws the
 * visual markers, like a real Analyze run.
 */
export const sessionAnalysisBus = {
  emit(tapeStripResult: TapeStripEvaluationResult | null = null): void {
    ClientLogger.info("[session-analysis-bus] emit", { listenerCount: listeners.size });

    for (const listener of listeners) {
      try {
        listener(tapeStripResult);
      } catch (err) {
        ClientLogger.error("[session-analysis-bus] listener threw", err);
      }
    }
  },

  subscribe(listener: SessionAnalysisListener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};
