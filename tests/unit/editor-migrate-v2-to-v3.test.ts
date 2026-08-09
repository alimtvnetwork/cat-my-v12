// Plan 42 step 13. Explicit v1 -> v3 and v2 -> v3 round-trip coverage for
// `parseRuleSet` and the migration chain. Complements the pre-existing
// `editor-migrate-v1-to-v2.test.ts` (unit-scope migration) by verifying the
// IO boundary (`buildRuleSetFile` / `parseRuleSet`) plus the v3 non-empty
// conditions invariant from spec 47 s5.

import { describe, expect, it } from "vitest";
import {
  buildRuleSetFile,
  parseRuleSet,
  serializeRuleSet,
  RULESET_SCHEMA_VERSION,
} from "@/lib/editor/ruleset-io";
import { migrateRuleSetV2ToV3, migrateRuleV2ToV3 } from "@/lib/editor/migrations";
import { ConditionType } from "@/types/rules/ConditionType";
import { ValidationMode } from "@/types/rules/ValidationMode";
import type { EditorRule } from "@/lib/editor/types";

const geom = { x: 0, y: 0, width: 10, height: 10 };
const base = { isHidden: false, isLocked: false, family: "rect" as const, ...geom };

function v2Rule(id: string, name: string): EditorRule {
  return {
    id,
    name,
    kind: "R",
    ...base,
    // v2 controller shape survives through the EditorRule bag.
    params: { kind: "presence", threshold: 0.5, minBlobPx: 10 } as unknown as EditorRule["params"],
  };
}

describe("v2 -> v3 migration (unit)", () => {
  it("attaches default SameImage condition with deterministic id", () => {
    const r = v2Rule("r1", "Presence A");
    const v3 = migrateRuleV2ToV3(r as never);
    expect(v3.conditions).toHaveLength(1);
    expect(v3.conditions[0]).toMatchObject({
      id: "r1:c1",
      type: ConditionType.SameImage,
    });
  });

  it("is idempotent on v3 payloads", () => {
    const r = v2Rule("r1", "Presence A");
    const once = migrateRuleV2ToV3(r as never);
    const twice = migrateRuleV2ToV3(once);
    expect(twice.conditions.map((c) => c.id)).toEqual(once.conditions.map((c) => c.id));
    expect(twice.conditions).not.toBe(once.conditions); // clone, not alias
  });

  it("preserves rule order across a batch", () => {
    const batch: EditorRule[] = [v2Rule("a", "A"), v2Rule("b", "B"), v2Rule("c", "C")];
    const out = migrateRuleSetV2ToV3(batch as never);
    expect(out.map((r) => r.id)).toEqual(["a", "b", "c"]);
    for (const r of out) {
      expect(r.conditions).toHaveLength(1);
      expect(r.conditions[0].id).toBe(`${r.id}:c1`);
    }
  });
});

describe("v2 -> v3 round-trip via parseRuleSet", () => {
  it("v2 file (no conditions, no validationMode) upgrades cleanly", () => {
    const file = {
      schema: "control-automation.ruleset",
      version: 2,
      exportedAt: "2026-07-17T00:00:00.000Z",
      rules: [v2Rule("r1", "Presence A")],
    };
    const parsed = parseRuleSet(JSON.stringify(file));
    expect(parsed.rules).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conds = (parsed.rules[0] as any).conditions;
    expect(conds).toHaveLength(1);
    expect(conds[0]).toMatchObject({ id: "r1:c1", type: ConditionType.SameImage });
    expect(parsed.validationMode).toBe(ValidationMode.Parallel);
  });

  it("v3 file with explicit conditions round-trips without duplication", () => {
    const rules = [v2Rule("r1", "Presence A")];
    // First hop: build a v3 file via buildRuleSetFile + one migration pass.
    const seeded = migrateRuleSetV2ToV3(rules as never);
    const file = buildRuleSetFile(seeded as unknown as EditorRule[], [], ValidationMode.Sequential);
    const text = JSON.stringify(file);
    const parsed = parseRuleSet(text);
    expect(parsed.validationMode).toBe(ValidationMode.Sequential);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conds = (parsed.rules[0] as any).conditions;
    expect(conds).toHaveLength(1);
    expect(conds[0]).toMatchObject({ id: "r1:c1", type: ConditionType.SameImage });
  });

  it("full serialize/parse round-trip stabilises after one hop", () => {
    const rules = [v2Rule("r1", "A"), v2Rule("r2", "B")];
    const seeded = migrateRuleSetV2ToV3(rules as never);
    const first = serializeRuleSet(seeded as unknown as EditorRule[], [], ValidationMode.Parallel);
    const parsed1 = parseRuleSet(first);
    const second = serializeRuleSet(parsed1.rules, parsed1.groups, parsed1.validationMode);
    const parsed2 = parseRuleSet(second);
    // Structural equality on the conditions payload (dates / exportedAt drift).
    expect(parsed2.rules.map((r) => r.id)).toEqual(["r1", "r2"]);
    for (const r of parsed2.rules) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conds = (r as any).conditions;
      expect(conds).toHaveLength(1);
      expect(conds[0].id).toBe(`${r.id}:c1`);
    }
    expect(parsed2.validationMode).toBe(ValidationMode.Parallel);
  });
});

describe("v1 -> v3 round-trip via parseRuleSet", () => {
  it("v1 file goes through the full v1 -> v2 -> v3 chain", () => {
    const file = {
      schema: "control-automation.ruleset",
      version: 1,
      exportedAt: "2026-07-17T00:00:00.000Z",
      rules: [
        { id: "r1", name: "Lot", kind: "R", ...base, params: { expectedText: "LOT-0421" } },
        { id: "r2", name: "Blob", kind: "R", ...base, params: { kind: "blob", minArea: 5 } },
      ],
    };
    const parsed = parseRuleSet(JSON.stringify(file));
    expect(parsed.rules).toHaveLength(2);
    for (const r of parsed.rules) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conds = (r as any).conditions;
      expect(conds).toHaveLength(1);
      expect(conds[0]).toMatchObject({ id: `${r.id}:c1`, type: ConditionType.SameImage });
    }
    expect(parsed.validationMode).toBe(ValidationMode.Parallel);
  });
});

describe("schema version pinning", () => {
  it("RULESET_SCHEMA_VERSION is 3", () => {
    expect(RULESET_SCHEMA_VERSION).toBe(3);
  });
});
