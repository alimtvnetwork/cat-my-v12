// Plan 41 step 11. Typed AppError per spec/03-error-manage.

import { ErrorCodeType } from "@/types/errors/ErrorCode";

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly cause?: unknown;

  constructor(code: ErrorCodeType, message: string, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.cause = cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown, fallbackCode: ErrorCodeType): AppError {
  if (isAppError(error)) return error;

  if (error instanceof Error) {
    return new AppError(fallbackCode, error.message, error);
  }

  return new AppError(fallbackCode, String(error), error);
}
