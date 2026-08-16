import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 71 follow-up: Export persisted error history to JSON / CSV so it can
// be shared with teammates or attached to audits. Pure functions; the
// browser-side download helper lives at the bottom. Kept dependency-free so
// the same serializers work under Node for tests and future server exports.

import type { CapturedError } from "@/types/errors";

export enum ErrorExportFormatType {
  Json = "json",
  Csv = "csv",
}
export type ErrorExportFormat = ErrorExportFormatType;

/** Fields exposed in the flat CSV. Nested / large fields are JSON-encoded. */
const CSV_COLUMNS = [
  "id",
  "correlationId",
  "createdAt",
  "code",
  "level",
  "message",
  "endpoint",
  "method",
  "responseStatus",
  "triggerComponent",
  "triggerAction",
  "sessionId",
  "stackTrace",
  "context",
  "requestBody",
  "invocationChain",
] as const;

type CsvColumn = (typeof CSV_COLUMNS)[number];

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  const asString =
    typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : safeJson(value);
  // RFC 4180: wrap in quotes and double any internal quotes when the field
  // contains a comma, quote, CR, or LF.
  if (/[",\r\n]/.test(asString)) {
    return `"${asString.replace(/"/g, '""')}"`;
  }

  return asString;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function cellValue(err: CapturedError, col: CsvColumn): unknown {
  switch (col) {
    case "invocationChain":
      return err.invocationChain ? err.invocationChain.join(" > ") : "";
    case "context":
    case "requestBody":
      return err[col];
    default:
      return err[col];
  }
}

export function serializeErrorsToJson(history: CapturedError[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: history.length,
      errors: history,
    },
    null,
    2,
  );
}

export function serializeErrorsToCsv(history: CapturedError[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = history.map((e) => CSV_COLUMNS.map((col) => csvEscape(cellValue(e, col))).join(","));

  return [header, ...rows].join("\r\n");
}

export function buildExportFilename(format: ErrorExportFormat, at: Date = new Date()): string {
  const stamp = at.toISOString().replace(/[:.]/g, "-");

  return `error-history-${stamp}.${format}`;
}

/** Browser-only: trigger a file download for the serialized history. */
export function downloadErrorHistory(history: CapturedError[], format: ErrorExportFormat): void {
  const isJson = format === ErrorExportFormatType.Json;
  const body = isJson ? serializeErrorsToJson(history) : serializeErrorsToCsv(history);
  const mime = isJson ? "application/json" : "text/csv";
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildExportFilename(format);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  ClientLogger.info(`[errors/export] downloaded format=${format} count=${history.length}`);
}

export const __TEST__ = { CSV_COLUMNS };
