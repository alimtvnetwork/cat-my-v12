// Plan 42 step 27. Debounced ruleset runner hook.
//
// Wraps `evaluateRuleset` behind a 250 ms trailing-edge debounce so the
// live-preview badge does not thrash while the user edits condition
// params. The evaluator is injected: real image acquisition + ROI
// cropping wire up in a later plan (spec 48 s8, spec 50 s5). Keeping the
// hook evaluator-agnostic means the color evaluator (step 25) plus a
// stub evaluator can drive it today; production callers pass one that
// captures the current frame.
//
// Observability: every run emits an info log (`I_UI_LIVE_PREVIEW_RUN`)
// and errors surface as `W_UI_LIVE_PREVIEW_ERROR` so silent failure is
// impossible per the coding guidelines.

import { RunStatusType } from "@/types/run/RunStatus";
import { useEffect, useRef, useState } from "react";
import type { Ruleset } from "@/lib/editor/schema";
import type { ConditionEvaluator, RulesetResult } from "@/lib/editor/runner/types";
import { evaluateRuleset } from "@/lib/editor/runner/ruleset-eval";
import { ValidationStatus } from "@/lib/enums/validation";

export enum LivePreviewStatusType {
  Idle = "idle",
  Running = "running",
  Done = "done",
  Error = "error",
}
export type LivePreviewStatus = LivePreviewStatusType;

export interface LivePreviewState {
  status: LivePreviewStatus;
  result: RulesetResult | null;
  error: string | null;
  /** Monotonically increasing counter, one per completed run (success or fail). */
  runCount: number;
}

export interface UseLivePreviewOptions {
  /** Debounce delay for edits (ms). Default 250 ms. */
  debounceMs?: number;
  /** Injected evaluator; when omitted the badge stays idle. */
  evaluator?: ConditionEvaluator;
  /** When false the hook does nothing (badge hidden). */
  enabled?: boolean;
}

const DEFAULT_DEBOUNCE_MS = 250;

function logEvent(level: "info" | "warn", code: string, detail: Record<string, unknown>): void {
  (level === ValidationStatus.Warn ? console.warn : console.info)(`[${code}]`, detail);
}

export function useLivePreview(
  ruleset: Ruleset | null | undefined,
  { debounceMs = DEFAULT_DEBOUNCE_MS, evaluator, enabled = true }: UseLivePreviewOptions = {},
): LivePreviewState {
  const [state, setState] = useState<LivePreviewState>({
    status: LivePreviewStatusType.Idle,
    result: null,
    error: null,
    runCount: 0,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !ruleset || !evaluator) {
      setState((s) => ({ ...s, status: LivePreviewStatusType.Idle }));

      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setState((s) => ({ ...s, status: LivePreviewStatusType.Running }));

    timerRef.current = setTimeout(() => {
      const runId = ++runIdRef.current;
      const startedAt = performance.now();
      evaluateRuleset(ruleset, evaluator).then(
        (result) => {
          if (runId !== runIdRef.current) return; // stale
          logEvent("info", "I_UI_LIVE_PREVIEW_RUN", {
            verdict: result.verdict,
            reasonCode: result.reasonCode,
            rules: result.rules.length,
            elapsedMs: Math.round(performance.now() - startedAt),
          });
          setState((s) => ({
            status: LivePreviewStatusType.Done,
            result,
            error: null,
            runCount: s.runCount + 1,
          }));
        },
        (err: unknown) => {
          if (runId !== runIdRef.current) return;
          const message = err instanceof Error ? err.message : String(err);
          logEvent("warn", "W_UI_LIVE_PREVIEW_ERROR", { message });
          setState((s) => ({
            status: LivePreviewStatusType.Error,
            result: null,
            error: message,
            runCount: s.runCount + 1,
          }));
        },
      );
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [ruleset, evaluator, enabled, debounceMs]);

  return state;
}
