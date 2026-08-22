// Plan 41 step 4. Single source of truth for editor rule kinds so downstream
// code stops comparing raw string literals like `rule.kind === "C"`. New
// consumers should import `RuleKindType` and `RULE_KIND_LABEL` from here rather
// than repeat the enum in place.
//
// This file is enum-only; behavior lives in the editor slice/schema modules.
// No logic change ships with this file.

export enum RuleKindType {
  Circle = "C",
  Rectangle = "R",
  Keypoint = "K",
  Slot = "S",
  Edge = "E",
}

export namespace RuleKindType {
  export function isCircle(val: unknown): val is RuleKindType.Circle {
    return val === RuleKindType.Circle;
  }

  export function isRectangle(val: unknown): val is RuleKindType.Rectangle {
    return val === RuleKindType.Rectangle;
  }

  export function isKeypoint(val: unknown): val is RuleKindType.Keypoint {
    return val === RuleKindType.Keypoint;
  }

  export function isSlot(val: unknown): val is RuleKindType.Slot {
    return val === RuleKindType.Slot;
  }

  export function isEdge(val: unknown): val is RuleKindType.Edge {
    return val === RuleKindType.Edge;
  }
}

export const RULE_KIND_LABEL: Readonly<Record<RuleKindType, string>> = Object.freeze({
  [RuleKindType.Circle]: "Circle",
  [RuleKindType.Rectangle]: "Rectangle",
  [RuleKindType.Keypoint]: "Keypoint",
  [RuleKindType.Slot]: "Slot",
  [RuleKindType.Edge]: "Edge",
});

export const ALL_RULE_KINDS: readonly RuleKindType[] = Object.freeze([
  RuleKindType.Circle,
  RuleKindType.Rectangle,
  RuleKindType.Keypoint,
  RuleKindType.Slot,
  RuleKindType.Edge,
]);

export function isRuleKindType(value: unknown): value is RuleKindType {
  return typeof value === "string" && (ALL_RULE_KINDS as readonly string[]).includes(value);
}
