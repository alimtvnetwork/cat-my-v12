// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __setProjectRepositoryFacadeForTests,
  type ProjectRepositoryFacade,
} from "@/lib/projects/facade";
import { __setRuleFacadeForTests, makeRuleFacade } from "../facade";
import { autoSeedRulesIfEmpty } from "../seed";

const seedFlag = "ca:rules-autoseeded:v1";

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

beforeEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  __setRuleFacadeForTests(null);
  __setProjectRepositoryFacadeForTests(memoryRepo());
});

describe("autoSeedRulesIfEmpty", () => {
  it("repairs a stale seed flag when the rules facade is empty", async () => {
    window.localStorage.setItem(seedFlag, "1");
    const written = await autoSeedRulesIfEmpty();
    const facade = makeRuleFacade();
    expect(written).toBeGreaterThan(0);
    expect(facade.list().some((r) => r.name === "Front Label Presence")).toBe(true);
  });

  it("stays idempotent after repair", async () => {
    await autoSeedRulesIfEmpty();
    const firstCount = makeRuleFacade().list().length;
    const second = await autoSeedRulesIfEmpty();
    expect(second).toBeNull();
    expect(makeRuleFacade().list()).toHaveLength(firstCount);
  });
});
