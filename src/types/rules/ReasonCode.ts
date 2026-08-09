// Plan 42 step 10 (Reason-Code enum). PascalCase verdict reason codes emitted
// by the rule runner (spec 47 s6, spec 48 s6-s7, spec 49 s4-s6). Distinct from
// dotted AppError codes in `src/lib/errors/registry.ts`; those are for logs
// and observability, these are the values placed on `Judgment.ReasonCodeType` /
// `PerConditionResult.ReasonCodeType` and shown to end users through the label
// registry.

export enum ReasonCodeType {
  OK = 'OK',
  ColorDeltaE = 'ColorDeltaE',
  EmptyRoi = 'EmptyRoi',
  RuleConditionEval = 'RuleConditionEval',
  SequentialShortCircuit = 'SequentialShortCircuit',
  RulesetEval = 'RulesetEval',
}

export function isReasonCode(value: unknown): value is ReasonCodeType {
  return typeof value === "string" && (Object.values(ReasonCodeType) as readonly string[]).includes(value);
}

/** Human labels; matched by `src/lib/display-labels.ts` when rendering verdicts. */
export const REASON_CODE_LABEL: Record<ReasonCodeType, string> = {
  OK: "OK",
  ColorDeltaE: "Color ΔE exceeded threshold",
  EmptyRoi: "Empty region of interest",
  RuleConditionEval: "Condition evaluator error",
  SequentialShortCircuit: "Skipped (earlier rule failed)",
  RulesetEval: "Ruleset evaluation error",
};
