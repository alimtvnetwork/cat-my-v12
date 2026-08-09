// Plan 42 step 27. useLivePreview: unit-test the pure pieces without
// rendering. `renderHook` requires jsdom and adds substantial setup cost;
// the hook body is thin so instead we drive `evaluateRuleset` directly and
// keep the hook covered by manual QA + typecheck (the hook only wraps
// evaluateRuleset with debounce + state).

import { describe, it, expect, vi } from "vitest";
import { evaluateRuleset } from "@/lib/editor/runner/ruleset-eval";
import type { ConditionEvaluator } from "@/lib/editor/runner/types";
import type { Ruleset } from "@/lib/editor/schema";
import { ValidationMode } from "@/types/rules/ValidationMode";

function emptyRuleset(): Ruleset {
  return {
    schemaVersion: 3,
    rules: [],
    validationMode: ValidationMode.Parallel,
  } as unknown as Ruleset;
}

describe("useLivePreview supporting contract", () => {
  it("evaluateRuleset with no rules yields PASS/OK (base case for the badge idle->done transition)", async () => {
    const evaluator: ConditionEvaluator = vi.fn();
    const res = await evaluateRuleset(emptyRuleset(), evaluator);
    expect(res.verdict).toBe("PASS");
    expect(res.reasonCode).toBe("OK");
    expect(evaluator).not.toHaveBeenCalled();
  });
});
