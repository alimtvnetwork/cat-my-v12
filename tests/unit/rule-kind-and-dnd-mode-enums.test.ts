// Plan 41 steps 4+5 verification. Enum-only smoke tests: values are stable,
// the type guards accept known values and reject junk. No logic under test
// yet; these guardrails catch accidental renames in future slices.
import { describe, it, expect } from "vitest";
import {
  RuleKindType,
  RULE_KIND_LABEL,
  ALL_RULE_KINDS,
  isRuleKindType,
} from "@/types/rules/RuleKind";
import { DndModeType, ALL_DND_MODES, isDndModeType } from "@/types/rules/DndMode";

describe("RuleKind enum", () => {
  it("exposes the five expected kinds with stable literal values", () => {
    expect(RuleKindType.Circle).toBe("C");
    expect(RuleKindType.Rectangle).toBe("R");
    expect(RuleKindType.Keypoint).toBe("K");
    expect(RuleKindType.Slot).toBe("S");
    expect(RuleKindType.Edge).toBe("E");
    expect(ALL_RULE_KINDS).toHaveLength(5);
  });
  it("has a label for every kind", () => {
    for (const k of ALL_RULE_KINDS) expect(RULE_KIND_LABEL[k]).toBeTruthy();
  });
  it("guard accepts known kinds and rejects junk", () => {
    expect(isRuleKindType("R")).toBe(true);
    expect(isRuleKindType("X")).toBe(false);
    expect(isRuleKindType(42)).toBe(false);
  });
});

describe("DndMode enum", () => {
  it("exposes exactly Idle, KeyboardGrabbed, PointerDragging", () => {
    expect(ALL_DND_MODES).toEqual([
      DndModeType.Idle,
      DndModeType.KeyboardGrabbed,
      DndModeType.PointerDragging,
    ]);
  });
  it("guard accepts known modes and rejects junk", () => {
    expect(isDndModeType("idle")).toBe(true);
    expect(isDndModeType("keyboard-grabbed")).toBe(true);
    expect(isDndModeType("dragging")).toBe(false);
  });
});
