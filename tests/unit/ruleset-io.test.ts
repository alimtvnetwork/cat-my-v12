// Plan 35 step 23: comprehensive coverage for the ruleset serializer +
// parser. Locks the schema/version/error paths so silent regressions in
// the import pipeline surface immediately.
import { describe, expect, it } from "vitest";
import {
  buildRuleSetFile,
  parseRuleSet,
  RULESET_SCHEMA_VERSION,
  RuleSetImportError,
  RuleSetMigrationError,
  serializeRuleSet,
} from "@/lib/editor/ruleset-io";
import type { EditorRule } from "@/lib/editor/types";

const rules: EditorRule[] = [
  {
    id: "a",
    name: "A",
    kind: "R",
    isHidden: false,
    isLocked: false,
    x: 1,
    y: 2,
    width: 3,
    height: 4,
  },
  {
    id: "b",
    name: "B",
    kind: "C",
    isHidden: true,
    isLocked: true,
    x: 5,
    y: 6,
    width: 7,
    height: 8,
    params: { threshold: 0.5 },
  },
];

function baseFile(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schema: "control-automation.ruleset",
    version: RULESET_SCHEMA_VERSION,
    exportedAt: "2026-07-15T00:00:00.000Z",
    rules,
    ...overrides,
  });
}

describe("buildRuleSetFile", () => {
  it("stamps schema, version, exportedAt, and deep-clones rule params", () => {
    const file = buildRuleSetFile(rules);
    expect(file.schema).toBe("control-automation.ruleset");
    expect(file.version).toBe(RULESET_SCHEMA_VERSION);
    expect(new Date(file.exportedAt).toString()).not.toBe("Invalid Date");
    // Mutating the built file must not touch the source.
    (file.rules[1].params as Record<string, number>).threshold = 9;
    expect(rules[1].params?.threshold).toBe(0.5);
  });
});

describe("serializeRuleSet + parseRuleSet round-trip", () => {
  it("preserves rule shape and defaults empty groups", () => {
    // Plan 42 step 12: parseRuleSet now attaches a default SameImage
    // condition per rule when the payload has no conditions array. Compare
    // the v2 shape without the migration-added field.
    const parsed = parseRuleSet(serializeRuleSet(rules));
    const stripped = parsed.rules.map((r) => {
      const { conditions: _c, ...rest } = r as unknown as { conditions?: unknown };
      return rest;
    });
    expect(stripped).toEqual(rules);
    expect(parsed.groups).toEqual([]);
    // Every rule got a single deterministic SameImage condition.
    for (const r of parsed.rules) {
      const conds = (r as unknown as { conditions: unknown[] }).conditions;
      expect(conds).toHaveLength(1);
      expect((conds[0] as { type: string }).type).toBe("same-image");
      expect((conds[0] as { id: string }).id).toBe(`${r.id}:c1`);
    }
  });
});

describe("parseRuleSet rejects malformed input", () => {
  it("throws on invalid JSON", () => {
    expect(() => parseRuleSet("not json")).toThrow(RuleSetImportError);
  });
  it("throws when root is not an object", () => {
    expect(() => parseRuleSet("null")).toThrow(/root must be an object/);
  });
  it("throws on wrong schema tag", () => {
    expect(() => parseRuleSet(JSON.stringify({ schema: "other", version: 2, rules: [] }))).toThrow(
      /unexpected schema/,
    );
  });
  it("throws on unsupported version", () => {
    expect(() => parseRuleSet(baseFile({ version: 99 }))).toThrow(/unsupported version/);
  });
  it("throws when rules is not an array", () => {
    expect(() => parseRuleSet(baseFile({ rules: {} }))).toThrow(/rules must be an array/);
  });
  it("throws on invalid rule kind", () => {
    expect(() => parseRuleSet(baseFile({ rules: [{ ...rules[0], kind: "Z" }] }))).toThrow(
      /kind invalid/,
    );
  });
  it("throws when a bounds field is not a number", () => {
    expect(() => parseRuleSet(baseFile({ rules: [{ ...rules[0], width: "wide" }] }))).toThrow(
      /width must be a number/,
    );
  });
  it("throws when a rule id is missing", () => {
    expect(() => parseRuleSet(baseFile({ rules: [{ ...rules[0], id: "" }] }))).toThrow(
      /id missing/,
    );
  });
});

describe("parseRuleSet v1 -> v2 migration", () => {
  const v1Rule = {
    id: "legacy",
    name: "legacy",
    kind: "C",
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    params: { expectedColor: "#ff0000", deltaE: 5 },
  };

  it("migrates a v1 file to v2 rules", () => {
    const text = JSON.stringify({
      schema: "control-automation.ruleset",
      version: 1,
      exportedAt: "2026-07-15T00:00:00.000Z",
      rules: [v1Rule],
    });
    const parsed = parseRuleSet(text);
    expect(parsed.rules).toHaveLength(1);
    expect((parsed.rules[0] as unknown as { controller: string }).controller).toBe("color");
    expect(parsed.groups).toEqual([]);
  });

  it("wraps MigrationError as RuleSetMigrationError with ruleIndex + code", () => {
    const bad = { ...v1Rule, params: { kind: "not-a-controller" } };
    const text = JSON.stringify({
      schema: "control-automation.ruleset",
      version: 1,
      exportedAt: "2026-07-15T00:00:00.000Z",
      rules: [bad],
    });
    try {
      parseRuleSet(text);
      throw new Error("expected parseRuleSet to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RuleSetMigrationError);
      const e = err as RuleSetMigrationError;
      expect(e.ruleIndex).toBe(0);
      expect(e.code).toBe("E_UI_RULE_MIGRATE_FAIL");
    }
  });
});
