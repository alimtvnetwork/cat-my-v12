import { describe, it, expect } from "vitest";
import {
  evaluateMathExpression,
  extractVariablesFromRuleResults,
  MathSandboxParser,
} from "../math-sandbox";
import { ValidationStatusType, type ValidationResult } from "@/lib/editor/validation-store";
import type { EditorRule } from "@/lib/editor/types";

describe("M301 Math Sandbox Evaluator", () => {
  it("evaluates basic arithmetic and operator precedence", () => {
    const parser = new MathSandboxParser("10 + 5 * 2", {});
    expect(parser.parse()).toBe(20);

    const parser2 = new MathSandboxParser("(10 + 5) * 2", {});
    expect(parser2.parse()).toBe(30);

    const parserPower = new MathSandboxParser("2 ^ 3 + 1", {});
    expect(parserPower.parse()).toBe(9);
  });

  it("evaluates math functions: abs, sqrt, min, max, clamp", () => {
    expect(new MathSandboxParser("abs(-15.5)", {}).parse()).toBe(15.5);
    expect(new MathSandboxParser("sqrt(16)", {}).parse()).toBe(4);
    expect(new MathSandboxParser("min(10, 4, 8)", {}).parse()).toBe(4);
    expect(new MathSandboxParser("max(10, 4, 8)", {}).parse()).toBe(10);
    expect(new MathSandboxParser("clamp(15, 0, 10)", {}).parse()).toBe(10);
    expect(new MathSandboxParser("round(3.7)", {}).parse()).toBe(4);
  });

  it("substitutes context variables accurately", () => {
    const vars = {
      LeadPitch: 1.27,
      Circle_Diameter: 50.4,
      Caliper_Width: 12.0,
    };

    const parser = new MathSandboxParser("Circle_Diameter / Caliper_Width", vars);
    expect(parser.parse()).toBeCloseTo(4.2, 3);

    const parser2 = new MathSandboxParser("abs(LeadPitch - 1.25)", vars);
    expect(parser2.parse()).toBeCloseTo(0.02, 4);
  });

  it("extracts measurement variables from preceding rule validation results", () => {
    const rule1: EditorRule = {
      id: "rule-caliper-1",
      name: "Lead Pitch Inspection",
      kind: "R" as any,
      isHidden: false,
      isLocked: false,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      params: { toolCode: "T110" },
    };

    const results: Record<string, ValidationResult> = {
      "rule-caliper-1": {
        status: ValidationStatusType.Pass,
        score: 0.99,
        stub: false,
        debug: {
          detectedLeadPitch: 1.272,
          leadWidth: 0.45,
          measuredCount: 16,
        },
      },
    };

    const extracted = extractVariablesFromRuleResults([rule1], results);

    expect(extracted["Lead_Pitch_Inspection_score"]).toBe(0.99);
    expect(extracted["Lead_Pitch_Inspection_detectedLeadPitch"]).toBe(1.272);
    expect(extracted["T110_detectedLeadPitch"]).toBe(1.272);
    expect(extracted["detectedLeadPitch"]).toBe(1.272);
    expect(extracted["leadWidth"]).toBe(0.45);
  });

  it("judges range limits in between mode", () => {
    const resPass = evaluateMathExpression({
      expression: "LeadPitch",
      variables: { LeadPitch: 1.27 },
      limits: { min: 1.2, max: 1.35 },
      operator: "between",
    });

    expect(resPass.isPass).toBe(true);
    expect(resPass.value).toBe(1.27);
    expect(resPass.score).toBe(1.0);

    const resFail = evaluateMathExpression({
      expression: "LeadPitch",
      variables: { LeadPitch: 1.45 },
      limits: { min: 1.2, max: 1.35 },
      operator: "between",
    });

    expect(resFail.isPass).toBe(false);
    expect(resFail.score).toBe(0.0);
    expect(resFail.message).toContain("exceeds upper limit 1.35");
  });

  it("judges equality nominal ± tolerance", () => {
    const resPass = evaluateMathExpression({
      expression: "Circle_Diameter",
      variables: { Circle_Diameter: 50.02 },
      limits: { nominal: 50.0, tolerance: 0.05 },
      operator: "eq",
    });

    expect(resPass.isPass).toBe(true);

    const resFail = evaluateMathExpression({
      expression: "Circle_Diameter",
      variables: { Circle_Diameter: 50.15 },
      limits: { nominal: 50.0, tolerance: 0.05 },
      operator: "eq",
    });

    expect(resFail.isPass).toBe(false);
  });

  it("evaluates boolean logic expressions", () => {
    const res = evaluateMathExpression({
      expression: "LeadPitch >= 1.25 && LeadPitch <= 1.30",
      variables: { LeadPitch: 1.27 },
      operator: "boolean",
    });

    expect(res.isPass).toBe(true);
    expect(res.score).toBe(1.0);

    const resFail = evaluateMathExpression({
      expression: "LeadPitch >= 1.25 && LeadPitch <= 1.30",
      variables: { LeadPitch: 1.35 },
      operator: "boolean",
    });

    expect(resFail.isPass).toBe(false);
    expect(resFail.score).toBe(0.0);
  });

  it("handles malformed expressions gracefully without throwing", () => {
    const res = evaluateMathExpression({
      expression: "10 + * 5",
      variables: {},
    });

    expect(res.isPass).toBe(false);
    expect(res.score).toBe(0.0);
  });
});
