// Plan 42 step 10. Ruleset-level validation mode. Default is Parallel;
// Sequential adds short-circuit semantics where layer order is authoritative.

export const ValidationMode = {
  Parallel: "parallel",
  Sequential: "sequential",
} as const;

export type ValidationMode = (typeof ValidationMode)[keyof typeof ValidationMode];

export const VALIDATION_MODE_LABEL: Readonly<Record<ValidationMode, string>> = Object.freeze({
  [ValidationMode.Parallel]: "Parallel",
  [ValidationMode.Sequential]: "Sequential",
});

export const DEFAULT_VALIDATION_MODE: ValidationMode = ValidationMode.Parallel;

export const ALL_VALIDATION_MODES: readonly ValidationMode[] = Object.freeze([
  ValidationMode.Parallel,
  ValidationMode.Sequential,
]);

export function isValidationMode(value: unknown): value is ValidationMode {
  return typeof value === "string" && (ALL_VALIDATION_MODES as readonly string[]).includes(value);
}
