import { describe, expect, it, beforeEach } from "vitest";
import {
  applyCreateRule,
  applyDeleteRules,
  applyDuplicateRules,
  applyReorderRules,
  applyReplaceAll,
  applySelectAllVisibleUnlocked,
  applySetHidden,
  applySetKind,
  applySetLocked,
  applyUpdateParams,
  useRulesStore,
  type RulesState,
} from "@/lib/editor/store/rules-slice";
import { useHistoryStore } from "@/lib/editor/store/history-slice";
import { tail } from "@/lib/editor/log-stream";
import type { EditorRect, EditorRule } from "@/lib/editor/types";

// G-STORE-02: every exported action name is covered here.
const ACTION_NAMES = [
  "setLocked",
  "setHidden",
  "deleteRules",
  "duplicateRules",
  "reorderRules",
  "reorderRule",
  "groupSelected",
  "ungroup",
  "mergeSelected",
  "selectAllVisibleUnlocked",
  "replaceAll",
  "createRule",
  "updateParams",
  "setKind",
  "setSelection",
] as const;

const BOUNDS: EditorRect = { x: 0, y: 0, width: 1000, height: 1000 };

function rule(id: string, over: Partial<EditorRule> = {}): EditorRule {
  return {
    id,
    name: id.toUpperCase(),
    kind: "R",
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    ...over,
  };
}

function state(rules: EditorRule[], selectedIds: string[] = []): RulesState {
  return { rules, selectedIds, groups: [] };
}

describe("rules-slice action surface (G-STORE-02)", () => {
  it("exports every action name from the spec", () => {
    const store = useRulesStore.getState();
    for (const name of ACTION_NAMES) {
      expect(typeof (store as unknown as Record<string, unknown>)[name]).toBe("function");
    }
  });
});

describe("applySetLocked", () => {
  it("flips locked and skips already-matching (I-1 stable ids)", () => {
    const s = state([rule("a"), rule("b", { isLocked: true })]);
    const next = applySetLocked(s, ["a", "b"], true);
    expect(next.rules[0].isLocked).toBe(true);
    expect(next.rules[1]).toBe(s.rules[1]);
    expect(next.rules[0].id).toBe("a");
  });
  it("no-op returns same reference when nothing changes", () => {
    const s = state([rule("a", { isLocked: true })]);
    expect(applySetLocked(s, ["a"], true)).toBe(s);
  });
});

describe("applySetHidden", () => {
  it("drops newly hidden rules from selection in the same commit (I-2)", () => {
    const s = state([rule("a"), rule("b")], ["a", "b"]);
    const next = applySetHidden(s, ["a"], true);
    expect(next.rules[0].isHidden).toBe(true);
    expect(next.selectedIds).toEqual(["b"]);
  });
  it("show keeps selection intact", () => {
    const s = state([rule("a", { isHidden: true })], []);
    const next = applySetHidden(s, ["a"], false);
    expect(next.rules[0].isHidden).toBe(false);
    expect(next.selectedIds).toEqual([]);
  });
});

describe("applyDeleteRules", () => {
  it("removes unlocked rules and prunes selection", () => {
    const s = state([rule("a"), rule("b")], ["a", "b"]);
    const { next, refusedIds } = applyDeleteRules(s, ["a"]);
    expect(next.rules.map((r) => r.id)).toEqual(["b"]);
    expect(next.selectedIds).toEqual(["b"]);
    expect(refusedIds).toEqual([]);
  });
  it("refuses locked rules and reports them", () => {
    const s = state([rule("a", { isLocked: true }), rule("b")]);
    const { next, refusedIds } = applyDeleteRules(s, ["a", "b"]);
    expect(next.rules.map((r) => r.id)).toEqual(["a"]);
    expect(refusedIds).toEqual(["a"]);
  });
});

