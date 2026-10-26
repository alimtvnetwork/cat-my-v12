import type {
  MathSandboxLimits,
  MathComparisonOperator,
  MathSandboxEvaluationResult,
} from "@/domain/execution/math-rule-types";
import type { EditorRule } from "@/lib/editor/types";
import type { ValidationResult } from "@/lib/editor/validation-store";

export type TokenType =
  | "NUMBER"
  | "IDENTIFIER"
  | "OPERATOR"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

export class MathSandboxParser {
  private tokens: Token[] = [];
  private cursor = 0;
  private variables: Record<string, number> = {};

  private readonly MATH_FUNCTIONS: Record<string, (...args: number[]) => number> = {
    abs: Math.abs,
    sqrt: Math.sqrt,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    atan2: Math.atan2,
    hypot: Math.hypot,
    log: Math.log,
    exp: Math.exp,
    min: (...args: number[]) => (args.length === 0 ? 0 : Math.min(...args)),
    max: (...args: number[]) => (args.length === 0 ? 0 : Math.max(...args)),
    clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
    pow: Math.pow,
  };

  private readonly CONSTANTS: Record<string, number> = {
    pi: Math.PI,
    e: Math.E,
  };

  constructor(expression: string, variables: Record<string, number>) {
    this.variables = variables;
    this.tokens = this.tokenize(expression);
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isIdentifierStart(char: string): boolean {
    return /[a-zA-Z_$]/.test(char);
  }

  private isIdentifierPart(char: string): boolean {
    return /[a-zA-Z0-9_$.]/.test(char);
  }

  private tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
      const char = expr[i];

      if (this.isWhitespace(char)) {
        i++;
        continue;
      }

      if (char === "(") {
        tokens.push({ type: "LPAREN", value: "(", position: i });
        i++;
        continue;
      }

      if (char === ")") {
        tokens.push({ type: "RPAREN", value: ")", position: i });
        i++;
        continue;
      }

      if (char === ",") {
        tokens.push({ type: "COMMA", value: ",", position: i });
        i++;
        continue;
      }

      // Two-character operators
      const twoChar = expr.slice(i, i + 2);

      if (["==", "!=", "<=", ">=", "&&", "||", "**"].includes(twoChar)) {
        tokens.push({ type: "OPERATOR", value: twoChar === "**" ? "^" : twoChar, position: i });
        i += 2;
        continue;
      }

      // Single-character operators
      if (["+", "-", "*", "/", "%", "^", "<", ">", "!"].includes(char)) {
        tokens.push({ type: "OPERATOR", value: char, position: i });
        i++;
        continue;
      }

      // Numbers
      if (
        this.isDigit(char) ||
        (char === "." && i + 1 < expr.length && this.isDigit(expr[i + 1]))
      ) {
        let numStr = "";
        const start = i;

        while (i < expr.length && (this.isDigit(expr[i]) || expr[i] === ".")) {
          numStr += expr[i];
          i++;
        }

        tokens.push({ type: "NUMBER", value: numStr, position: start });
        continue;
      }

      // Identifiers & variables (including dotted e.g. Rule1.score)
      if (this.isIdentifierStart(char)) {
        let ident = "";
        const start = i;

        while (i < expr.length && this.isIdentifierPart(expr[i])) {
          ident += expr[i];
          i++;
        }

        tokens.push({ type: "IDENTIFIER", value: ident, position: start });
        continue;
      }

      // Unrecognized character
      i++;
    }

    tokens.push({ type: "EOF", value: "", position: expr.length });

