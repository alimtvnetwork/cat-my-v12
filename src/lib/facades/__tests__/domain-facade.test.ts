// Plan 86 Step 22: contract-shape ratchet.
//
// This test does NOT exercise a runtime implementation (Steps 23+ add those).
// It pins the interface shape via a satisfies check so accidental
// widening/narrowing in `domain-facade.ts` breaks the build.

import { describe, expect, it } from "vitest";
import type {
  DomainFacade,
  DomainRow,
  UpsertManyResult,
  ResetProfileResult,
  DomainFacadeRegistry,
} from "../domain-facade";

interface FakeRow extends DomainRow {
  name: string;
}

const fake: DomainFacade<FakeRow> = {
  slice: "projects",
  list: async () => [],
  get: async () => undefined,
  count: async () => 0,
  create: async (r) => r,
  update: async (id, patch) => ({ id, name: "x", ...patch }) as FakeRow,
  remove: async () => {},
  upsertMany: async (): Promise<UpsertManyResult> => ({
    created: 0,
    updated: 0,
    skipped: 0,
  }),
  resetProfile: async (): Promise<ResetProfileResult> => ({ removed: 0 }),
  subscribe: () => () => {},
};

describe("DomainFacade<T> contract (SS-09 frozen)", () => {
  it("accepts a minimal conforming implementation", () => {
    expect(fake.slice).toBe("projects");
  });

  it("registry maps slice keys to facades", () => {
    const reg: DomainFacadeRegistry = { projects: fake };
    expect(reg.projects).toBe(fake);
  });

  it("upsertMany result carries created/updated/skipped counters", async () => {
    const r = await fake.upsertMany([], { profileId: "prof-default-pcb" });
    expect(r).toEqual({ created: 0, updated: 0, skipped: 0 });
  });

  it("resetProfile result carries removed counter", async () => {
    const r = await fake.resetProfile("prof-default-pcb");
    expect(r).toEqual({ removed: 0 });
  });

  it("subscribe returns an unsubscribe function", () => {
    const unsub = fake.subscribe(() => {});
    expect(typeof unsub).toBe("function");
    unsub();
  });
});
