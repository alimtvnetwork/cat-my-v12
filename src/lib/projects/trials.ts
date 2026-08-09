import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
// Trial run types + in-memory engine stub + per-ruleset history store.
// Plan 34, steps 17 + 18 (SS-04). No backend: the stub scores each rule
// deterministically from a seeded PRNG so trials are reproducible in
// vitest and the UI has real numbers to render.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { EditorRule } from "@/lib/editor/types";

export enum TrialVerdictType {
  OK = "OK",
  NG = "NG",
}
export type TrialVerdict = TrialVerdictType;

export interface TrialResult {
  ruleId: string;
  ruleName: string;
  kind: EditorRule["kind"];
  score: number; // 0..1
  verdict: TrialVerdict;
}

export interface TrialRun {
  id: string;
  rulesetId: string;
  imageRef: string;
  createdAt: number;
  verdict: TrialVerdict;
  results: TrialResult[];
  /** Threshold applied to per-rule scores. Optional for backward compat. */
  threshold?: number;
  /** Ordered engine log lines captured during the run. Optional for backward compat. */
  logs?: string[];
  /** Wall-clock ms the run took. Optional for backward compat. */
  durationMs?: number;
}

export const TRIAL_HISTORY_CAP = 20;

// Deterministic 0..1 hash of a string. Small, dependency-free, good enough
// for a UI stub. NOT cryptographic.
function seededScore(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return (h >>> 0) / 0xffffffff;
}

export interface RunRulesetInput {
  rulesetId: string;
  imageRef: string;
  rules: readonly EditorRule[];
  threshold?: number; // default 0.5
  now?: number;
  id?: string;
}

// Pure function so tests can call it without a store.
export function runRuleset(input: RunRulesetInput): TrialRun {
  const threshold = input.threshold ?? 0.5;
  const startedAt = input.now ?? Date.now();
  const logs: string[] = [];
  const skippedHidden = input.rules.filter((r) => r.isHidden).length;
  logs.push(
    `start rulesetId=${input.rulesetId} rules=${input.rules.length} threshold=${threshold}`,
  );

  if (skippedHidden > 0)
    logs.push(`skipped ${skippedHidden} hidden rule${skippedHidden === 1 ? "" : "s"}`);
  const results: TrialResult[] = input.rules
    .filter((r) => !r.isHidden)
    .map((r) => {
      const score = seededScore(`${input.imageRef}|${r.id}|${r.kind}`);
      const verdict: TrialVerdict = score >= threshold ? TrialVerdictType.OK : TrialVerdictType.NG;
      logs.push(`rule ${r.id} (${r.kind}) "${r.name}" score=${score.toFixed(3)} => ${verdict}`);

      return { ruleId: r.id, ruleName: r.name, kind: r.kind, score, verdict };
    });
  const verdict: TrialVerdict = results.every((r) => r.verdict === TrialVerdictType.OK)
    ? TrialVerdictType.OK
    : TrialVerdictType.NG;
  const durationMs = Math.max(0, (input.now ?? Date.now()) - startedAt);
  logs.push(`done verdict=${verdict} durationMs=${durationMs}`);

  return {
    id: input.id ?? newId(),
    rulesetId: input.rulesetId,
    imageRef: input.imageRef,
    createdAt: startedAt,
    verdict,
    results,
    threshold,
    logs,
    durationMs,
  };
}

function newId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };

  if (g.crypto?.randomUUID) return g.crypto.randomUUID();

  return `trial-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface TrialStoreState {
  runsByRuleset: Record<string, TrialRun[]>;
  appendRun: (run: TrialRun) => void;
  clearRuleset: (rulesetId: string) => void;
}

const EMPTY_TRIAL_RUNS: TrialRun[] = [];

// Pure reducer, exported for unit tests.
export function appendRunReducer(
  runsByRuleset: Record<string, TrialRun[]>,
  run: TrialRun,
  cap: number = TRIAL_HISTORY_CAP,
): Record<string, TrialRun[]> {
  const existing = runsByRuleset[run.rulesetId] ?? [];
  // Newest first, FIFO cap on the tail (oldest drops off).
  const next = [run, ...existing].slice(0, cap);

  return { ...runsByRuleset, [run.rulesetId]: next };
}

export const useTrialStore = create<TrialStoreState>()(
  persist(
    (set) => ({
      runsByRuleset: {},
      appendRun: (run) => {
        set((state) => ({ runsByRuleset: appendRunReducer(state.runsByRuleset, run) }));
        console.info("[trials/store] appended run", {
          rulesetId: run.rulesetId,
          runId: run.id,
          verdict: run.verdict,
          resultCount: run.results.length,
        });
      },
      clearRuleset: (rulesetId) => {
        set((state) => {
          const { [rulesetId]: _drop, ...rest } = state.runsByRuleset;

          return { runsByRuleset: rest };
        });
      },
    }),
    {
      name: "ca:trials:v1",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
        const mem = new Map<string, string>();

        return {
          getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
          setItem: (k, v) => {
            mem.set(k, v);
          },
          removeItem: (k) => {
            mem.delete(k);
          },
        };
      }),
    },
  ),
);

import { resolveIdParam } from "@/lib/ids/int-alias";

export const selectRunsForRuleset = (state: TrialStoreState, rulesetId: string): TrialRun[] => {
  const real = resolveIdParam(IntAliasNamespaceType.Ruleset, rulesetId) || rulesetId;

  return state.runsByRuleset[real] ?? state.runsByRuleset[rulesetId] ?? EMPTY_TRIAL_RUNS;
};

/** Look up a single run by id across every ruleset in the store. */
export const selectRunById = (state: TrialStoreState, runId: string): TrialRun | undefined => {
  const real = resolveIdParam(IntAliasNamespaceType.Run, runId) || runId;
  for (const list of Object.values(state.runsByRuleset)) {
    const hit = list.find((r) => r.id === real || r.id === runId);

    if (hit) return hit;
  }

  return undefined;
};
