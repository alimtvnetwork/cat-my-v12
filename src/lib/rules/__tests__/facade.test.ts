// Plan 79 step 13. Rule facade tests: CRUD, cycle rejection, referrer guard,
// Uncategorized lock, subscribe fanout.

import { describe, it, expect, beforeEach } from "vitest";
import { makeRuleFacade, __setRuleFacadeForTests } from "../facade";
import {
  UNCATEGORIZED_RULE_ID,
  RuleCycleError,
  RuleReferencedError,
  BuiltinCategoryError,
  RuleValidationError,
  type Rule,
  type RuleId,
} from "../model";
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

describe("RuleFacade CRUD", () => {
  it("saves and lists rules", async () => {
    const f = makeRuleFacade();
    await f.save(rule("r-1"));
    await f.save(rule("r-2"));
    expect(f.list()).toHaveLength(2);
    expect(f.get("r-1" as RuleId)?.name).toBe("R-1");
  });

  it("rejects invalid rules with RuleValidationError", async () => {
    const f = makeRuleFacade();
    await expect(f.save(rule("", { name: "x" }))).rejects.toBeInstanceOf(RuleValidationError);
  });

  it("rejects self-cycle via appliesBefore = [self]", async () => {
    const f = makeRuleFacade();
    // Model schema catches self-ref first, so this is a schema failure.
    await expect(f.save(rule("r-1", { appliesBefore: ["r-1" as RuleId] }))).rejects.toBeInstanceOf(
      RuleValidationError,
    );
  });

  it("rejects transitive cycle: A -> B -> A", async () => {
    const f = makeRuleFacade();
    await f.save(rule("A"));
    await f.save(rule("B", { appliesBefore: ["A" as RuleId] }));
    // Now update A to depend on B -> cycle.
    await expect(f.save(rule("A", { appliesBefore: ["B" as RuleId] }))).rejects.toBeInstanceOf(
      RuleCycleError,
    );
  });

  it("rejects deletion when referrers exist", async () => {
    const f = makeRuleFacade();
    await f.save(rule("A"));
    await f.save(rule("B", { appliesBefore: ["A" as RuleId] }));
    await expect(f.remove("A" as RuleId)).rejects.toBeInstanceOf(RuleReferencedError);
  });

  it("deletes when no referrers", async () => {
    const f = makeRuleFacade();
    await f.save(rule("A"));
    await f.remove("A" as RuleId);
    expect(f.get("A" as RuleId)).toBeUndefined();
  });

  it("blocks deletion of Uncategorized", async () => {
    const f = makeRuleFacade();
    await f.save(rule(UNCATEGORIZED_RULE_ID, { isCategory: true, name: "Uncategorized" }));
    await expect(f.remove(UNCATEGORIZED_RULE_ID)).rejects.toBeInstanceOf(BuiltinCategoryError);
  });
});

describe("RuleFacade subscription + persistence", () => {
  it("notifies subscribers on save", async () => {
    const f = makeRuleFacade();
    let calls = 0;
    const unsub = f.subscribe(() => {
      calls += 1;
    });
    await f.save(rule("A"));
    expect(calls).toBeGreaterThanOrEqual(1);
    unsub();
  });

  it("rehydrates from the storage seam", async () => {
    const repo = memoryRepo();
    __setProjectRepositoryFacadeForTests(repo);
    const f1 = makeRuleFacade();
    await f1.save(rule("A"));
    // Simulate reload.
    __setRuleFacadeForTests(null);
    __setProjectRepositoryFacadeForTests(repo);
    const f2 = makeRuleFacade();
    await f2.__hydrate();
    expect(f2.list().map((r) => r.id)).toEqual(["A"]);
  });
});