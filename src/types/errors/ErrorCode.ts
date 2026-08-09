// Plan 41 step 10. ErrorCode enum for typed AppError.

export enum ErrorCodeType {
  HomeLoad = "HomeLoad",
  RuleValidate = "RuleValidate",
  DndOutOfBounds = "DndOutOfBounds",
  DiagnosticsRead = "DiagnosticsRead",
  Unknown = "Unknown",
}

export const ERROR_CODE_LABEL: Readonly<Record<ErrorCodeType, string>> = Object.freeze({
  [ErrorCodeType.HomeLoad]: "Home Load Failure",
  [ErrorCodeType.RuleValidate]: "Rule Validation Error",
  [ErrorCodeType.DndOutOfBounds]: "Drag Out Of Bounds",
  [ErrorCodeType.DiagnosticsRead]: "Diagnostics Read Error",
  [ErrorCodeType.Unknown]: "Unknown Error",
});

export namespace ErrorCodeType {
  export function isHomeLoad(val: string | null | undefined): boolean {
    return val === ErrorCodeType.HomeLoad;
  }
  export function isRuleValidate(val: string | null | undefined): boolean {
    return val === ErrorCodeType.RuleValidate;
  }
  export function isDndOutOfBounds(val: string | null | undefined): boolean {
    return val === ErrorCodeType.DndOutOfBounds;
  }
  export function isDiagnosticsRead(val: string | null | undefined): boolean {
    return val === ErrorCodeType.DiagnosticsRead;
  }
  export function isUnknown(val: string | null | undefined): boolean {
    return val === ErrorCodeType.Unknown;
  }
}
