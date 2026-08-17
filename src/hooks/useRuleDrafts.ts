import { useEffect, useState } from "react";
import { getDraft, putDraft, type RuleSetEnvelope } from "@/lib/rules/draftStore";
import { ClientLogger } from "@/lib/observability/client-logger";

export function useRuleDrafts(rulesetId: number) {
  const [draft, setDraft] = useState<RuleSetEnvelope | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDraft() {
      try {
        const stored = await getDraft(rulesetId);
        if (stored) {
          setDraft(stored);
        }
      } catch (err) {
        ClientLogger.error("[useRuleDrafts] failed to load draft", err);
      } finally {
        setLoading(false);
      }
    }
    void loadDraft();
  }, [rulesetId]);

  const saveDraft = async (envelope: RuleSetEnvelope) => {
    try {
      const saved = await putDraft(envelope);
      setDraft(saved);
      return saved;
    } catch (err) {
      ClientLogger.error("[useRuleDrafts] failed to save draft", err);
      throw err;
    }
  };

  return { draft, loading, saveDraft };
}
