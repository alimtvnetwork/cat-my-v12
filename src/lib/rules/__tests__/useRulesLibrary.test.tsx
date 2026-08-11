// @vitest-environment jsdom
// Plan 79 step 18 coverage.

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRulesLibrary } from "../useRulesLibrary";
import { makeRuleFacade, __setRuleFacadeForTests } from "../facade";
import { UNCATEGORIZED_RULE_ID, RuleCycleError, type Rule, type RuleId } from "../model";
import {
  __setProjectRepositoryFacadeForTests,
  type ProjectRepositoryFacade,
} from "@/lib/projects/facade";

function memoryRepo(): ProjectRepositoryFacade {
  const store = new Map<string, string>();

  return {
    kind: "memory",
    async readItem(k) {
      return store.get(k) ?? null;
    },
    async writeItem(k, v) {
      store.set(k, v);
    },
    async removeItem(k) {
      store.delete(k);
    },
  };
}

const iso = "2026-07-18T00:00:00.000Z";
function rule(id: string, extra: Partial<Rule> = {}): Rule {
  return {
    id: id as RuleId,
    name: id.toUpperCase(),
    isCategory: false,
    appliesBefore: [],
    conditions: [],
    createdAt: iso,
    updatedAt: iso,
    ...extra,
  } as Rule;
}

beforeEach(() => {
  __setRuleFacadeForTests(null);
  __setProjectRepositoryFacadeForTests(memoryRepo());
});

describe("useRulesLibrary", () => {
  it("starts empty and populates via save()", async () => {
    const { result } = renderHook(() => useRulesLibrary());
    expect(result.current.all).toEqual([]);
    await act(async () => {
      await result.current.save(rule("r-1"));
    });
    await waitFor(() => expect(result.current.all).toHaveLength(1));
    expect(result.current.byId("r-1" as RuleId)?.name).toBe("R-1");
  });

  it("partitions rules vs categories", async () => {
    const { result } = renderHook(() => useRulesLibrary());
    await act(async () => {
      await result.current.save(rule("r-1"));
      await result.current.save(rule("c-1", { isCategory: true, name: "Cat" }));
    });
    await waitFor(() => expect(result.current.all).toHaveLength(2));
    expect(result.current.rules.map((r) => r.id)).toEqual(["r-1"]);
    expect(result.current.categories.map((r) => r.id)).toEqual(["c-1"]);
  });

  it("re-throws RuleCycleError from save()", async () => {
    const f = makeRuleFacade();
    await f.save(rule("a"));
    await f.save(rule("b", { appliesBefore: ["a" as RuleId] }));
    const { result } = renderHook(() => useRulesLibrary());
    // Now try to save a -> b, closing the cycle a -> b -> a.
    await expect(
      result.current.save(rule("a", { appliesBefore: ["b" as RuleId] })),
    ).rejects.toBeInstanceOf(RuleCycleError);
  });

  it("delete of Uncategorized surfaces the typed error", async () => {
    const { result } = renderHook(() => useRulesLibrary());
    await expect(result.current.remove(UNCATEGORIZED_RULE_ID)).rejects.toThrow(/Built-in category/);
  });
});