    return tokens;
  }

  private peek(): Token {
    return this.tokens[this.cursor] ?? { type: "EOF", value: "", position: -1 };
  }

  private consume(): Token {
    const token = this.peek();
    this.cursor++;

    return token;
  }

  public parse(): number {
    this.cursor = 0;
    const value = this.parseLogicalOr();

    if (this.cursor < this.tokens.length) {
      const remaining = this.peek();

      if (remaining.type !== "EOF") {
        throw new Error(`Unexpected token '${remaining.value}' at position ${remaining.position}`);
      }
    }

    return value;
  }

  private parseLogicalOr(): number {
    let left = this.parseLogicalAnd();

    while (this.peek().type === "OPERATOR" && this.peek().value === "||") {
      this.consume();
      const right = this.parseLogicalAnd();
      left = left !== 0 || right !== 0 ? 1 : 0;
    }

    return left;
  }

  private parseLogicalAnd(): number {
    let left = this.parseEquality();

    while (this.peek().type === "OPERATOR" && this.peek().value === "&&") {
      this.consume();
      const right = this.parseEquality();
      left = left !== 0 && right !== 0 ? 1 : 0;
    }

    return left;
  }

  private parseEquality(): number {
    let left = this.parseRelational();

    while (
      this.peek().type === "OPERATOR" &&
      (this.peek().value === "==" || this.peek().value === "!=")
    ) {
      const op = this.consume().value;
      const right = this.parseRelational();

      if (op === "==") {
        left = Math.abs(left - right) < 1e-9 ? 1 : 0;
      } else {
        left = Math.abs(left - right) >= 1e-9 ? 1 : 0;
      }
    }

    return left;
  }

  private parseRelational(): number {
    let left = this.parseAdditive();

    while (this.peek().type === "OPERATOR" && ["<", "<=", ">", ">="].includes(this.peek().value)) {
      const op = this.consume().value;
      const right = this.parseAdditive();

      if (op === "<") {
        left = left < right ? 1 : 0;
      } else if (op === "<=") {
        left = left <= right ? 1 : 0;
      } else if (op === ">") {
        left = left > right ? 1 : 0;
      } else if (op === ">=") {
        left = left >= right ? 1 : 0;
      }
    }

    return left;
  }

  private parseAdditive(): number {
    let left = this.parseMultiplicative();

    while (
      this.peek().type === "OPERATOR" &&
      (this.peek().value === "+" || this.peek().value === "-")
    ) {
      const op = this.consume().value;
      const right = this.parseMultiplicative();

      if (op === "+") {
        left += right;
      } else {
        left -= right;
      }
    }

    return left;
  }

  private parseMultiplicative(): number {
    let left = this.parsePower();

    while (
      this.peek().type === "OPERATOR" &&
      (this.peek().value === "*" || this.peek().value === "/" || this.peek().value === "%")
    ) {
      const op = this.consume().value;
      const right = this.parsePower();

      if (op === "*") {
        left *= right;
      } else if (op === "/") {
        left = right === 0 ? 0 : left / right;
      } else if (op === "%") {
        left = right === 0 ? 0 : left % right;
      }
    }

    return left;
  }

  private parsePower(): number {
    let left = this.parseUnary();

    while (this.peek().type === "OPERATOR" && this.peek().value === "^") {
      this.consume();
      const right = this.parseUnary();
      left = Math.pow(left, right);
    }

    return left;
  }

  private parseUnary(): number {
    if (this.peek().type === "OPERATOR") {
      const op = this.peek().value;

      if (op === "-") {
        this.consume();

        return -this.parseUnary();
      }

      if (op === "+") {
        this.consume();

        return this.parseUnary();
      }

      if (op === "!") {
        this.consume();

        return this.parseUnary() === 0 ? 1 : 0;
      }
    }

    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.peek();

    if (token.type === "NUMBER") {
      this.consume();

      return Number.parseFloat(token.value) || 0;
    }

    if (token.type === "LPAREN") {
      this.consume();
      const val = this.parseLogicalOr();

      if (this.peek().type === "RPAREN") {
        this.consume();
      }

      return val;
    }

    if (token.type === "IDENTIFIER") {
      this.consume();
      const name = token.value;
      const lowerName = name.toLowerCase();

      // Check if function call
      if (this.peek().type === "LPAREN") {
        this.consume();
        const args: number[] = [];

        if (this.peek().type !== "RPAREN") {
          args.push(this.parseLogicalOr());

          while (this.peek().type === "COMMA") {
            this.consume();
            args.push(this.parseLogicalOr());
          }
        }

        if (this.peek().type === "RPAREN") {
          this.consume();
        }

        const fn = this.MATH_FUNCTIONS[lowerName];

        if (fn) {
          return fn(...args);
        }

        return 0;
      }

      // Check constant
      if (lowerName in this.CONSTANTS) {
        return this.CONSTANTS[lowerName];
      }

      // Check variable lookup (exact, lower, sanitized, or normalized dot)
      if (name in this.variables) {
        return this.variables[name];
      }

      const dotNormalized = name.replace(/\./g, "_");

      if (dotNormalized in this.variables) {
        return this.variables[dotNormalized];
      }

      const lowerNormalized = lowerName.replace(/\./g, "_");

      for (const [key, val] of Object.entries(this.variables)) {
        if (key.toLowerCase() === lowerName || key.toLowerCase() === lowerNormalized) {
          return val;
        }
      }

      return 0;
    }

    if (token.type === "EOF") {
      throw new Error("Unexpected end of expression");
    }

    throw new Error(
      `Unexpected token '${token.value || token.type}' at position ${token.position}`,
    );
  }
}

