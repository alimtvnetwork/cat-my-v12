// Rule audit export. Mirrors the shape of `src/lib/errors/export.ts` so the
// codebase keeps a single blob-download pattern. Pure serializers below;
// browser-only `downloadRuleAudit` at the bottom. Kept dependency-free so
// the same functions run under Node in vitest.

import type { RuleAuditEvent } from "./audit-store";

export enum RuleAuditExportFormatType {
  Json = "json",
  Csv = "csv",
}
export type RuleAuditExportFormat = RuleAuditExportFormatType;

const CSV_COLUMNS = [
  "id",
  "timestamp",
  "iso",
  "ruleId",
  "ruleName",
  "prev",
  "next",
  "source",
] as const;

type CsvColumn = (typeof CSV_COLUMNS)[number];

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return "";
  const asString =
    typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);
  // RFC 4180.
  if (/[",\r\n]/.test(asString)) {
    return `"${asString.replace(/"/g, '""')}"`;
  }

  return asString;
}

function cellValue(e: RuleAuditEvent, col: CsvColumn): unknown {
  switch (col) {
    case "iso":
      return new Date(e.timestamp).toISOString();
    default:
      return e[col];
  }
}

export function serializeAuditToJson(events: RuleAuditEvent[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: events.length,
      events,
    },
    null,
    2,
  );
}

export function serializeAuditToCsv(events: RuleAuditEvent[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = events.map((e) => CSV_COLUMNS.map((col) => csvEscape(cellValue(e, col))).join(","));

  return [header, ...rows].join("\r\n");
}

export function buildAuditFilename(format: RuleAuditExportFormat, at: Date = new Date()): string {
  const stamp = at.toISOString().replace(/[:.]/g, "-");

  return `rule-audit-${stamp}.${format}`;
}

/** Browser-only. Triggers a file download for the serialized audit trail. */
export function downloadRuleAudit(events: RuleAuditEvent[], format: RuleAuditExportFormat): void {
  const isJson = format === "json";
  const body = isJson ? serializeAuditToJson(events) : serializeAuditToCsv(events);
  const mime = isJson ? "application/json" : "text/csv";
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildAuditFilename(format);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  console.info(`[rule-audit/export] downloaded format=${format} count=${events.length}`);
}

export const __TEST__ = { CSV_COLUMNS };
