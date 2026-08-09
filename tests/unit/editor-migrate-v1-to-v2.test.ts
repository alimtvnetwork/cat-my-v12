import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARAMS,
  RULESET_SCHEMA_VERSION,
  type EditorRuleV1,
  type EditorRuleV2,
} from "@/lib/editor/schema";
import { MigrationError, migrateRuleSetV1ToV2, migrateRuleV1ToV2 } from "@/lib/editor/migrations";

const geom = { x: 0, y: 0, width: 10, height: 10 };
const base = { isHidden: false, isLocked: false, family: "rect" as const, ...geom };

function v1(id: string, name: string, params: EditorRuleV1["params"]): EditorRuleV1 {
  return { id, name, kind: "R", ...base, params };
}

describe("migrateRuleV1ToV2", () => {
  it("empty set returns empty array", () => {
    expect(migrateRuleSetV1ToV2([])).toEqual([]);
  });

  it("schema version constant is 3", () => {
    expect(RULESET_SCHEMA_VERSION).toBe(3);
  });

  it("infers ocr from expectedText field", () => {
    const out = migrateRuleV1ToV2(v1("r1", "Lot", { expectedText: "LOT-0421" }));
    expect(out.controller).toBe("ocr");
    expect(out.params).toEqual({
      expectedText: "LOT-0421",
      caseInsensitive: true,
      stripWhitespace: true,
    });
    expect(out.id).toBe("r1");
    expect(out.name).toBe("Lot");
    expect(out.kind).toBe("R");
  });

  it("honours explicit params.kind over inference", () => {
    const out = migrateRuleV1ToV2(v1("r2", "Blob", { kind: "blob", minArea: 5 }));
    expect(out.controller).toBe("blob");
    expect(out.params).toMatchObject({ minArea: 5, maxArea: 0, expectedCount: 1 });
  });

  it("mixed batch preserves order and per-kind defaults", () => {
    const batch: EditorRuleV1[] = [
      v1("a", "A", { expectedColor: "#ff0000" }),
      v1("b", "B", { expression: "a.value + 1" }),
      v1("c", "C", { referenceAsset: "programs/x/assets/y.png" }),
    ];
    const out = migrateRuleSetV1ToV2(batch);
    expect(out.map((r) => [r.id, r.controller])).toEqual([
      ["a", "color"],
      ["b", "math"],
      ["c", "pattern"],
    ]);
    expect(out[0].params).toMatchObject({ expectedColor: "#ff0000", deltaE: 10 });
    expect(out[2].params).toMatchObject({
      referenceAsset: "programs/x/assets/y.png",
      matchThreshold: 0.8,
    });
  });

  it("already-v2 input is idempotent (deep equal, no rewrite)", () => {
    const v2Rule: EditorRuleV2 = {
      id: "v2",
      name: "V2",
      kind: "R",
      ...base,
      controller: "number",
      params: { min: 1, max: 9, unit: "mm" },
    };
    const out = migrateRuleV1ToV2(v2Rule);
    expect(out).toEqual(v2Rule);
    // clone, not the same reference (params spread guarantees no aliasing)
    expect(out.params).not.toBe(v2Rule.params);
  });

  it("rejects rules with an explicit unknown controller kind", () => {
    const bad = v1("x", "X", { kind: "unknown-controller" });
    expect(() => migrateRuleV1ToV2(bad, 3)).toThrowError(MigrationError);
    try {
      migrateRuleV1ToV2(bad, 3);
    } catch (err) {
      expect(err).toBeInstanceOf(MigrationError);
      expect((err as MigrationError).code).toBe("E_UI_RULE_MIGRATE_FAIL");
      expect((err as MigrationError).ruleIndex).toBe(3);
    }
  });

  it("passes through lightingRef when present", () => {
    const withLight = { ...v1("l", "L", { threshold: 0.7 }), lightingRef: "preset-A" };
    const out = migrateRuleV1ToV2(withLight);
    expect(out.lightingRef).toBe("preset-A");
    expect(out.controller).toBe("presence");
  });

  it("presence defaults applied when only threshold is given", () => {
    const out = migrateRuleV1ToV2(v1("p", "P", { threshold: 0.42 }));
    expect(out.controller).toBe("presence");
    expect(out.params).toEqual({ threshold: 0.42, minBlobPx: DEFAULT_PARAMS.presence.minBlobPx });
  });

  it("defaults legacy rules without params to presence", () => {
    const out = migrateRuleV1ToV2(v1("plain", "Plain", undefined));
    expect(out.controller).toBe("presence");
    expect(out.params).toEqual(DEFAULT_PARAMS.presence);
  });
});