export function extractVariablesFromRuleResults(
  rules: readonly EditorRule[],
  results: Record<string, ValidationResult>,
): Record<string, number> {
  const vars: Record<string, number> = {};

  rules.forEach((rule, idx) => {
    const res = results[rule.id];
    const score = res?.score ?? 0;
    const sanitizedRuleName = rule.name.replace(/[^a-zA-Z0-9_]/g, "_");
    const sanitizedId = rule.id.replace(/[^a-zA-Z0-9_]/g, "_");

    // Primary score variables
    vars[sanitizedRuleName] = score;
    vars[`${sanitizedRuleName}_score`] = score;
    vars[sanitizedId] = score;
    vars[`${sanitizedId}_score`] = score;
    vars[`R${idx + 1}`] = score;
    vars[`rule${idx + 1}`] = score;

    // Tool code alias if exists
    const toolCode = String((rule.params as any)?.toolCode ?? "").toUpperCase();

    if (toolCode) {
      vars[toolCode] = score;
      vars[`${toolCode}_score`] = score;
    }

    // Extract numeric debug variables
    if (res?.debug && typeof res.debug === "object") {
      for (const [debugKey, debugVal] of Object.entries(res.debug)) {
        if (typeof debugVal === "number" && Number.isFinite(debugVal)) {
          vars[`${sanitizedRuleName}_${debugKey}`] = debugVal;
          vars[`${sanitizedId}_${debugKey}`] = debugVal;

          if (toolCode) {
            vars[`${toolCode}_${debugKey}`] = debugVal;
          }

          // Direct shorthand for common metrics if not colliding
          if (!(debugKey in vars)) {
            vars[debugKey] = debugVal;
          }
        }
      }
    }
  });

  return vars;
}

export type CanonicalMathComparisonOperator = "between" | "gte" | "lte" | "eq" | "boolean";

/**
 * Normalize an operator to the engine's canonical form at the evaluation
 * entry point, so spec-conformant rules do not fall through to "between".
 *
 * Spec (section 7, M301) -> engine:
 *   lessThan    -> lte (value <= max limit; the engine has no strict `<` branch)
 *   greaterThan -> gte (value >= min limit; the engine has no strict `>` branch)
 *   equals      -> eq  (value within nominal +/- tolerance)
 * Canonical names ("between", "gte", "lte", "eq", "boolean") pass through
 * unchanged. Unknown/empty operators keep the historical default "between".
 */
export function normalizeMathComparisonOperator(
  operator: MathComparisonOperator | string | undefined,
): CanonicalMathComparisonOperator {
  if (!operator) {
    return "between";
  }

  const normalized = String(operator)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  switch (normalized) {
    case "lessthan":
      return "lte";
    case "greaterthan":
      return "gte";
    case "equals":
      return "eq";
    case "between":
      return "between";
    case "gte":
      return "gte";
    case "lte":
      return "lte";
    case "eq":
      return "eq";
    case "boolean":
      return "boolean";
    default:
      return "between";
  }
}

