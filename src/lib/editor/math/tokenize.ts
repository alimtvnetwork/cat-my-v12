import { MathTokenKindType } from "@/lib/editor/math/types";
import type { MathToken } from "./types";

const ONE_CHAR_OPERATORS = new Set(["+", "-", "*", "/", "%", "<", ">"]);
const TWO_CHAR_OPERATORS = new Set(["<=", ">=", "==", "!="]);

export function tokenizeMathExpression(input: string): MathToken[] | null {
  const tokens: MathToken[] = [];
  let index = 0;
  while (index < input.length) {
    const next = readNextToken(input, index);

    if (next === null) return null;
    index = next.index;

    if (next.token.kind !== "eof") tokens.push(next.token);
  }

  tokens.push({ kind: MathTokenKindType.Eof, text: "" });

  return tokens;
}

interface ReadResult {
  token: MathToken;
  index: number;
}

function readNextToken(input: string, index: number): ReadResult | null {
  const char = input[index];

  if (isSpace(char)) return { token: { kind: MathTokenKindType.Eof, text: "" }, index: index + 1 };

  if (isDigit(char)) return readNumber(input, index);

  if (isIdentifierStart(char)) return readIdentifier(input, index);

  if (char === "(")
    return { token: { kind: MathTokenKindType.Leftparen, text: char }, index: index + 1 };

  if (char === ")")
    return { token: { kind: MathTokenKindType.Rightparen, text: char }, index: index + 1 };

  if (char === ",")
    return { token: { kind: MathTokenKindType.Comma, text: char }, index: index + 1 };

  if (char === ".") return { token: { kind: MathTokenKindType.Dot, text: char }, index: index + 1 };

  return readOperator(input, index);
}

function readNumber(input: string, start: number): ReadResult | null {
  let index = start;
  let hasDot = false;
  while (index < input.length) {
    const char = input[index];

    if (char === "." && hasDot) return null;

    if (char === ".") hasDot = true;

    if (char !== "." && isDigit(char) === false) break;
    index += 1;
  }

  const text = input.slice(start, index);
  const value = Number(text);

  if (Number.isFinite(value) === false) return null;

  return { token: { kind: MathTokenKindType.Number, text, value }, index };
}

function readIdentifier(input: string, start: number): ReadResult {
  let index = start + 1;
  while (index < input.length && isIdentifierPart(input[index])) index += 1;
  const text = input.slice(start, index);

  return { token: { kind: MathTokenKindType.Identifier, text }, index };
}

function readOperator(input: string, index: number): ReadResult | null {
  const two = input.slice(index, index + 2);

  if (TWO_CHAR_OPERATORS.has(two))
    return { token: { kind: MathTokenKindType.Operator, text: two }, index: index + 2 };
  const one = input[index];

  if (ONE_CHAR_OPERATORS.has(one))
    return { token: { kind: MathTokenKindType.Operator, text: one }, index: index + 1 };

  return null;
}

function isSpace(char: string): boolean {
  return /\s/.test(char);
}

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}
