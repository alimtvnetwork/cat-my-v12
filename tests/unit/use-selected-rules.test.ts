// @vitest-environment jsdom
// Plan 100 Phase E step 43: locks the canonical selection bridge
// (`useSelectedRules`) so future refactors of the palette /
// selection-driven panes cannot silently regress its mode / sharedKind
// contract. Pure store-driven test using vitest + @testing-library/react.
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { useSelectedRules } from "@/lib/editor/selection/useSelectedRules";
import type { EditorRule } from "@/lib/editor/types";

function rule(id: string, kind: EditorRule["kind"] = "R"): EditorRule {
  return {
    id,
    name: `Rule ${id}`,
    kind,
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
  };
}

describe("useSelectedRules", () => {
  beforeEach(() => {
    // Reset the store to a known empty state so tests are order-independent.
    useRulesStore.getState().replaceAll([], [], []);
  });

  it("returns mode='none' with empty ids / rules when nothing is selected", () => {
    useRulesStore.getState().replaceAll([rule("a")], [], []);
    const { result } = renderHook(() => useSelectedRules());
    expect(result.current.mode).toBe("none");
    expect(result.current.ids).toEqual([]);
    expect(result.current.single).toBeNull();
    expect(result.current.sharedKind).toBeNull();
  });

  it("returns mode='single' with the resolved rule and its kind", () => {
    useRulesStore.getState().replaceAll([rule("a", "C"), rule("b", "R")], ["a"], []);
    const { result } = renderHook(() => useSelectedRules());
    expect(result.current.mode).toBe("single");
    expect(result.current.ids).toEqual(["a"]);
    expect(result.current.single?.id).toBe("a");
    expect(result.current.sharedKind).toBe("C");
  });

  it("returns mode='multi' with sharedKind when all selections agree", () => {
    useRulesStore
      .getState()
      .replaceAll([rule("a", "R"), rule("b", "R"), rule("c", "S")], ["a", "b"], []);
    const { result } = renderHook(() => useSelectedRules());
    expect(result.current.mode).toBe("multi");
    expect(result.current.ids).toEqual(["a", "b"]);
    expect(result.current.single).toBeNull();
    expect(result.current.sharedKind).toBe("R");
  });

  it("returns sharedKind=null when the multi-selection is mixed", () => {
    useRulesStore.getState().replaceAll([rule("a", "R"), rule("b", "C")], ["a", "b"], []);
    const { result } = renderHook(() => useSelectedRules());
    expect(result.current.mode).toBe("multi");
    expect(result.current.sharedKind).toBeNull();
  });

  it("ignores selection ids that no longer resolve to a rule", () => {
    // replaceAll prunes selectedIds against the rule set, so this locks
    // the pruning contract that useSelectedRules relies on.
    useRulesStore.getState().replaceAll([rule("a")], ["a", "ghost"], []);
    const { result } = renderHook(() => useSelectedRules());
    expect(result.current.ids).toEqual(["a"]);
    expect(result.current.mode).toBe("single");
  });

  it("re-derives when the selection changes", () => {
    useRulesStore.getState().replaceAll([rule("a"), rule("b")], ["a"], []);
    const { result } = renderHook(() => useSelectedRules());
    expect(result.current.mode).toBe("single");
    act(() => {
      useRulesStore.getState().replaceAll([rule("a"), rule("b")], ["a", "b"], []);
    });
    expect(result.current.mode).toBe("multi");
  });
});
