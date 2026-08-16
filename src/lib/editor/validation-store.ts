import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Per-ruleset validation runs, persisted to localStorage.
 *
 * Root cause this addresses: the previous store held a single flat
 * `results` map in memory. Navigating to another ruleset overwrote it,
 * and a page refresh erased everything, so the Layers-list pass/fail
 * chips vanished on the very next click. Chips must persist across
 * refresh and navigation, scoped to the ruleset they were produced
 * against, so operators can see "when I last validated ruleset X, this
 * is what happened" without re-running.
 *
 * Shape:
 *   runs[rulesetId] -> { results, lastRunAt, imageName }
 *   activeRulesetId cursor lets `ValidationChip` subscribe by ruleId
 *   without threading rulesetId through the Layers tree.
 *
 * Persistence:
 *   zustand `persist` middleware, localStorage key `ca:validation-runs:v1`.
 *   Only `runs` is persisted; `activeRulesetId` is session-scoped and set
 *   by the ruleset editor route on mount.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export enum ValidationStatusType {
  Pass = "pass",
  Fail = "fail",
  Warn = "warn",
  Pending = "pending",
}

export interface ValidationResult {
  status: ValidationStatusType;
  /** 0..1 confidence, when the backend provides one. */
  score?: number;
  /** Short human-readable summary shown as a tooltip. */
  message?: string;
  /** True when produced by the local placeholder, false when from the real backend. */
  stub: boolean;
  /** JSON-safe debug metadata surfaced in the chip details popover. */
  debug?: Record<string, string | number | boolean | null>;
}

export interface RulesetRun {
  results: Record<string, ValidationResult>;
  lastRunAt: number;
  imageName: string | null;
}

interface ValidationStore {
  /** Cursor for chip selectors; set by the ruleset editor route. */
  activeRulesetId: string | null;
  /**
   * Rule id whose validation chip the user most recently opened; the
   * canvas draws a highlight ring around this rule so operators can
   * see on the image where a failing / warning rule actually lives.
   * Session-only, not persisted.
   */
  focusedRuleId: string | null;
  /** Persisted per-ruleset run history (latest run only, per spec). */
  runs: Record<string, RulesetRun>;
  setActiveRuleset: (rulesetId: string | null) => void;
  setFocusedRule: (ruleId: string | null) => void;
  setResults: (
    rulesetId: string,
    map: Record<string, ValidationResult>,
    imageName: string | null,
  ) => void;
  clear: (rulesetId: string) => void;
  clearAll: () => void;
}

const STORAGE_KEY = "ca:validation-runs:v1";

export const useValidationStore = create<ValidationStore>()(
  persist(
    (set) => ({
      activeRulesetId: null,
      focusedRuleId: null,
      runs: {},
      setActiveRuleset: (rulesetId) =>
        // Changing rulesets always drops the focused-rule cursor so a
        // chip highlight from ruleset A never bleeds onto ruleset B.
        set({ activeRulesetId: rulesetId, focusedRuleId: null }),
      setFocusedRule: (ruleId) => {
        ClientLogger.info("[validation-store] setFocusedRule", { ruleId });
        set({ focusedRuleId: ruleId });
      },
      setResults: (rulesetId, map, imageName) =>
        set((state) => {
          ClientLogger.info("[validation-store] setResults", {
            rulesetId,
            count: Object.keys(map).length,
            imageName,
          });

          return {
            runs: {
              ...state.runs,
              [rulesetId]: {
                results: map,
                lastRunAt: Date.now(),
                imageName,
              },
            },
          };
        }),
      clear: (rulesetId) =>
        set((state) => {
          if (!state.runs[rulesetId]) return state;
          const { [rulesetId]: _dropped, ...rest } = state.runs;
          ClientLogger.info("[validation-store] clear", { rulesetId });

          return { runs: rest };
        }),
      clearAll: () => {
        ClientLogger.info("[validation-store] clearAll");
        set({ runs: {} });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => {
        // Browser-only. SSR gets a noop store so hydration matches
        // the empty `runs: {}` initial state, then the persist
        // middleware rehydrates on the client after mount.
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }

        return window.localStorage;
      }),
      partialize: (state) => ({ runs: state.runs }),
      version: 1,
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          ClientLogger.warn("[validation-store] rehydrate failed", error);

          return;
        }

        ClientLogger.info("[validation-store] rehydrated", {
          rulesets: state ? Object.keys(state.runs).length : 0,
        });
      },
    },
  ),
);

/**
 * Selector used by ValidationChip. Resolves the result for a rule id
 * against the currently-active ruleset. Returns undefined when no run
 * exists for that ruleset (chip renders nothing).
 */
export function useValidationResult(ruleId: string): ValidationResult | undefined {
  return useValidationStore((s) => {
    const rulesetId = s.activeRulesetId;

    if (!rulesetId) return undefined;

    return s.runs[rulesetId]?.results[ruleId];
  });
}

/** Metadata about the last run for the given ruleset, for header labels. */
export function useLastRunMeta(rulesetId: string | null): RulesetRun | null {
  return useValidationStore((s) => (rulesetId ? (s.runs[rulesetId] ?? null) : null));
}

function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h ^ input.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }

  return h;
}

/**
 * Deterministic offline fallback: score is a hash of ruleId plus the
 * image dimensions, mapped into [0,1]. Threshold 0.55 for pass, below
 * 0.35 for fail, in between warns. Same inputs always produce the same
 * result, so the UI is testable without a live worker. Retained for the
 * "worker offline" path in ValidateAgainstImageDialog.
 */
export function runStubValidation(args: {
  ruleIds: readonly string[];
  imageWidth: number;
  imageHeight: number;
}): Record<string, ValidationResult> {
  const { ruleIds, imageWidth, imageHeight } = args;
  const out: Record<string, ValidationResult> = {};
  const seed = `${imageWidth}x${imageHeight}`;
  for (const id of ruleIds) {
    const h = hashString(`${id}|${seed}`);
    const score = (h % 1000) / 1000;
    let status: ValidationStatusType;
    let message: string;

    if (score >= 0.55) {
      status = ValidationStatusType.Pass;
      message = `Match score ${score.toFixed(2)} (stub).`;
    } else if (score >= 0.35) {
      status = ValidationStatusType.Warn;
      message = `Borderline match ${score.toFixed(2)} (stub).`;
    } else {
      status = ValidationStatusType.Fail;
      message = `No match, score ${score.toFixed(2)} (stub).`;
    }

    out[id] = {
      status,
      score,
      message,
      stub: true,
      debug: {
        seed,
        hash: h,
        thresholdPass: 0.55,
        thresholdWarn: 0.35,
        source: "runStubValidation",
      },
    };
  }

  return out;
}
