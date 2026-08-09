import { RuleAuditExportFormatType } from "@/lib/rules/audit-export";
import { RuleAuditSourceType } from "@/lib/rules/audit-store";
// @vitest-environment node
import { describe, it, expect } from "vitest";

import type { RuleAuditEvent } from "../audit-store";
import type { RuleId } from "../model";
import { serializeAuditToJson, serializeAuditToCsv, buildAuditFilename } from "../audit-export";

const sample: RuleAuditEvent[] = [
  {
    id: "abcd1234",
    timestamp: 1_752_000_000_000,
    ruleId: "r-1" as RuleId,
    ruleName: 'With "quote", and comma',
    prev: true,
    next: false,
    source: RuleAuditSourceType.Single,
  },
  {
    id: "efgh5678",
    timestamp: 1_752_000_060_000,
    ruleId: "r-2" as RuleId,
    ruleName: "Second",
    prev: false,
    next: true,
    source: RuleAuditSourceType.BulkUndo,
  },
];

describe("rule audit export", () => {
  it("serializes to JSON with an envelope and stable count", () => {
    const raw = serializeAuditToJson(sample);
    const parsed = JSON.parse(raw);
    expect(parsed.count).toBe(2);
    expect(parsed.events).toHaveLength(2);
    expect(parsed.events[0].ruleId).toBe("r-1");
    expect(typeof parsed.exportedAt).toBe("string");
  });

  it("serializes to CSV with RFC 4180 escaping and iso column", () => {
    const csv = serializeAuditToCsv(sample);
    const [header, row1, row2] = csv.split("\r\n");
    expect(header).toBe("id,timestamp,iso,ruleId,ruleName,prev,next,source");
    // Quoted field because it contains a comma AND double quotes.
    expect(row1).toContain('"With ""quote"", and comma"');
    expect(row1).toContain(",true,false,single");
    expect(row2).toContain("efgh5678,");
    expect(row2).toContain(",false,true,bulk-undo");
  });

  it("builds a filename with the format extension and timestamped stamp", () => {
    const at = new Date("2026-07-19T12:34:56.789Z");
    expect(buildAuditFilename(RuleAuditExportFormatType.Json, at)).toBe(
      "rule-audit-2026-07-19T12-34-56-789Z.json",
    );
    expect(buildAuditFilename(RuleAuditExportFormatType.Csv, at)).toBe(
      "rule-audit-2026-07-19T12-34-56-789Z.csv",
    );
  });
});
