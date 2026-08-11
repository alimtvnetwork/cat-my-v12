import { EditorRuleKindType } from "@/lib/editor/types";
import { TrialVerdictType } from "@/lib/projects/trials";
// Pure-function tests for the trial engine + history reducer.
// Plan 34, step 19. No React, no store subscription.
import { describe, expect, it } from "vitest";
import { appendRunReducer, runRuleset, TRIAL_HISTORY_CAP, type TrialRun } from "../trials";
import type { EditorRule } from "@/lib/editor/types";

function rule(
  id: string,
  kind: EditorRule["kind"] = EditorRuleKindType.C,
  isHidden = false,
): EditorRule {
  return {
    id,
    name: `rule ${id}`,
    kind,
    isHidden,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
  };
}

describe("runRuleset", () => {
  it("returns one result per non-hidden rule", () => {
    const run = runRuleset({
      rulesetId: "rs1",
      imageRef: "img://a",
      rules: [rule("a"), rule("b"), rule("c", EditorRuleKindType.R, true)],
      now: 1,
      id: "run-1",
    });
    expect(run.results.map((r) => r.ruleId)).toEqual(["a", "b"]);
    expect(run.id).toBe("run-1");
    expect(run.createdAt).toBe(1);
    expect(run.rulesetId).toBe("rs1");
  });

  it("is deterministic for the same image + rules", () => {
    const rules = [rule("a"), rule("b")];
    const a = runRuleset({ rulesetId: "rs", imageRef: "img://x", rules, id: "1", now: 0 });
    const b = runRuleset({ rulesetId: "rs", imageRef: "img://x", rules, id: "2", now: 0 });
    expect(a.results.map((r) => r.score)).toEqual(b.results.map((r) => r.score));
    expect(a.verdict).toBe(b.verdict);
  });

  it("differs when the image changes", () => {
    const rules = [rule("a")];
    const a = runRuleset({ rulesetId: "rs", imageRef: "img://x", rules, id: "1", now: 0 });
    const b = runRuleset({ rulesetId: "rs", imageRef: "img://y", rules, id: "2", now: 0 });
    expect(a.results[0].score).not.toBe(b.results[0].score);
  });

  it("threshold controls per-rule verdict and overall verdict", () => {
    const rules = [rule("a"), rule("b")];
    const strict = runRuleset({
      rulesetId: "rs",
      imageRef: "img://x",
      rules,
      threshold: 1.01,
      id: "s",
      now: 0,
    });
    expect(strict.verdict).toBe("NG");
    expect(strict.results.every((r) => r.verdict === "NG")).toBe(true);

    const loose = runRuleset({
      rulesetId: "rs",
      imageRef: "img://x",
      rules,
      threshold: 0,
      id: "l",
      now: 0,
    });
    expect(loose.verdict).toBe("OK");
    expect(loose.results.every((r) => r.verdict === "OK")).toBe(true);
  });

  it("empty rules yields empty results and OK verdict", () => {
    const run = runRuleset({ rulesetId: "rs", imageRef: "img://x", rules: [], id: "e", now: 0 });
    expect(run.results).toHaveLength(0);
    expect(run.verdict).toBe("OK");
  });
});

describe("appendRunReducer", () => {
  function mkRun(rulesetId: string, id: string, at: number): TrialRun {
    return {
      id,
      rulesetId,
      imageRef: `img://${id}`,
      createdAt: at,
      verdict: TrialVerdictType.OK,
      results: [],
    };
  }

  it("puts the newest run first", () => {
    let state: Record<string, TrialRun[]> = {};
    state = appendRunReducer(state, mkRun("rs", "1", 1));
    state = appendRunReducer(state, mkRun("rs", "2", 2));
    expect(state.rs.map((r) => r.id)).toEqual(["2", "1"]);
  });

  it("scopes history per rulesetId", () => {
    let state: Record<string, TrialRun[]> = {};
    state = appendRunReducer(state, mkRun("a", "1", 1));
    state = appendRunReducer(state, mkRun("b", "2", 2));
    expect(state.a.map((r) => r.id)).toEqual(["1"]);
    expect(state.b.map((r) => r.id)).toEqual(["2"]);
  });

  it("drops oldest entries beyond the cap (FIFO)", () => {
    let state: Record<string, TrialRun[]> = {};
    for (let i = 0; i < TRIAL_HISTORY_CAP + 5; i++) {
      state = appendRunReducer(state, mkRun("rs", String(i), i));
    }
    expect(state.rs).toHaveLength(TRIAL_HISTORY_CAP);
    // Newest is the last appended, oldest kept is index 5 (0..4 dropped).
    expect(state.rs[0].id).toBe(String(TRIAL_HISTORY_CAP + 4));
    expect(state.rs[state.rs.length - 1].id).toBe("5");
  });

  it("respects an explicit cap override", () => {
    let state: Record<string, TrialRun[]> = {};
    for (let i = 0; i < 6; i++) state = appendRunReducer(state, mkRun("rs", String(i), i), 3);
    expect(state.rs.map((r) => r.id)).toEqual(["5", "4", "3"]);
  });
});