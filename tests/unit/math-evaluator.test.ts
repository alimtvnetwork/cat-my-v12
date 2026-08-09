import { describe, expect, it } from "vitest";
import { evaluateMathExpression } from "@/lib/editor/math";
import type { MathIssueReason } from "@/lib/editor/math";

const VALUES = { ROI_1: 79, ROI_2: 119, COUNT: 3, LIMIT: 5 };

describe("math evaluator vectors", () => {
  it.each([
    ["MATH-V-01", "(ROI_1.value + ROI_2.value) / 2 < 100", true, 99],
    ["MATH-V-02", "ROI_1.value + ROI_2.value * 2 <= 320", true, 317],
    ["MATH-V-03", "max(ROI_1.value, ROI_2.value) == 119", true, 119],
    ["MATH-V-04", "abs(ROI_1.value - ROI_2.value) < 50", true, 40],
    ["MATH-V-05", "COUNT.value % 2 != 0", true, 1],
  ])("%s evaluates a valid comparison", (_id, expression, pass, value) => {
    expect(evaluateMathExpression(expression, VALUES)).toEqual({ ok: true, pass, value });
  });

  it.each([
    ["MATH-V-06", "MISSING.value < 10", "math_ref_missing"],
    ["MATH-V-07", "ROI_1.value / 0 < 1", "math_div_zero"],
    ["MATH-V-08", "ROI_1.value + 2", "math_parse"],
    ["MATH-V-09", "ROI_1.value = 2", "math_parse"],
    ["MATH-V-10", "eval(ROI_1.value) < 2", "math_parse"],
  ])("%s rejects invalid expressions", (_id, expression, reason) => {
    expect(evaluateMathExpression(expression, VALUES)).toEqual({
      ok: false,
      reason: reason as MathIssueReason,
    });
  });
});
