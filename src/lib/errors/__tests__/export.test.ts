import { ErrorExportFormatType } from "@/lib/errors/export";
import { describe, it, expect } from "vitest";

import { ErrorLevelType, type CapturedError } from "@/types/errors";
import {
  buildExportFilename,
  serializeErrorsToCsv,
  serializeErrorsToJson,
} from "@/lib/errors/export";
import { HttpMethod } from "@/lib/constants";

const sample: CapturedError[] = [
  {
    id: "a1",
    correlationId: "ABCD1234",
    code: "E_TEST",
    level: ErrorLevelType.Error,
    message: 'Boom, "quoted", and\nnewline',
    createdAt: "2026-07-17T12:00:00.000Z",
    endpoint: "/api/x",
    method: HttpMethod.Post,
    responseStatus: 500,
    invocationChain: ["A", "B"],
    context: { foo: 1 },
  },
  {
    id: "a2",
    correlationId: "EFGH5678",
    code: "E_OTHER",
    level: ErrorLevelType.Warn,
    message: "Simple",
    createdAt: "2026-07-17T12:01:00.000Z",
  },
];

describe("errors/export", () => {
  it("serializes to JSON with envelope", () => {
    const json = JSON.parse(serializeErrorsToJson(sample));
    expect(json.count).toBe(2);
    expect(json.errors).toHaveLength(2);
    expect(json.errors[0].id).toBe("a1");
    expect(typeof json.exportedAt).toBe("string");
  });

  it("serializes to CSV with header and escaping", () => {
    const csv = serializeErrorsToCsv(sample);
    const lines = csv.split("\r\n");
    expect(lines[0].split(",")).toContain("message");
    // Escaped quotes + preserved newline inside quoted field
    expect(lines[1]).toContain('"Boom, ""quoted"", and\nnewline"');
    // invocationChain flattened
    expect(lines[1]).toContain("A > B");
    // context is JSON-encoded
    expect(csv).toContain('"{""foo"":1}"');
  });

  it("emits an ISO-safe filename", () => {
    const name = buildExportFilename(ErrorExportFormatType.Csv, new Date("2026-07-17T12:00:00Z"));
    expect(name).toMatch(/^error-history-2026-07-17T12-00-00-000Z\.csv$/);
  });
});
