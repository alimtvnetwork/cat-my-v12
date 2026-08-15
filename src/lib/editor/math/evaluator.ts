import { MathIssueReasonType } from "@/lib/editor/math/types";
import { parseMathTokens } from "./parser";
import { tokenizeMathExpression } from "./tokenize";
import type { MathEvaluation, MathValueMap } from "./types";

export function evaluateMathExpression(expression: string, values: MathValueMap): MathEvaluation {
  if (expression.trim().length === 0)
    return { ok: false, isFail: true, reason: MathIssueReasonType.MathParse };
  const tokens = tokenizeMathExpression(expression);

  if (tokens === null) return { ok: false, isFail: true, reason: MathIssueReasonType.MathParse };

  return parseMathTokens(tokens, values);
}
