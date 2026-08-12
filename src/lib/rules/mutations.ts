import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/wrappers/use-app-mutation";
import { getDraft, putDraft, type RuleSetEnvelope, type RuleItem } from "./draftStore";
import { saveRuleSet } from "./saveRuleSet";
import { getPersistRulesServerSide } from "@/lib/data-source/store";

export function useCreateRuleMutation(rulesetId: number) {
  const qc = useQueryClient();
  const queryKey = ["rule-draft", rulesetId];

  return useAppMutation({
    mutationFn: async (rule: RuleItem) => {
      const draft = await getDraft(rulesetId);
      if (!draft) throw new Error(`No draft for ruleset ${rulesetId}`);

      const nextRules = [...draft.Rules, rule];
      const nextEnvelope = { ...draft, Rules: nextRules };

      const savedDraft = await putDraft(nextEnvelope);
      if (getPersistRulesServerSide()) {
        await saveRuleSet(savedDraft);
      }
      return savedDraft;
    },
    onMutate: async (rule) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<RuleSetEnvelope>(queryKey);

      if (previous) {
        qc.setQueryData<RuleSetEnvelope>(queryKey, {
          ...previous,
          Rules: [...previous.Rules, rule],
        });
      }
      return { previous };
    },
    onError: (err, rule, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["cli-rules"] });
    },
  });
}

export function useUpdateRuleMutation(rulesetId: number) {
  const qc = useQueryClient();
  const queryKey = ["rule-draft", rulesetId];

  return useAppMutation({
    mutationFn: async (rule: RuleItem) => {
      const draft = await getDraft(rulesetId);
      if (!draft) throw new Error(`No draft for ruleset ${rulesetId}`);

      const nextRules = draft.Rules.map((r) => (r.Id === rule.Id ? rule : r));
      const nextEnvelope = { ...draft, Rules: nextRules };

      const savedDraft = await putDraft(nextEnvelope);
      if (getPersistRulesServerSide()) {
        await saveRuleSet(savedDraft);
      }
      return savedDraft;
    },
    onMutate: async (rule) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<RuleSetEnvelope>(queryKey);

      if (previous) {
        qc.setQueryData<RuleSetEnvelope>(queryKey, {
          ...previous,
          Rules: previous.Rules.map((r) => (r.Id === rule.Id ? rule : r)),
        });
      }
      return { previous };
    },
    onError: (err, rule, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["cli-rules"] });
    },
  });
}

export function useDeleteRuleMutation(rulesetId: number) {
  const qc = useQueryClient();
  const queryKey = ["rule-draft", rulesetId];

  return useAppMutation({
    mutationFn: async (ruleId: number) => {
      const draft = await getDraft(rulesetId);
      if (!draft) throw new Error(`No draft for ruleset ${rulesetId}`);

      const nextRules = draft.Rules.filter((r) => r.Id !== ruleId);
      const nextEnvelope = { ...draft, Rules: nextRules };

      const savedDraft = await putDraft(nextEnvelope);
      if (getPersistRulesServerSide()) {
        await saveRuleSet(savedDraft);
      }
      return savedDraft;
    },
    onMutate: async (ruleId) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<RuleSetEnvelope>(queryKey);

      if (previous) {
        qc.setQueryData<RuleSetEnvelope>(queryKey, {
          ...previous,
          Rules: previous.Rules.filter((r) => r.Id !== ruleId),
        });
      }
      return { previous };
    },
    onError: (err, ruleId, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["cli-rules"] });
    },
  });
}
