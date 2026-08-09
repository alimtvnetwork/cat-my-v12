// Plan 42 step 6. Per-ruleset short-circuit policy. Parallel = v2-equivalent
// AND-merge across all rules; Sequential = top-to-bottom with skip-on-first
// non-PASS (see spec/21-app/49-validation-order.md).

export const ValidationMode = {
  Parallel: "parallel",
  Sequential: "sequential",
} as const;

export type ValidationMode = (typeof ValidationMode)[keyof typeof ValidationMode];

export const VALIDATION_MODE_LABEL: Readonly<Record<ValidationMode, string>> = Object.freeze({
  [ValidationMode.Parallel]: "Parallel",
  [ValidationMode.Sequential]: "Sequential",
});

export const VALIDATION_MODE_DESCRIPTION: Readonly<Record<ValidationMode, string>> = Object.freeze({
  [ValidationMode.Parallel]:
    "Every rule is evaluated. Ruleset verdict is the AND-merge of all rule verdicts (v2-equivalent).",
  [ValidationMode.Sequential]:
    "Rules run top-to-bottom. On the first FAIL or ERROR, remaining rules are marked Skipped.",
});

export const ALL_VALIDATION_MODES: readonly ValidationMode[] = Object.freeze([
  ValidationMode.Parallel,
  ValidationMode.Sequential,
]);

export const DEFAULT_VALIDATION_MODE: ValidationMode = ValidationMode.Parallel;

export function isValidationMode(value: unknown): value is ValidationMode {
  return typeof value === "string" && (ALL_VALIDATION_MODES as readonly string[]).includes(value);
}
