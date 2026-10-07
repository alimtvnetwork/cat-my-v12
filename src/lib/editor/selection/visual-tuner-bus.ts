import { ClientLogger } from "@/lib/observability/client-logger";

type VisualTunerListener = (ruleId: string) => void;

const listeners = new Set<VisualTunerListener>();

export const visualTunerBus = {
  emit(ruleId: string): void {
    if (!ruleId) {
      ClientLogger.warn("[visual-tuner-bus] ignored empty ruleId");

      return;
    }

    ClientLogger.info("[visual-tuner-bus] emit", { ruleId, listenerCount: listeners.size });
    for (const listener of listeners) {
      try {
        listener(ruleId);
      } catch (err) {
        ClientLogger.error("[visual-tuner-bus] listener threw", err);
      }
    }
  },

  subscribe(listener: VisualTunerListener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};
