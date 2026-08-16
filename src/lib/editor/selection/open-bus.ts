import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 83 backlog item 2. Ultra-thin event bus that signals "open the
// full editor for this rule id". LayerRow (Enter key, Pencil button)
// emits; the ruleset route subscribes and drives router navigation to
// the per-rule deep-link route. Kept as a module-scoped emitter so we
// don't have to thread callbacks through InspectorSurface → LayersPanel
// → LayerRow just to reach the router.
type Listener = (ruleId: string) => void;

const listeners = new Set<Listener>();

export const openRuleBus = {
  emit(ruleId: string): void {
    if (!ruleId) {
      ClientLogger.warn("[open-rule-bus] ignored empty ruleId");

      return;
    }

    ClientLogger.info("[open-rule-bus] emit", { ruleId, listeners: listeners.size });
    for (const l of listeners) {
      try {
        l(ruleId);
      } catch (err) {
        ClientLogger.error("[open-rule-bus] listener threw", err);
      }
    }
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);

    return () => {
      listeners.delete(fn);
    };
  },
};
