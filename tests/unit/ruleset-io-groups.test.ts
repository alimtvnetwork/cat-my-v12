// Plan 35 step 22: prove groups survive serialize/parse round-trip.
import { describe, expect, it, vi } from "vitest";
import { parseRuleSet, serializeRuleSet } from "@/lib/editor/ruleset-io";
import type { EditorRule } from "@/lib/editor/types";
import type { RuleGroup } from "@/lib/editor/store/rules-slice";

const rules: EditorRule[] = [
  {
    id: "a",
    name: "A",
    kind: "R",
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 4,
    height: 4,
  },
  {
    id: "b",
    name: "B",
    kind: "C",
    isHidden: false,
    isLocked: false,
    x: 5,
    y: 5,
    width: 4,
    height: 4,
  },
  {
    id: "c",
    name: "C",
    kind: "K",
    isHidden: false,
    isLocked: false,
    x: 9,
    y: 9,
    width: 4,
    height: 4,
  },
];

const groups: RuleGroup[] = [
  { id: "g1", name: "First", ruleIds: ["a", "b"], collapsed: true },
  { id: "g2", name: "Second", ruleIds: ["c"] },
];

describe("ruleset-io groups", () => {
  it("persists and restores groups verbatim", () => {
    const text = serializeRuleSet(rules, groups);
    const parsed = parseRuleSet(text);
    expect(parsed.rules.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(parsed.groups).toEqual(groups);
  });

  it("returns empty groups when the field is absent (back-compat)", () => {
    const text = JSON.stringify({
      schema: "control-automation.ruleset",
      version: 2,
      exportedAt: new Date().toISOString(),
      rules,
    });
    const parsed = parseRuleSet(text);
    expect(parsed.groups).toEqual([]);
  });

  it("drops group members that reference unknown rules", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = JSON.stringify({
      schema: "control-automation.ruleset",
      version: 2,
      exportedAt: new Date().toISOString(),
      rules,
      groups: [{ id: "g1", name: "G", ruleIds: ["a", "missing"] }],
    });
    const parsed = parseRuleSet(text);
    expect(parsed.groups[0].ruleIds).toEqual(["a"]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
