// @vitest-environment jsdom
// Plan 83 backlog item 11c. Enabled-flag round-trip through the model +
// facade. Rows persisted before the field existed must still validate
// (Zod .optional()), and once toggled to false the value must round-trip
// through hydrate/list.

import { describe, it, expect, beforeEach } from "vitest";
import { RuleSchema, type Rule, type RuleId } from "../model";
import { makeRuleFacade, __setRuleFacadeForTests } from "../facade";
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

const iso = "2026-07-19T00:00:00.000Z";
function base(id: string, extra: Partial<Rule> = {}): Rule {

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

describe("rules: enabled flag", () => {
  it("schema accepts rows without `enabled` (backward compatibility)", () => {
    const parsed = RuleSchema.safeParse(base("r-legacy"));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.enabled).toBeUndefined();
  });

  it("schema round-trips explicit false", () => {
    const parsed = RuleSchema.safeParse(base("r-off", { enabled: false }));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.enabled).toBe(false);
  });

  it("facade persists explicit false and round-trips through list()", async () => {
    const f = makeRuleFacade();
    await f.save(base("r-1", { enabled: false }));
    const rows = f.list();
    expect(rows).toHaveLength(1);
    expect(rows[0].enabled).toBe(false);
  });
});
