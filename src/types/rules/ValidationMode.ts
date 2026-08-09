// Plan 42 step 6. Per-ruleset short-circuit policy. Parallel = v2-equivalent
// AND-merge across all rules; Sequential = top-to-bottom with skip-on-first
// non-PASS (see spec/21-app/49-validation-order.md).

export enum ValidationModeType {
  Parallel = 'parallel',
  Sequential = 'sequential',
}

export const VALIDATION_MODE_LABEL: Readonly<Record<ValidationModeType, string>> = Object.freeze({
  [ValidationModeType.Parallel]: "Parallel",
  [ValidationModeType.Sequential]: "Sequential",
});

export const VALIDATION_MODE_DESCRIPTION: Readonly<Record<ValidationModeType, string>> = Object.freeze({
  [ValidationModeType.Parallel]:
    "Every rule is evaluated. Ruleset verdict is the AND-merge of all rule verdicts (v2-equivalent).",
  [ValidationModeType.Sequential]:
    "Rules run top-to-bottom. On the first FAIL or ERROR, remaining rules are marked Skipped.",
});

export const ALL_VALIDATION_MODES: readonly ValidationModeType[] = Object.freeze([
  ValidationModeType.Parallel,
  ValidationModeType.Sequential,
]);

export const DEFAULT_VALIDATION_MODE: ValidationModeType = ValidationModeType.Parallel;

export function isValidationMode(value: unknown): value is ValidationModeType {
  return typeof value === "string" && (ALL_VALIDATION_MODES as readonly string[]).includes(value);
}
