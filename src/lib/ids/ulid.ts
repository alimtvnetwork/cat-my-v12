/**
 * Crockford Base32 ULID validator - mirrors `app/core/ids/ulid.py`.
 * Every route param / RPC boundary that accepts a jobId/taskId/ruleId
 * runs the value through `assertUlid` so downstream renderers never see
 * malformed identifiers (audit F-20/F-21/F-29).
 */

export const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function isUlid(value: unknown): value is string {
  return typeof value === "string" && ULID_RE.test(value);
}

export class UlidFormatError extends Error {
  readonly code = "E_ID_INVALID" as const;
  readonly field: string;
  constructor(value: unknown, field = "id") {
    super(`${field}=${JSON.stringify(value)} is not a valid ULID`);
    this.name = "UlidFormatError";
    this.field = field;
  }
}

export function assertUlid(value: unknown, field = "id"): string {
  if (isUlid(value) === false) throw new UlidFormatError(value, field);

  return value;
}