export function evaluateMathExpression(params: {
  expression: string;
  variables: Record<string, number>;
  limits?: MathSandboxLimits;
  operator?: MathComparisonOperator;
}): MathSandboxEvaluationResult {
  const startTime = Date.now();
  const trimmed = params.expression.trim();

  if (!trimmed) {
    return {
      isPass: true,
      value: 0,
      formulaValue: 0,
      score: 1.0,
      message: "Empty math expression (neutral PASS)",
      variablesUsed: {},
      executionDurationMs: 0,
      limits: params.limits,
    };
  }

  let computedValue = 0;

  try {
    const parser = new MathSandboxParser(trimmed, params.variables);
    computedValue = parser.parse();
  } catch (err) {
    return {
      isPass: false,
      value: null,
      formulaValue: null,
      score: 0.0,
      message: `Math evaluation syntax error: ${err instanceof Error ? err.message : String(err)}`,
      variablesUsed: params.variables,
      executionDurationMs: Date.now() - startTime,
      limits: params.limits,
    };
  }

  const durationMs = Date.now() - startTime;
  const operator = normalizeMathComparisonOperator(params.operator);
  const limits = params.limits;

  let isPass = true;
  let score = 1.0;
  let verdictMessage = "";

  if (operator === "boolean") {
    isPass = computedValue !== 0;
    score = isPass ? 1.0 : 0.0;
    verdictMessage = isPass
      ? `Expression "${trimmed}" returned TRUE (${computedValue.toFixed(4)})`
      : `Expression "${trimmed}" returned FALSE (${computedValue.toFixed(4)})`;
  } else if (operator === "eq") {
    const nominal = limits?.nominal ?? 0;
    const tol = limits?.tolerance ?? 0.01;
    const diff = Math.abs(computedValue - nominal);
    isPass = diff <= tol;
    score = isPass ? 1.0 - diff / (tol + 1e-6) : 0.0;
    verdictMessage = isPass
      ? `Math Result ${computedValue.toFixed(3)} within nominal ${nominal} ± ${tol}`
      : `Math Result ${computedValue.toFixed(3)} out of tolerance for nominal ${nominal} ± ${tol}`;
  } else if (operator === "gte") {
    const minVal = limits?.min ?? 0;
    isPass = computedValue >= minVal;
    score = isPass ? 1.0 : 0.0;
    verdictMessage = isPass
      ? `Math Result ${computedValue.toFixed(3)} >= min limit ${minVal}`
      : `Math Result ${computedValue.toFixed(3)} < min limit ${minVal}`;
  } else if (operator === "lte") {
    const maxVal = limits?.max ?? 100;
    isPass = computedValue <= maxVal;
    score = isPass ? 1.0 : 0.0;
    verdictMessage = isPass
      ? `Math Result ${computedValue.toFixed(3)} <= max limit ${maxVal}`
      : `Math Result ${computedValue.toFixed(3)} > max limit ${maxVal}`;
  } else {
    // "between" default
    const hasMin = limits?.min !== undefined;
    const hasMax = limits?.max !== undefined;

    if (hasMin && computedValue < limits!.min!) {
      isPass = false;
      score = 0.0;
      verdictMessage = `Math Result ${computedValue.toFixed(3)} below lower limit ${limits!.min}`;
    } else if (hasMax && computedValue > limits!.max!) {
      isPass = false;
      score = 0.0;
      verdictMessage = `Math Result ${computedValue.toFixed(3)} exceeds upper limit ${limits!.max}`;
    } else {
      isPass = true;
      score = 1.0;
      const minText = hasMin ? String(limits!.min) : "-∞";
      const maxText = hasMax ? String(limits!.max) : "+∞";
      verdictMessage = `Math Result ${computedValue.toFixed(3)} within limits [${minText}, ${maxText}]`;
    }
  }

  return {
    isPass,
    value: computedValue,
    formulaValue: computedValue,
    score: Math.max(0.0, Math.min(1.0, score)),
    message: verdictMessage,
    variablesUsed: params.variables,
    executionDurationMs: durationMs,
    limits: params.limits,
  };
}
