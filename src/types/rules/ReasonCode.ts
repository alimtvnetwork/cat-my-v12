// Plan 42 step 10 (Reason-Code enum). PascalCase verdict reason codes emitted
// by the rule runner (spec 47 s6, spec 48 s6-s7, spec 49 s4-s6). Distinct from
// dotted AppError codes in `src/lib/errors/registry.ts`; those are for logs
// and observability, these are the values placed on `Judgment.reasonCode` /
// `PerConditionResult.reasonCode` and shown to end users through the label
// registry.

export const REASON_CODES = [
  "OK",
  // spec 48 s6-s7 — color condition
  "ColorDeltaE",
  "EmptyRoi",
  // spec 47 s6 — internal evaluator error inside a single condition
  "RuleConditionEval",
  // spec 49 s5-s6 — sequential validation short-circuit + top-level runner error
  "SequentialShortCircuit",
  "RulesetEval",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

/**
 * Plan 42 step 29. Named constants for every `ReasonCode` value so callers
 * import `ReasonCode.ColorDeltaE` instead of typing the raw literal. Paired
 * with the ESLint `no-restricted-syntax` gate in `eslint.config.js` that
 * bans the raw string form outside the declaring module + tests, so future
 * runner code cannot silently drift from this enum.
 */
export const ReasonCode = Object.freeze({
  OK: "OK",
  ColorDeltaE: "ColorDeltaE",
  EmptyRoi: "EmptyRoi",
  RuleConditionEval: "RuleConditionEval",
  SequentialShortCircuit: "SequentialShortCircuit",
  RulesetEval: "RulesetEval",
}) satisfies Record<string, ReasonCode>;

export function isReasonCode(value: unknown): value is ReasonCode {
  return typeof value === "string" && (REASON_CODES as readonly string[]).includes(value);
}

/** Human labels; matched by `src/lib/display-labels.ts` when rendering verdicts. */
export const REASON_CODE_LABEL: Record<ReasonCode, string> = {
  OK: "OK",
  ColorDeltaE: "Color ΔE exceeded threshold",
  EmptyRoi: "Empty region of interest",
  RuleConditionEval: "Condition evaluator error",
  SequentialShortCircuit: "Skipped (earlier rule failed)",
  RulesetEval: "Ruleset evaluation error",
};
