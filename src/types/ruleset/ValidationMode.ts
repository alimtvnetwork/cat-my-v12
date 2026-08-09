// Plan 42 step 10. Ruleset-level validation mode. Default is Parallel;
// Sequential adds short-circuit semantics where layer order is authoritative.

export enum ValidationModeType {
  Parallel = 'parallel',
  Sequential = 'sequential',
}

export const VALIDATION_MODE_LABEL: Readonly<Record<ValidationModeType, string>> = Object.freeze({
  [ValidationModeType.Parallel]: "Parallel",
  [ValidationModeType.Sequential]: "Sequential",
});

export const DEFAULT_VALIDATION_MODE: ValidationModeType = ValidationModeType.Parallel;

export const ALL_VALIDATION_MODES: readonly ValidationModeType[] = Object.freeze([
  ValidationModeType.Parallel,
  ValidationModeType.Sequential,
]);

export function isValidationMode(value: unknown): value is ValidationModeType {
  return typeof value === "string" && (ALL_VALIDATION_MODES as readonly string[]).includes(value);
}
