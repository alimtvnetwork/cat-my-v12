// @vitest-environment jsdom
// Plan 100 Phase E step 44: locks the single-selection geometry seam
// (`useSelectedRuleShape`) that HUD-follow, "Reveal in canvas" and
// rotation-aware overlays consume. Guarantees rotation normalisation and
// centre derivation stay in one place.
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { useSelectedRuleShape } from "@/lib/editor/selection/useSelectedRuleShape";
import type { EditorRule } from "@/lib/editor/types";

function rule(over: Partial<EditorRule> & { id: string }): EditorRule {
  return {
    name: "R",
    kind: "R",
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    ...over,
  };
}

describe("useSelectedRuleShape", () => {
  beforeEach(() => {
    useRulesStore.getState().replaceAll([], [], []);
  });

  it("returns null when nothing is selected", () => {
    useRulesStore.getState().replaceAll([rule({ id: "a" })], [], []);
    const { result } = renderHook(() => useSelectedRuleShape());
    expect(result.current).toBeNull();
  });

  it("returns null when the selection is a multi-selection", () => {
    useRulesStore.getState().replaceAll([rule({ id: "a" }), rule({ id: "b" })], ["a", "b"], []);
    const { result } = renderHook(() => useSelectedRuleShape());
    expect(result.current).toBeNull();
  });

  it("derives rect + centre for a single selection", () => {
    useRulesStore
      .getState()
      .replaceAll([rule({ id: "a", x: 10, y: 20, width: 40, height: 60, kind: "C" })], ["a"], []);
    const { result } = renderHook(() => useSelectedRuleShape());
    expect(result.current).not.toBeNull();
    expect(result.current!.id).toBe("a");
    expect(result.current!.kind).toBe("C");
    expect(result.current!.rect).toEqual({ x: 10, y: 20, width: 40, height: 60 });
    expect(result.current!.center).toEqual({ x: 30, y: 50 });
  });

  it("treats missing rotation as 0", () => {
    useRulesStore.getState().replaceAll([rule({ id: "a" })], ["a"], []);
    const { result } = renderHook(() => useSelectedRuleShape());
    expect(result.current!.rotation).toBe(0);
  });
});
