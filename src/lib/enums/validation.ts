export enum ValidationStatusType {
  Pass = "pass",
  Fail = "fail",
  Warn = "warn",
}

export namespace ValidationStatusType {
  export function isPass(status: unknown): status is ValidationStatusType.Pass {
    return status === ValidationStatusType.Pass;
  }

  export function isFail(status: unknown): status is ValidationStatusType.Fail {
    return status === ValidationStatusType.Fail;
  }

  export function isWarn(status: unknown): status is ValidationStatusType.Warn {
    return status === ValidationStatusType.Warn;
  }
}
