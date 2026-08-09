import { TrialVerdictType } from "@/lib/projects/trials";
// AI testing batch aggregation and persisted summary history.
// Plan 34, step 20 (SS-05). Datasets stay in component state, while only
// compact aggregate summaries persist in localStorage.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { EditorRule } from "@/lib/editor/types";
import type { TrialResult, TrialRun, TrialVerdict } from "@/lib/projects/trials";

export const AI_TESTING_HISTORY_CAP = 10;

export interface AiTestingDatasetImage {
  id: string;
  name: string;
  imageRef: string;
}

export interface AiTestingImageMetric {
  imageId: string;
  imageName: string;
  verdict: TrialVerdict;
  okCount: number;
  ngCount: number;
  totalChecks: number;
  passRate: number;
  results: TrialResult[];
}

export interface AiTestingRuleMetric {
  ruleId: string;
  ruleName: string;
  kind: EditorRule["kind"];
  okCount: number;
  ngCount: number;
  totalChecks: number;
  passRate: number;
}

export interface AiTestingAggregateSummary {
  id: string;
  rulesetId: string;
  createdAt: number;
  verdict: TrialVerdict;
  imageCount: number;
  ruleCount: number;
  totalChecks: number;
  okChecks: number;
  ngChecks: number;
  passRate: number;
  perRule: AiTestingRuleMetric[];
  perImage: AiTestingImageMetric[];
}

export interface AggregateAiTestingInput {
  id?: string;
  now?: number;
  rulesetId: string;
  rules: readonly EditorRule[];
  images: readonly AiTestingDatasetImage[];
  runs: readonly TrialRun[];
}

interface MutableRuleMetric {
  ruleId: string;
  ruleName: string;
  kind: EditorRule["kind"];
  okCount: number;
  ngCount: number;
  totalChecks: number;
}

export function aggregateAiTestingResults(
  input: AggregateAiTestingInput,
): AiTestingAggregateSummary {
  if (input.images.length !== input.runs.length) {
    throw new Error("Cannot aggregate AI test: image/run count mismatch.");
  }

  const visibleRuleCount = input.rules.filter((rule) => !rule.isHidden).length;
  const byRule = new Map<string, MutableRuleMetric>();
  let okChecks = 0;
  let ngChecks = 0;

  const perImage = input.runs.map((run, index): AiTestingImageMetric => {
    if (run.rulesetId !== input.rulesetId) {
      throw new Error("Cannot aggregate AI test: run belongs to a different rule set.");
    }

    const image = input.images[index];
    const okCount = run.results.filter((result) => result.verdict === "OK").length;
    const ngCount = run.results.length - okCount;
    okChecks += okCount;
    ngChecks += ngCount;

    for (const result of run.results) {
      const existing = byRule.get(result.ruleId) ?? {
        ruleId: result.ruleId,
        ruleName: result.ruleName,
        kind: result.kind,
        okCount: 0,
        ngCount: 0,
        totalChecks: 0,
      };
      existing.totalChecks += 1;

      if (result.verdict === "OK") existing.okCount += 1;
      else existing.ngCount += 1;
      byRule.set(result.ruleId, existing);
    }

    return {
      imageId: image.id,
      imageName: image.name,
      verdict: run.verdict,
      okCount,
      ngCount,
      totalChecks: run.results.length,
      passRate: run.results.length === 0 ? 1 : okCount / run.results.length,
      results: run.results,
    };
  });

  const totalChecks = okChecks + ngChecks;
  const perRule = Array.from(byRule.values()).map((metric): AiTestingRuleMetric => ({
    ...metric,
    passRate: metric.totalChecks === 0 ? 1 : metric.okCount / metric.totalChecks,
  }));

  return {
    id: input.id ?? newId(),
    rulesetId: input.rulesetId,
    createdAt: input.now ?? Date.now(),
    verdict: perImage.every((image) => image.verdict === TrialVerdictType.OK)
      ? TrialVerdictType.OK
      : TrialVerdictType.NG,
    imageCount: input.images.length,
    ruleCount: visibleRuleCount,
    totalChecks,
    okChecks,
    ngChecks,
    passRate: totalChecks === 0 ? 1 : okChecks / totalChecks,
    perRule,
    perImage,
  };
}

function newId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };

  if (g.crypto?.randomUUID) return g.crypto.randomUUID();

  return `ai-test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface AiTestingStoreState {
  historyByRuleset: Record<string, AiTestingAggregateSummary[]>;
  appendSummary: (summary: AiTestingAggregateSummary) => void;
  clearRuleset: (rulesetId: string) => void;
}

const EMPTY_AI_TESTING_HISTORY: AiTestingAggregateSummary[] = [];

export function appendAiTestingHistoryReducer(
  historyByRuleset: Record<string, AiTestingAggregateSummary[]>,
  summary: AiTestingAggregateSummary,
  cap: number = AI_TESTING_HISTORY_CAP,
): Record<string, AiTestingAggregateSummary[]> {
  const existing = historyByRuleset[summary.rulesetId] ?? [];

  return { ...historyByRuleset, [summary.rulesetId]: [summary, ...existing].slice(0, cap) };
}

export const useAiTestingStore = create<AiTestingStoreState>()(
  persist(
    (set) => ({
      historyByRuleset: {},
      appendSummary: (summary) => {
        set((state) => ({
          historyByRuleset: appendAiTestingHistoryReducer(state.historyByRuleset, summary),
        }));
        console.info("[ai-testing/store] appended summary", {
          rulesetId: summary.rulesetId,
          summaryId: summary.id,
          verdict: summary.verdict,
          imageCount: summary.imageCount,
          passRate: summary.passRate,
        });
      },
      clearRuleset: (rulesetId) => {
        set((state) => {
          const { [rulesetId]: _drop, ...rest } = state.historyByRuleset;

          return { historyByRuleset: rest };
        });
      },
    }),
    {
      name: "ca:ai-testing:v1",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
        const mem = new Map<string, string>();

        return {
          getItem: (key) => (mem.has(key) ? mem.get(key)! : null),
          setItem: (key, value) => {
            mem.set(key, value);
          },
          removeItem: (key) => {
            mem.delete(key);
          },
        };
      }),
    },
  ),
);

export const selectAiTestingHistoryForRuleset = (
  state: AiTestingStoreState,
  rulesetId: string,
): AiTestingAggregateSummary[] => state.historyByRuleset[rulesetId] ?? EMPTY_AI_TESTING_HISTORY;
