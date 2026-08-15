import { EditorRuleKindType } from "@/lib/editor/types";
import { EditorToolFamilyType } from "@/lib/editor/types";
/**
 * @vitest-environment jsdom
 */
// Plan 90 Step 139 tests.
import { beforeEach, describe, expect, it } from "vitest";
import { projectRulesetToEnvelope } from "../envelopeAdapter";
import { __resetRulesetIdAliasForTests } from "../ruleset-id-alias";
import type { EditorRule } from "../../editor/types";
import type { RuleSet } from "../../projects/store";
function rule(overrides: Partial<EditorRule>): EditorRule {
  return {
    id: "r-1",
    name: "Rule 1",
    kind: EditorRuleKindType.C,
    isHidden: false,
    isLocked: false,
    x: 10,
    y: 20,
    width: 100,
    height: 50,
    ...overrides,
  };
}
function ruleset(overrides: Partial<RuleSet> = {}): RuleSet {
  return {
    id: "rs-alpha",
    projectId: "p-1",
    name: "Alpha",
    rules: [],
    ...overrides,
  };
}
beforeEach(() => {
  __resetRulesetIdAliasForTests();
  window.localStorage.removeItem("ca.ruleIdAlias.v1");
  window.localStorage.removeItem("ca.envelopeClientId.v1");
});
describe("projectRulesetToEnvelope", () => {
  it("emits a wire-valid envelope with stable integer ids", () => {
    const rs = ruleset({
      rules: [rule({ id: "r-a" }), rule({ id: "r-b", kind: EditorRuleKindType.R })],
    });
    const { envelope, droppedCategories } = projectRulesetToEnvelope(rs, {
      now: () => "2026-07-21T00:00:00.000Z",
      clientId: "test-client",
    });
    expect(envelope.SchemaVersion).toBe(1);
    expect(envelope.RuleSetId).toBeGreaterThan(0);
    expect(envelope.Name).toBe("Alpha");
    expect(envelope.Version).toBe(0);
    expect(envelope.Rules).toHaveLength(2);
    expect(envelope.Rules[0]?.Kind).toBe("match");
    expect(envelope.Rules[1]?.Kind).toBe("presence");
    expect(envelope.DraftMeta).toEqual({
      ClientId: "test-client",
      UpdatedAt: "2026-07-21T00:00:00.000Z",
      Origin: "indexeddb",
    });
    expect(droppedCategories).toBe(0);
  });
  it("maps every EditorRuleKind letter deterministically", () => {
    const rs = ruleset({
      rules: [
        rule({ id: "r-C", kind: EditorRuleKindType.C }),
        rule({ id: "r-R", kind: EditorRuleKindType.R }),
        rule({ id: "r-K", kind: EditorRuleKindType.K }),
        rule({ id: "r-S", kind: EditorRuleKindType.S }),
        rule({ id: "r-E", kind: EditorRuleKindType.E }),
      ],
    });
    const { envelope } = projectRulesetToEnvelope(rs);
    expect(envelope.Rules.map((r) => r.Kind)).toEqual([
      "match",
      "presence",
      "match",
      "absence",
      "measure",
    ]);
  });
  it("strips category rows and reports the drop count", () => {
    const rs = ruleset({
      rules: [
        rule({ id: "cat-1", isCategory: true }),
        rule({ id: "r-a" }),
        rule({ id: "cat-2", isCategory: true }),
      ],
    });
    const { envelope, droppedCategories } = projectRulesetToEnvelope(rs);
    expect(envelope.Rules).toHaveLength(1);
    expect(droppedCategories).toBe(2);
  });
  it("preserves lossy fields under namespaced _Legacy* params for reverse mapping", () => {
    const rs = ruleset({
      rules: [
        rule({
          id: "r-a",
          kind: EditorRuleKindType.R,
          rotation: 45,
          family: EditorToolFamilyType.Rect,
          sourceRuleId: "r-src",
          isHidden: true,
          isLocked: true,
          params: { threshold: 0.5 },
        }),
      ],
    });
    const { envelope } = projectRulesetToEnvelope(rs);
    const p = envelope.Rules[0]!.Params as Record<string, unknown>;
    expect(p._LegacyId).toBe("r-a");
    expect(p._LegacyKind).toBe("R");
    expect(p._Rotation).toBe(45);
    expect(p._Family).toBe("rect");
    expect(p._SourceRuleId).toBe("r-src");
    expect(p._IsHidden).toBe(true);
    expect(p._IsLocked).toBe(true);
    expect(p.threshold).toBe(0.5);
    // Enabled mirrors !isHidden so the runtime honors legacy visibility.
    expect(envelope.Rules[0]!.Enabled).toBe(false);
  });
  it("assigns stable RuleSetId across two invocations for the same ruleset", () => {
    const rs = ruleset();
    const a = projectRulesetToEnvelope(rs);
    const b = projectRulesetToEnvelope(rs);
    expect(a.envelope.RuleSetId).toBe(b.envelope.RuleSetId);
  });
  it("passes opts.version through so callers own optimistic-lock semantics", () => {
    const rs = ruleset();
    const { envelope } = projectRulesetToEnvelope(rs, { version: 7 });
    expect(envelope.Version).toBe(7);
  });
});
