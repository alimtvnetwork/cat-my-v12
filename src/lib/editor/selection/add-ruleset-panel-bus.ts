import { ClientLogger } from "@/lib/observability/client-logger";

export type AddRulesetPanelMessage = { type: "open" } | { type: "close" };

type AddRulesetPanelListener = (message: AddRulesetPanelMessage) => void;

const listeners = new Set<AddRulesetPanelListener>();

export const addRulesetPanelBus = {
  emit(message: AddRulesetPanelMessage): void {
    ClientLogger.info("[add-ruleset-panel-bus] emit", { message, listenerCount: listeners.size });

    for (const listener of listeners) {
      try {
        listener(message);
      } catch (err) {
        ClientLogger.error("[add-ruleset-panel-bus] listener threw", err);
      }
    }
  },

  subscribe(listener: AddRulesetPanelListener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};
