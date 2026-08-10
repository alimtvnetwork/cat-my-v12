import { MathTokenKindType } from "@/lib/editor/math/types";
import { MathIssueReasonType } from "@/lib/editor/math/types";
import type {
  MathEvaluation,
  MathIssueReason,
  MathNumericResult,
  MathToken,
  MathValueMap,
} from "./types";

const COMPARISON_OPERATORS = new Set(["<", "<=", ">", ">=", "==", "!="]);

export function parseMathTokens(tokens: MathToken[], values: MathValueMap): MathEvaluation {
  return new MathParser(tokens, values).parse();
}

class MathParser {
  private index = 0;

  constructor(
    private readonly tokens: MathToken[],
    private readonly values: MathValueMap,
  ) {}

  parse(): MathEvaluation {
    const left = this.parseAdd();

    if (left.ok === false) return failEvaluation(left.reason);
    const operator = this.takeComparisonOperator();

    if (operator === null) return failEvaluation(MathIssueReasonType.MathParse);
    const right = this.parseAdd();

    if (right.ok === false) return failEvaluation(right.reason);

    if (this.current().kind !== "eof") return failEvaluation(MathIssueReasonType.MathParse);

    return { ok: true, isFail: false, value: left.value, pass: compare(operator, left.value, right.value) };
  }

  private parseAdd(): MathNumericResult {
    return this.parseBinary(() => this.parseMul(), new Set(["+", "-"]));
  }

  private parseMul(): MathNumericResult {
    return this.parseBinary(() => this.parseUnary(), new Set(["*", "/", "%"]));
  }

  private parseUnary(): MathNumericResult {
    const token = this.current();

    if (token.text === "+") {
      this.advance();

      return this.parsePrimary();
    }

    if (token.text === "-") {
      this.advance();

      return mapValue(this.parsePrimary(), (value) => -value);
    }

    return this.parsePrimary();
  }

  private parsePrimary(): MathNumericResult {
    const token = this.current();

    if (token.kind === "number" && token.value !== undefined) {
      this.advance();

      return ok(token.value);
    }

    if (token.kind === "identifier") return this.parseIdentifier();

    if (token.kind === "leftParen") return this.parseGrouped();

    return fail(MathIssueReasonType.MathParse);
  }

  private parseIdentifier(): MathNumericResult {
    const name = this.advance().text;

    if (this.takeText("(")) return this.parseCall(name);

    if (this.takeKind(MathTokenKindType.Dot) === false) return fail(MathIssueReasonType.MathParse);
    const property = this.advance();

    if (property.kind !== "identifier" || property.text !== "value")

      return fail(MathIssueReasonType.MathParse);
    const value = this.values[name];

    if (Number.isFinite(value) === false) return fail(MathIssueReasonType.MathRefMissing);

    return ok(value);
  }

  private parseCall(name: string): MathNumericResult {
    if (name === "abs") return this.parseAbsCall();

    if (name === "min" || name === "max") return this.parseTwoArgCall(name);

    return fail(MathIssueReasonType.MathParse);
  }

  private parseAbsCall(): MathNumericResult {
    const value = this.parseAdd();

    if (value.ok === false) return value;

    if (this.takeText(")") === false) return fail(MathIssueReasonType.MathParse);

    return ok(Math.abs(value.value));
  }

  private parseTwoArgCall(name: string): MathNumericResult {
    const first = this.parseAdd();

    if (first.ok === false) return first;

    if (this.takeKind(MathTokenKindType.Comma) === false)

      return fail(MathIssueReasonType.MathParse);
    const second = this.parseAdd();

    if (second.ok === false) return second;

    if (this.takeText(")") === false) return fail(MathIssueReasonType.MathParse);

    return ok(
      name === "min" ? Math.min(first.value, second.value) : Math.max(first.value, second.value),
    );
  }

  private parseGrouped(): MathNumericResult {
    this.advance();
    const value = this.parseAdd();

    if (value.ok === false) return value;

    if (this.takeText(")") === false) return fail(MathIssueReasonType.MathParse);

    return value;
  }

  private parseBinary(
    parseNext: () => MathNumericResult,
    operators: Set<string>,
  ): MathNumericResult {
    let left = parseNext();
    while (left.ok && operators.has(this.current().text)) {
      const operator = this.advance().text;
      const right = parseNext();
      left = right.ok ? combine(operator, left.value, right.value) : right;
    }

    return left;
  }

  private takeComparisonOperator(): string | null {
    const text = this.current().text;

    if (COMPARISON_OPERATORS.has(text) === false) return null;
    this.advance();

    return text;
  }

  private takeKind(kind: MathToken["kind"]): boolean {
    if (this.current().kind !== kind) return false;
    this.advance();

    return true;
  }

  private takeText(text: string): boolean {
    if (this.current().text !== text) return false;
    this.advance();

    return true;
  }

  private advance(): MathToken {
    const token = this.current();
    this.index += 1;

    return token;
  }

  private current(): MathToken {
    return this.tokens[this.index] ?? { kind: "eof", text: "" };
  }
}

function combine(operator: string, left: number, right: number): MathNumericResult {
  if ((operator === "/" || operator === "%") && right === 0)

    return fail(MathIssueReasonType.MathDivZero);

  if (operator === "+") return ok(left + right);

  if (operator === "-") return ok(left - right);

  if (operator === "*") return ok(left * right);

  if (operator === "/") return ok(left / right);

  if (operator === "%") return ok(left % right);

  return fail(MathIssueReasonType.MathParse);
}

function compare(operator: string, left: number, right: number): boolean {
  if (operator === "<") return left < right;

  if (operator === "<=") return left <= right;

  if (operator === ">") return left > right;

  if (operator === ">=") return left >= right;

  if (operator === "==") return left === right;

  return left !== right;
}

function mapValue(result: MathNumericResult, fn: (value: number) => number): MathNumericResult {
  if (result.ok === false) return result;

  return ok(fn(result.value));
}

function ok(value: number): MathNumericResult {
  return Number.isFinite(value) ? { ok: true, isFail: false, value } : fail(MathIssueReasonType.MathParse);
}

function fail(reason: MathIssueReason): MathNumericResult {
  return { ok: false, isFail: true, reason };
}

function failEvaluation(reason: MathIssueReason): MathEvaluation {
  return { ok: false, isFail: true, reason };
}