describe("applyDuplicateRules", () => {
  it("clones with new ids, +16 offset, clamped, inserted directly above source, replaces selection", () => {
    const src = rule("a", { x: 10, y: 10 });
    const s = state([src, rule("b")]);
    const next = applyDuplicateRules(s, ["a"], { newIds: ["a2"], imageBounds: BOUNDS });
    expect(next.rules.map((r) => r.id)).toEqual(["a", "a2", "b"]);
    expect(next.rules[1].x).toBe(26);
    expect(next.rules[1].y).toBe(26);
    expect(next.rules[1].width).toBe(src.width);
    expect(next.selectedIds).toEqual(["a2"]);
  });
  it("clamps duplicates to image bounds", () => {
    const src = rule("a", { x: 990, y: 990, width: 100, height: 100 });
    const next = applyDuplicateRules(state([src]), ["a"], { newIds: ["a2"], imageBounds: BOUNDS });
    expect(next.rules[1].x).toBe(900);
    expect(next.rules[1].y).toBe(900);
  });
  it("multi-select inserts each clone above its own source", () => {
    const s = state([rule("a"), rule("b"), rule("c")]);
    const next = applyDuplicateRules(s, ["a", "c"], {
      newIds: ["a2", "c2"],
      imageBounds: BOUNDS,
    });
    expect(next.rules.map((r) => r.id)).toEqual(["a", "a2", "b", "c", "c2"]);
    expect(next.selectedIds).toEqual(["a2", "c2"]);
  });
  it("throws on id count mismatch (fail loud, no silent fallback)", () => {
    expect(() =>
      applyDuplicateRules(state([rule("a")]), ["a"], { newIds: [], imageBounds: BOUNDS }),
    ).toThrow(/E_UI_DUPLICATE_ID_COUNT_MISMATCH/);
  });
});

