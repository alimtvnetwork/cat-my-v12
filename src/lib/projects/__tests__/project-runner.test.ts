import { EditorRuleKindType } from "@/lib/editor/types";
import { EditorToolFamilyType } from "@/lib/editor/types";
// Plan 79 step 47. project-runner unit tests: pass/fail/skip verdicts,
// unknown ruleset handling, and empty-ruleset behaviour.
import { describe, it, expect } from "vitest";
import { runProject } from "../project-runner";
import type { Project, RuleSet } from "../store";
import type { EditorRule } from "@/lib/editor/types";
function rule(id: string, extra: Partial<EditorRule> = {}): EditorRule {
  return {
    id,
    name: `rule-${id}`,
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    params: { thresh: 128 },
    ...extra,
  };
}
function project(rulesetIds: string[]): Project {
  return {
    id: "p1",
    name: "proj",
    createdAt: 0,
    rulesetIds,
  };
}
function rs(id: string, rules: EditorRule[]): RuleSet {
  return { id, projectId: "p1", name: `RS-${id}`, rules };
}
describe("runProject", () => {
  it("PASSes rules with params", () => {
    const out = runProject(project(["r1"]), [rs("r1", [rule("a"), rule("b")])]);
    expect(out.verdict).toBe("PASS");
    expect(out.pass).toBe(2);
    expect(out.fail).toBe(0);
    expect(out.total).toBe(2);
  });
  it("FAILs rules with no params", () => {
    const out = runProject(project(["r1"]), [rs("r1", [rule("a", { params: undefined })])]);
    expect(out.verdict).toBe("FAIL");
    expect(out.rules[0].reason).toBe("MissingParams");
  });
  it("SKIPs hidden rules", () => {
    const out = runProject(project(["r1"]), [rs("r1", [rule("a", { isHidden: true })])]);
    expect(out.verdict).toBe("SKIP");
    expect(out.skip).toBe(1);
  });
  it("reports UnknownRuleset for missing ids", () => {
    const out = runProject(project(["missing"]), []);
    expect(out.verdict).toBe("FAIL");
    expect(out.rules[0].reason).toBe("UnknownRuleset");
  });
  it("SKIPs empty rulesets", () => {
    const out = runProject(project(["r1"]), [rs("r1", [])]);
    expect(out.verdict).toBe("SKIP");
    expect(out.rules[0].reason).toBe("EmptyRuleset");
  });
  it("aggregates fail over pass over skip", () => {
    const out = runProject(project(["r1"]), [
      rs("r1", [rule("a"), rule("b", { params: undefined }), rule("c", { isHidden: true })]),
    ]);
    expect(out.pass).toBe(1);
    expect(out.fail).toBe(1);
    expect(out.skip).toBe(1);
    expect(out.verdict).toBe("FAIL");
  });
  it("SKIPs rules flagged disabled by the predicate and lists them in disabled[]", () => {
    const out = runProject(project(["r1"]), [rs("r1", [rule("a"), rule("b"), rule("c")])], {
      isDisabled: (id) => id === "b",
    });
    expect(out.pass).toBe(2);
    expect(out.skip).toBe(1);
    expect(out.fail).toBe(0);
    expect(out.disabled).toEqual(["b"]);
    const bRow = out.rules.find((r) => r.ruleId === "b")!;
    expect(bRow.verdict).toBe("SKIP");
    expect(bRow.reason).toBe("Disabled");
  });
  it("defaults disabled predicate to false when omitted", () => {
    const out = runProject(project(["r1"]), [rs("r1", [rule("a")])]);
    expect(out.disabled).toEqual([]);
    expect(out.pass).toBe(1);
  });
});
