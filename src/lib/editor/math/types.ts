export enum MathIssueReasonType {
  MathParse = "math_parse",
  MathRefMissing = "math_ref_missing",
  MathDivZero = "math_div_zero",
}
export type MathIssueReason = MathIssueReasonType;

export type MathNumericResult =
  | { ok: true; value: number }
  | { ok: false; reason: MathIssueReason };

export type MathEvaluation =
  | { ok: true; pass: boolean; value: number }
  | { ok: false; reason: MathIssueReason };

export enum MathTokenKindType {
  Number = "number",
  Identifier = "identifier",
  Operator = "operator",
  Leftparen = "leftParen",
  Rightparen = "rightParen",
  Comma = "comma",
  Dot = "dot",
  Eof = "eof",
}
export type MathTokenKind = MathTokenKindType;

export interface MathToken {
  kind: MathTokenKind;
  text: string;
  value?: number;
}

export type MathValueMap = Record<string, number>;
