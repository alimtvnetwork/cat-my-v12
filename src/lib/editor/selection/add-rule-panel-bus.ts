import { ClientLogger } from "@/lib/observability/client-logger";

export type AddRulePanelMessage = { type: "open"; rulesetId: string } | { type: "close" };

type AddRulePanelListener = (message: AddRulePanelMessage) => void;

const listeners = new Set<AddRulePanelListener>();

export const addRulePanelBus = {
  emit(message: AddRulePanelMessage): void {
    if (message.type === "open" && !message.rulesetId) {
      ClientLogger.warn("[add-rule-panel-bus] ignored open with empty rulesetId");

      return;
    }

    ClientLogger.info("[add-rule-panel-bus] emit", { message, listenerCount: listeners.size });

    for (const listener of listeners) {
      try {
        listener(message);
      } catch (err) {
        ClientLogger.error("[add-rule-panel-bus] listener threw", err);
      }
    }
  },

  subscribe(listener: AddRulePanelListener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};
