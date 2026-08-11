import { EditorRuleKindType } from "@/lib/editor/types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __clearPersistedRulesForTests,
  enableRulesPersistence,
  hydrateRulesFromStorage,
} from "@/lib/editor/store/persistence";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import type { EditorRule } from "@/lib/editor/types";

const seed: EditorRule[] = [
  {
    id: "r1",
    name: "One",
    kind: EditorRuleKindType.C,
    isHidden: false,
    isLocked: false,
    x: 10,
    y: 10,
    width: 20,
    height: 20,
  },
  {
    id: "r2",
    name: "Two",
    kind: EditorRuleKindType.R,
    isHidden: false,
    isLocked: false,
    x: 40,
    y: 40,
    width: 20,
    height: 20,
  },
];

const SCOPE = "test";

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe("editor rules persistence", () => {
  beforeEach(async () => {
    await __clearPersistedRulesForTests(SCOPE);
    useRulesStore.getState().replaceAll([], []);
  });
  afterEach(async () => {
    await __clearPersistedRulesForTests(SCOPE);
  });

  it("hydrate returns false when nothing is stored", async () => {
    const applied = await hydrateRulesFromStorage(SCOPE);
    expect(applied).toBe(false);
  });

  it("persists mutations and rehydrates them into the store", async () => {
    useRulesStore.getState().replaceAll(seed, ["r1"]);
    const dispose = enableRulesPersistence(SCOPE);
    // Layer mutation: hide r2 + lock r1.
    useRulesStore.getState().setHidden(["r2"], true);
    useRulesStore.getState().setLocked(["r1"], true);
    // Wait past the 250ms debounce + a comfortable margin.
    await wait(400);
    dispose();

    // Clear the store and hydrate: the persisted flags must come back.
    useRulesStore.getState().replaceAll([], []);
    const applied = await hydrateRulesFromStorage(SCOPE);
    expect(applied).toBe(true);
    const rules = useRulesStore.getState().rules;
    expect(rules).toHaveLength(2);
    const r1 = rules.find((r) => r.id === "r1")!;
    const r2 = rules.find((r) => r.id === "r2")!;
    expect(r1.isLocked).toBe(true);
    expect(r2.isHidden).toBe(true);
  });
});