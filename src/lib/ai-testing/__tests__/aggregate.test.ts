import { EditorRuleKindType } from "@/lib/editor/types";
import { TrialVerdictType } from "@/lib/projects/trials";
// Pure aggregate + history reducer tests for AI testing.
// Plan 34, step 21. No React, no persisted store.
import { describe, expect, it } from "vitest";
import {
  AI_TESTING_HISTORY_CAP,
  aggregateAiTestingResults,
  appendAiTestingHistoryReducer,
  type AiTestingAggregateSummary,
  type AiTestingDatasetImage,
} from "../aggregate";
import type { EditorRule } from "@/lib/editor/types";
import type { TrialRun, TrialVerdict } from "@/lib/projects/trials";

function rule(id: string, isHidden = false): EditorRule {
  return {
    id,
    name: `rule ${id}`,
    kind: EditorRuleKindType.C,
    isHidden,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
  };
}

function image(id: string): AiTestingDatasetImage {
  return { id, name: `${id}.png`, imageRef: `img://${id}` };
}

function run(
  rulesetId: string,
  imageRef: string,
  perRule: Array<{ ruleId: string; verdict: TrialVerdict }>,
): TrialRun {
  const results = perRule.map(({ ruleId, verdict }) => ({
    ruleId,
    ruleName: `rule ${ruleId}`,
    kind: EditorRuleKindType.C,
    score: verdict === "OK" ? 1 : 0,
    verdict,
  }));

  return {
    id: `run-${imageRef}`,
    rulesetId,
    imageRef,
    createdAt: 0,
    verdict: results.every((r) => r.verdict === TrialVerdictType.OK)
      ? TrialVerdictType.OK
      : TrialVerdictType.NG,
    results,
  };
}

describe("aggregateAiTestingResults", () => {
  const rules = [rule("a"), rule("b"), rule("c", true)];
  const images = [image("1"), image("2")];

  it("aggregates per-rule and per-image OK/NG counts", () => {
    const runs = [
      run("rs", "img://1", [
        { ruleId: "a", verdict: TrialVerdictType.OK },
        { ruleId: "b", verdict: TrialVerdictType.NG },
      ]),
      run("rs", "img://2", [
        { ruleId: "a", verdict: TrialVerdictType.OK },
        { ruleId: "b", verdict: TrialVerdictType.OK },
      ]),
    ];
    const summary = aggregateAiTestingResults({
      rulesetId: "rs",
      rules,
      images,
      runs,
      now: 42,
      id: "sum-1",
    });
    expect(summary.id).toBe("sum-1");
    expect(summary.createdAt).toBe(42);
    expect(summary.imageCount).toBe(2);
    expect(summary.ruleCount).toBe(2); // hidden rule excluded
    expect(summary.okChecks).toBe(3);
    expect(summary.ngChecks).toBe(1);
    expect(summary.totalChecks).toBe(4);
    expect(summary.passRate).toBeCloseTo(0.75);
    expect(summary.verdict).toBe("NG");

    const ruleA = summary.perRule.find((r) => r.ruleId === "a");
    const ruleB = summary.perRule.find((r) => r.ruleId === "b");
    expect(ruleA).toMatchObject({ okCount: 2, ngCount: 0, totalChecks: 2, passRate: 1 });
    expect(ruleB).toMatchObject({ okCount: 1, ngCount: 1, totalChecks: 2, passRate: 0.5 });

    expect(summary.perImage[0]).toMatchObject({
      imageId: "1",
      verdict: "NG",
      okCount: 1,
      ngCount: 1,
    });
    expect(summary.perImage[1]).toMatchObject({
      imageId: "2",
      verdict: "OK",
      okCount: 2,
      ngCount: 0,
    });
  });

  it("returns OK verdict and passRate 1 when there are no checks", () => {
    const summary = aggregateAiTestingResults({
      rulesetId: "rs",
      rules: [],
      images: [],
      runs: [],
    });
    expect(summary.verdict).toBe("OK");
    expect(summary.totalChecks).toBe(0);
    expect(summary.passRate).toBe(1);
    expect(summary.perImage).toEqual([]);
    expect(summary.perRule).toEqual([]);
  });

  it("throws when image and run counts mismatch", () => {
    expect(() =>
      aggregateAiTestingResults({
        rulesetId: "rs",
        rules,
        images,
        runs: [run("rs", "img://1", [{ ruleId: "a", verdict: TrialVerdictType.OK }])],
      }),
    ).toThrow(/image\/run count mismatch/);
  });

  it("throws when a run belongs to a different rule set", () => {
    expect(() =>
      aggregateAiTestingResults({
        rulesetId: "rs",
        rules,
        images,
        runs: [
          run("other", "img://1", [{ ruleId: "a", verdict: TrialVerdictType.OK }]),
          run("rs", "img://2", [{ ruleId: "a", verdict: TrialVerdictType.OK }]),
        ],
      }),
    ).toThrow(/different rule set/);
  });
});

describe("appendAiTestingHistoryReducer", () => {
  function summary(id: string, rulesetId = "rs"): AiTestingAggregateSummary {
    return {
      id,
      rulesetId,
      createdAt: 0,
      verdict: TrialVerdictType.OK,
      imageCount: 0,
      ruleCount: 0,
      totalChecks: 0,
      okChecks: 0,
      ngChecks: 0,
      passRate: 1,
      perRule: [],
      perImage: [],
    };
  }

  it("prepends newest summary and scopes by ruleset", () => {
    let state: Record<string, AiTestingAggregateSummary[]> = {};
    state = appendAiTestingHistoryReducer(state, summary("a", "rs1"));
    state = appendAiTestingHistoryReducer(state, summary("b", "rs1"));
    state = appendAiTestingHistoryReducer(state, summary("c", "rs2"));
    expect(state.rs1.map((s) => s.id)).toEqual(["b", "a"]);
    expect(state.rs2.map((s) => s.id)).toEqual(["c"]);
  });

  it("caps history at AI_TESTING_HISTORY_CAP, dropping oldest", () => {
    let state: Record<string, AiTestingAggregateSummary[]> = {};
    const total = AI_TESTING_HISTORY_CAP + 5;
    for (let i = 0; i < total; i++) {
      state = appendAiTestingHistoryReducer(state, summary(`s${i}`));
    }
    expect(state.rs).toHaveLength(AI_TESTING_HISTORY_CAP);
    expect(state.rs[0].id).toBe(`s${total - 1}`);
    expect(state.rs[state.rs.length - 1].id).toBe(`s${total - AI_TESTING_HISTORY_CAP}`);
  });

  it("respects an explicit cap override", () => {
    let state: Record<string, AiTestingAggregateSummary[]> = {};
    state = appendAiTestingHistoryReducer(state, summary("a"), 2);
    state = appendAiTestingHistoryReducer(state, summary("b"), 2);
    state = appendAiTestingHistoryReducer(state, summary("c"), 2);
    expect(state.rs.map((s) => s.id)).toEqual(["c", "b"]);
  });
});
