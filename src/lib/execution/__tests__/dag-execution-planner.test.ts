import { describe, it, expect } from "vitest";
import {
  buildRuleDAG,
  evaluateRuleGatingDecision,
  createSkippedValidationResult,
  executeDAGRules,
} from "../dag-execution-planner";
import { ValidationStatusType, type ValidationResult } from "@/lib/editor/validation-store";
import type { EditorRule } from "@/lib/editor/types";

function createMockRule(
  id: string,
  name: string,
  params: Record<string, unknown> = {},
): EditorRule {
  return {
    id,
    name,
    kind: "R" as any,
    isHidden: false,
    isLocked: false,
    x: 10,
    y: 10,
    width: 50,
    height: 50,
    params,
  };
}

describe("DAG Execution Planner & Branch Skipping", () => {
  it("orders linear dependencies correctly (A -> B -> C)", () => {
    const ruleA = createMockRule("rule-a", "Presence Check");
    const ruleB = createMockRule("rule-b", "Orientation Check", { dependsOnRuleId: "rule-a" });
    const ruleC = createMockRule("rule-c", "Caliper Width", { dependsOnRuleId: "rule-b" });

    // Shuffled input order
    const dag = buildRuleDAG([ruleC, ruleA, ruleB]);

    expect(dag.hasCycle).toBe(false);
    expect(dag.orderedRuleIds).toEqual(["rule-a", "rule-b", "rule-c"]);
  });

  it("handles branching DAG dependencies (A -> B, A -> C, B + C -> D)", () => {
    const ruleA = createMockRule("rule-a", "Area Gate");
    const ruleB = createMockRule("rule-b", "Circle 1", { dependsOnRuleId: "rule-a" });
    const ruleC = createMockRule("rule-c", "Circle 2", { dependsOnRuleId: "rule-a" });
    const ruleD = createMockRule("rule-d", "Pitch Math", { dependencies: ["rule-b", "rule-c"] });

    const dag = buildRuleDAG([ruleD, ruleC, ruleB, ruleA]);

    expect(dag.hasCycle).toBe(false);
    expect(dag.orderedRuleIds[0]).toBe("rule-a");
    expect(dag.orderedRuleIds[dag.orderedRuleIds.length - 1]).toBe("rule-d");
  });

  it("resolves appliesBefore reversed dependencies", () => {
    const ruleA = createMockRule("rule-a", "Step 1", { appliesBefore: ["rule-b"] });
    const ruleB = createMockRule("rule-b", "Step 2");

    const dag = buildRuleDAG([ruleB, ruleA]);

    expect(dag.hasCycle).toBe(false);
    expect(dag.orderedRuleIds).toEqual(["rule-a", "rule-b"]);
  });

  it("detects cycle safely without throwing and returns cycleNodeIds", () => {
    const ruleA = createMockRule("rule-a", "Rule A", { dependsOnRuleId: "rule-b" });
    const ruleB = createMockRule("rule-b", "Rule B", { dependsOnRuleId: "rule-a" });

    const dag = buildRuleDAG([ruleA, ruleB]);

    expect(dag.hasCycle).toBe(true);
    expect(dag.cycleNodeIds?.length).toBe(2);
    // Spec DAG gating: cycle nodes are EXCLUDED from execution order
    // (they are emitted as Skipped results instead) — the old
    // "graceful fallback includes all nodes" would execute a cycle.
    expect(dag.orderedRuleIds.length).toBe(0);
    expect(dag.orderedRuleIds).not.toContain("rule-a");
    expect(dag.orderedRuleIds).not.toContain("rule-b");
  });

  it("skips downstream rule when parent rule fails", () => {
    const parent = createMockRule("gate-1", "Area Gate");
    const child = createMockRule("child-1", "Fine Pitch", { dependsOnRuleId: "gate-1" });

    const previousResults: Record<string, ValidationResult> = {
      "gate-1": {
        status: ValidationStatusType.Fail,
        score: 0.2,
        message: "Area gate failed: insufficient pixels",
        stub: false,
      },
    };

    const decision = evaluateRuleGatingDecision({
      rule: child,
      previousResults,
    });

    expect(decision.isExecutable).toBe(false);
    expect(decision.isSkipped).toBe(true);
    expect(decision.blockingParentRuleId).toBe("gate-1");

    const skippedResult = createSkippedValidationResult({ rule: child, decision });
    expect(skippedResult.status).toBe(ValidationStatusType.Skipped);
    expect(skippedResult.debug?.isSkipped).toBe(true);
  });

  it("executes downstream rule when parent rule passes", () => {
    const parent = createMockRule("gate-1", "Area Gate");
    const child = createMockRule("child-1", "Fine Pitch", { dependsOnRuleId: "gate-1" });

    const previousResults: Record<string, ValidationResult> = {
      "gate-1": {
        status: ValidationStatusType.Pass,
        score: 0.98,
        message: "Area gate passed",
        stub: false,
      },
    };

    const decision = evaluateRuleGatingDecision({
      rule: child,
      previousResults,
    });

    expect(decision.isExecutable).toBe(true);
    expect(decision.isSkipped).toBe(false);
  });

  it("cascades skipping across multi-tier dependencies (A fails -> B skipped -> C skipped)", () => {
    const ruleA = createMockRule("r-a", "Gate");
    const ruleB = createMockRule("r-b", "Caliper", { dependsOnRuleId: "r-a" });
    const ruleC = createMockRule("r-c", "Math Delta", { dependsOnRuleId: "r-b" });

    const results: Record<string, ValidationResult> = {
      "r-a": { status: ValidationStatusType.Fail, score: 0.0, stub: false },
      "r-b": { status: ValidationStatusType.Skipped, score: 0.0, stub: false },
    };

    const decision = evaluateRuleGatingDecision({
      rule: ruleC,
      previousResults: results,
    });

    expect(decision.isExecutable).toBe(false);
    expect(decision.isSkipped).toBe(true);
    expect(decision.blockingParentRuleId).toBe("r-b");
  });

  it("runs executeDAGRules end-to-end skipping dependent branches", async () => {
    const ruleA = createMockRule("r-1", "Area Gate");
    const ruleB = createMockRule("r-2", "Independent Rule");
    const ruleC = createMockRule("r-3", "Dependent on Gate", { dependsOnRuleId: "r-1" });

    let ruleCExecuted = false;

    const allResults = await executeDAGRules({
      rules: [ruleC, ruleA, ruleB],
      executeRule: (rule) => {
        if (rule.id === "r-1") {
          return {
            status: ValidationStatusType.Fail,
            score: 0.1,
            message: "Gate failed",
            stub: false,
          };
        }
        if (rule.id === "r-2") {
          return {
            status: ValidationStatusType.Pass,
            score: 0.95,
            message: "Independent pass",
            stub: false,
          };
        }
        if (rule.id === "r-3") {
          ruleCExecuted = true;
          return { status: ValidationStatusType.Pass, score: 1.0, stub: false };
        }
        return { status: ValidationStatusType.Pass, score: 1.0, stub: false };
      },
    });

    expect(ruleCExecuted).toBe(false);
    expect(allResults["r-1"].status).toBe(ValidationStatusType.Fail);
    expect(allResults["r-2"].status).toBe(ValidationStatusType.Pass);
    expect(allResults["r-3"].status).toBe(ValidationStatusType.Skipped);
  });
});
