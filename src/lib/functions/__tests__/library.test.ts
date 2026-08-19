import { describe, it, expect } from "vitest";
import {
  EMPTY_LIBRARY,
  FUNCTION_SOURCE_MAX_BYTES,
  deleteFunction,
  exportLibraryJson,
  getFunction,
  importLibraryJson,
  upsertFunction,
  validateFunctionEntry,
  type FunctionEntry,
} from "../library";

const t = 1_700_000_000_000;

function makeEntry(overrides: Partial<FunctionEntry> = {}): FunctionEntry {

  return {
    id: "fn-1",
    name: "double",
    description: "return x * 2",
    source: "return x * 2;",
    createdAt: t,
    updatedAt: t,
    ...overrides,
  };
}

describe("validateFunctionEntry", () => {
  it("accepts a well-formed entry", () => {
    expect(validateFunctionEntry(makeEntry())).toEqual([]);
  });

  it("rejects empty id / name / source", () => {
    const errs = validateFunctionEntry(makeEntry({ id: "", name: "", source: "  " }));
    const codes = errs.map((e) => e.code);
    expect(codes).toContain("fn.id.empty");
    expect(codes).toContain("fn.name.empty");
    expect(codes).toContain("fn.source.empty");
  });

  it("rejects source over max size", () => {
    const errs = validateFunctionEntry(
      makeEntry({ source: "a".repeat(FUNCTION_SOURCE_MAX_BYTES + 1) }),
    );
    expect(errs.map((e) => e.code)).toContain("fn.source.tooLarge");
  });

  it("rejects invalid timestamps", () => {
    expect(validateFunctionEntry(makeEntry({ createdAt: 0 })).map((e) => e.code)).toContain(
      "fn.timestamps.invalid",
    );
    expect(
      validateFunctionEntry(makeEntry({ createdAt: t + 10, updatedAt: t })).map((e) => e.code),
    ).toContain("fn.timestamps.invalid");
  });
});

describe("upsertFunction", () => {
  it("adds a new entry", () => {
    const r = upsertFunction(EMPTY_LIBRARY, makeEntry());
    expect(r.errors).toEqual([]);
    expect(r.library.entries).toHaveLength(1);
  });

  it("updates existing entry and preserves original createdAt", () => {
    const first = upsertFunction(EMPTY_LIBRARY, makeEntry({ createdAt: t, updatedAt: t }));
    const second = upsertFunction(
      first.library,
      makeEntry({ name: "renamed", createdAt: t + 100, updatedAt: t + 100 }),
    );
    expect(second.library.entries).toHaveLength(1);
    expect(second.library.entries[0].name).toBe("renamed");
    expect(second.library.entries[0].createdAt).toBe(t); // preserved
    expect(second.library.entries[0].updatedAt).toBe(t + 100);
  });

  it("returns errors and leaves the library unchanged on invalid input", () => {
    const r = upsertFunction(EMPTY_LIBRARY, makeEntry({ name: "" }));
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.library.entries).toHaveLength(0);
  });
});

describe("deleteFunction + getFunction", () => {
  it("delete removes the matching id and leaves others", () => {
    const lib = upsertFunction(
      upsertFunction(EMPTY_LIBRARY, makeEntry({ id: "a" })).library,
      makeEntry({ id: "b" }),
    ).library;
    const after = deleteFunction(lib, "a");
    expect(after.entries.map((e) => e.id)).toEqual(["b"]);
  });

  it("delete on missing id is a no-op", () => {
    expect(deleteFunction(EMPTY_LIBRARY, "nope").entries).toEqual([]);
  });

  it("getFunction returns entry or null", () => {
    const lib = upsertFunction(EMPTY_LIBRARY, makeEntry()).library;
    expect(getFunction(lib, "fn-1")?.name).toBe("double");
    expect(getFunction(lib, "missing")).toBeNull();
  });
});

describe("export / import round-trip", () => {
  it("exportLibraryJson produces valid JSON that importLibraryJson parses back", () => {
    const lib = upsertFunction(
      upsertFunction(EMPTY_LIBRARY, makeEntry({ id: "a" })).library,
      makeEntry({ id: "b", name: "triple", source: "return x*3;" }),
    ).library;
    const text = exportLibraryJson(lib);
    const result = importLibraryJson(text);
    expect(result.parseError).toBeUndefined();
    expect(result.errors).toEqual([]);
    expect(result.library).toEqual(lib);
  });

  it("surfaces parseError on invalid JSON", () => {
    const r = importLibraryJson("{not json");
    expect(r.parseError).toBeDefined();
    expect(r.library.entries).toEqual([]);
  });

  it("rejects unsupported version and empties library", () => {
    const r = importLibraryJson(JSON.stringify({ version: 99, entries: [] }));
    expect(r.parseError).toContain("unsupported version");
  });

  it("rejects non-array entries", () => {
    const r = importLibraryJson(JSON.stringify({ version: 1, entries: "nope" }));
    expect(r.parseError).toContain("entries must be an array");
  });

  it("collects per-entry errors and keeps valid entries", () => {
    const payload = JSON.stringify({
      version: 1,
      entries: [
        makeEntry({ id: "ok" }),
        makeEntry({ id: "", name: "" }), // invalid, should be dropped with errors
      ],
    });
    const r = importLibraryJson(payload);
    expect(r.parseError).toBeUndefined();
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.library.entries.map((e) => e.id)).toEqual(["ok"]);
  });
});