describe("applyReorderRules", () => {
  it("stable moves a non-contiguous set and preserves relative order", () => {
    const s = state([rule("a"), rule("b"), rule("c"), rule("d")]);
    const next = applyReorderRules(s, ["a", "c"], 2);
    // After removing a,c the rest is [b,d]; insert at index 2 => [b,d,a,c].
    expect(next.rules.map((r) => r.id)).toEqual(["b", "d", "a", "c"]);
  });
  it("clamps target index to rest length", () => {
    const s = state([rule("a"), rule("b"), rule("c")]);
    const next = applyReorderRules(s, ["a"], 999);
    expect(next.rules.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });
});

describe("applySelectAllVisibleUnlocked", () => {
  it("selects only visible unlocked rules", () => {
    const s = state([
      rule("a"),
      rule("b", { isHidden: true }),
      rule("c", { isLocked: true }),
      rule("d"),
    ]);
    const next = applySelectAllVisibleUnlocked(s);
    expect(next.selectedIds).toEqual(["a", "d"]);
  });
  it("no-op returns same reference", () => {
    const s = state([rule("a")], ["a"]);
    expect(applySelectAllVisibleUnlocked(s)).toBe(s);
  });
});

describe("commit boundary log surface", () => {
  beforeEach(() => {
    useRulesStore.getState().__resetForTests({
      rules: [rule("a"), rule("b", { isLocked: true })],
      selectedIds: [],
      groups: [],
    });
  });

  it("emits I_UI_RULES_LOCKED / _UNLOCKED", () => {
    useRulesStore.getState().setLocked(["a"], true);
    expect(tail(1)[0].code).toBe("I_UI_RULES_LOCKED");
    useRulesStore.getState().setLocked(["a"], false);
    expect(tail(1)[0].code).toBe("I_UI_RULES_UNLOCKED");
  });

  it("emits I_UI_RULES_HIDDEN / _SHOWN", () => {
    useRulesStore.getState().setHidden(["a"], true);
    expect(tail(1)[0].code).toBe("I_UI_RULES_HIDDEN");
    useRulesStore.getState().setHidden(["a"], false);
    expect(tail(1)[0].code).toBe("I_UI_RULES_SHOWN");
  });

  it("delete emits I_UI_RULES_DELETED for allowed and W_UI_RULE_DELETE_REFUSED for locked", () => {
    useRulesStore.getState().deleteRules(["a", "b"]);
    const codes = tail(2).map((e) => e.code);
    expect(codes).toContain("I_UI_RULES_DELETED");
    expect(codes).toContain("W_UI_RULE_DELETE_REFUSED");
  });

  it("duplicate emits I_UI_RULES_DUPLICATED with new ids", () => {
    useRulesStore.getState().duplicateRules(["a"], { newIds: ["a2"], imageBounds: BOUNDS });
    const last = tail(1)[0];
    expect(last.code).toBe("I_UI_RULES_DUPLICATED");
    expect(last.fields.ruleIds).toBe("a2");
  });

  it("reorder emits I_UI_RULES_REORDERED", () => {
    useRulesStore.getState().reorderRules(["a"], 1);
    expect(tail(1)[0].code).toBe("I_UI_RULES_REORDERED");
  });
});

describe("applyReplaceAll", () => {
  it("replaces rule list, seeds selection to first id when omitted", () => {
    const next = applyReplaceAll(state([]), [rule("a"), rule("b")]);
    expect(next.rules.map((r) => r.id)).toEqual(["a", "b"]);
    expect(next.selectedIds).toEqual(["a"]);
  });
  it("prunes provided selection to present ids", () => {
    const next = applyReplaceAll(state([]), [rule("a")], ["a", "ghost"]);
    expect(next.selectedIds).toEqual(["a"]);
  });
  it("empty replace yields empty selection", () => {
    const next = applyReplaceAll(state([rule("a")], ["a"]), []);
    expect(next.rules).toEqual([]);
    expect(next.selectedIds).toEqual([]);
  });
});

describe("applyCreateRule", () => {
  it("appends and replaces selection with new id", () => {
    const next = applyCreateRule(state([rule("a")], ["a"]), rule("b"));
    expect(next.rules.map((r) => r.id)).toEqual(["a", "b"]);
    expect(next.selectedIds).toEqual(["b"]);
  });
  it("throws on duplicate id (fail loud, I-1 stable ids)", () => {
    expect(() => applyCreateRule(state([rule("a")]), rule("a"))).toThrow(
      /E_UI_CREATE_DUPLICATE_ID/,
    );
  });
});

describe("applyUpdateParams", () => {
  it("shallow-replaces params without touching geometry (I-4)", () => {
    const src = rule("a", { x: 5, y: 6, params: { p: 1 } });
    const next = applyUpdateParams(state([src]), "a", { p: 2, q: "x" });
    expect(next.rules[0].params).toEqual({ p: 2, q: "x" });
    expect(next.rules[0].x).toBe(5);
    expect(next.rules[0].y).toBe(6);
  });
  it("no-op on missing id returns same reference", () => {
    const s = state([rule("a")]);
    expect(applyUpdateParams(s, "ghost", { p: 1 })).toBe(s);
  });
});

describe("applySetKind", () => {
  it("changes kind and family without touching geometry (I-4)", () => {
    const src = rule("a", { x: 5, y: 6, width: 7, height: 8, kind: "C" });
    const next = applySetKind(state([src]), "a", "K");
    expect(next.rules[0].kind).toBe("K");
    expect(next.rules[0].family).toBe("anchor");
    expect(next.rules[0].x).toBe(5);
    expect(next.rules[0].height).toBe(8);
  });
});

describe("commit boundary log surface for extended actions", () => {
  beforeEach(() => {
    useRulesStore.getState().__resetForTests({ rules: [], selectedIds: [], groups: [] });
    useHistoryStore.getState().__resetForTests();
  });
  it("replaceAll emits I_UI_RULES_REPLACED with count", () => {
    useRulesStore.getState().replaceAll([rule("a"), rule("b")]);
    const last = tail(1)[0];
    expect(last.code).toBe("I_UI_RULES_REPLACED");
    expect(last.fields.count).toBe(2);
  });
  it("createRule emits I_UI_RULE_CREATED with ruleId", () => {
    useRulesStore.getState().createRule(rule("a"));
    const last = tail(1)[0];
    expect(last.code).toBe("I_UI_RULE_CREATED");
    expect(last.fields.ruleId).toBe("a");
  });
  it("updateParams emits I_UI_RULE_PARAMS_CHANGED and is silent on no-op", () => {
    useRulesStore.getState().__resetForTests({ rules: [rule("a")], selectedIds: [], groups: [] });
    useRulesStore.getState().updateParams("a", { p: 1 });
    expect(tail(1)[0].code).toBe("I_UI_RULE_PARAMS_CHANGED");
    const beforeLen = tail(200).length;
    useRulesStore.getState().updateParams("ghost", { p: 2 });
    expect(tail(200).length).toBe(beforeLen);
  });
  it("mutating rule actions push one undo snapshot", () => {
    useRulesStore
      .getState()
      .__resetForTests({ rules: [rule("a")], selectedIds: ["a"], groups: [] });
    useRulesStore.getState().setKind("a", "K");
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().past[0].kind).toBe("rule.kind-switch");
  });
});
