import { EditorRuleKindType } from "@/lib/editor/types";
import { EditorToolFamilyType } from "@/lib/editor/types";
// Plan 90 Step 142. Round-trip contract for the FE envelope adapter.
//
// Forward + reverse must be lossless for the fields we claim to
// preserve. If this test drifts, the reload-server conflict resolver
// will silently corrupt editor state on every conflict.

import { beforeEach, describe, expect, it } from "vitest";

import type { EditorRule } from "@/lib/editor/types";
import type { RuleSet } from "@/lib/projects/store";
import { envelopeToProjectRuleset, projectRulesetToEnvelope } from "../envelopeAdapter";
import { __resetRulesetIdAliasForTests } from "../ruleset-id-alias";
import { __resetRuleIdAliasForTests } from "../rule-id-alias";

function seedRule(overrides: Partial<EditorRule> = {}): EditorRule {
  return {
    id: "r-abc",
    name: "rule-a",
    kind: EditorRuleKindType.C,
    isHidden: false,
    isLocked: true,
    x: 10,
    y: 20,
    width: 100,
    height: 200,
    params: { threshold: 42, label: "ok", allow: true },
    rotation: 15,
    family: EditorToolFamilyType.Rect,
    sourceRuleId: "r-parent",
    ...overrides,
  };
}

function seedSet(rules: EditorRule[]): RuleSet {
  return { id: "rs-42", projectId: "p-1", name: "sheet-a", rules };
}

describe("envelope round-trip", () => {
  beforeEach(() => {
    __resetRulesetIdAliasForTests();
    __resetRuleIdAliasForTests();
  });

  it("preserves every lossless EditorRule field forward then back", () => {
    const rs = seedSet([seedRule()]);
    const { envelope } = projectRulesetToEnvelope(rs);
    const back = envelopeToProjectRuleset(envelope, { projectId: "p-1" });

    expect(back.projectId).toBe("p-1");
    expect(back.name).toBe(rs.name);
    expect(back.rules).toHaveLength(1);

    const orig = rs.rules[0];
    const round = back.rules[0];
    expect(round.id).toBe(orig.id);
    expect(round.kind).toBe(orig.kind);
    expect(round.isHidden).toBe(orig.isHidden);
    expect(round.isLocked).toBe(orig.isLocked);
    expect(round.x).toBe(orig.x);
    expect(round.y).toBe(orig.y);
    expect(round.width).toBe(orig.width);
    expect(round.height).toBe(orig.height);
    expect(round.rotation).toBe(orig.rotation);
    expect(round.family).toBe(orig.family);
    expect(round.sourceRuleId).toBe(orig.sourceRuleId);
    // Non-`_Legacy` params survive verbatim.
    expect(round.params).toEqual(orig.params);
  });

  it("falls back to wire Kind when _LegacyKind is missing", () => {
    const rs = seedSet([seedRule({ kind: EditorRuleKindType.R })]);
    const { envelope } = projectRulesetToEnvelope(rs);
    // Strip the round-trip metadata to simulate an envelope authored
    // outside the FE (e.g. hand-written server seed).
    for (const r of envelope.Rules) {
      const p = r.Params as Record<string, unknown>;
      delete p._LegacyKind;
      delete p._LegacyId;
    }
    const back = envelopeToProjectRuleset(envelope, { projectId: "p-1" });
    // presence -> R via reverse fallback.
    expect(back.rules[0].kind).toBe("R");
    // Missing _LegacyId means we synthesise from the int id.
    expect(back.rules[0].id).toMatch(/^r-int-\d+$/);
  });

  it("recovers a string ruleset id even without an alias table", () => {
    const rs = seedSet([seedRule()]);
    const { envelope } = projectRulesetToEnvelope(rs);
    const back = envelopeToProjectRuleset(envelope, { projectId: "p-1" });
    // With localStorage unavailable (node env) the alias round-trip
    // falls back to the deterministic `rs-{intId}` form so the caller
    // can still mount a route. Assert on the pattern, not the input id.
    expect(back.id).toMatch(/^rs-\d+$/);
  });
});
