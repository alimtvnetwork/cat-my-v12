import { ToleranceKindType, DraftOriginType, RuleKindType } from "@/lib/rules/draftStore";
// Plan 90 Step 132 tests. IndexedDB draft store contract.

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock idb-keyval with an in-memory map so tests run in Node without a
// real IndexedDB. The map is per-test-file, cleared in beforeEach.
const memory = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => memory.get(k)),
  set: vi.fn(async (k: string, v: unknown) => {
    memory.set(k, v);
  }),
  del: vi.fn(async (k: string) => {
    memory.delete(k);
  }),
  keys: vi.fn(async () => Array.from(memory.keys())),
}));

import {
  putDraft,
  getDraft,
  deleteDraft,
  listDraftIds,
  RULESET_SCHEMA_VERSION,
  type RuleSetEnvelope,
} from "../draftStore";

function valid(id = 42): RuleSetEnvelope {
  return {
    SchemaVersion: RULESET_SCHEMA_VERSION,
    RuleSetId: id,
    Name: "MERCURY2 - Housing v3",
    Version: 7,
    Enabled: true,
    Rules: [
      {
        Id: 1,
        Kind: RuleKindType.Presence,
        Enabled: true,
        Shape: { Type: "rect", X: 120, Y: 80, W: 240, H: 160 },
        Tolerance: { Kind: ToleranceKindType.Pct, Value: 5.0 },
        Params: {},
      },
    ],
    DraftMeta: {
      ClientId: "c-uuid",
      UpdatedAt: "2026-07-21T12:34:56Z",
      Origin: DraftOriginType.Indexeddb,
    },
  };
}

beforeEach(() => memory.clear());

describe("draftStore", () => {
  it("puts and reads back exact PascalCase shape", async () => {
    await putDraft(valid());
    const back = await getDraft(42);
    expect(back).not.toBeNull();
    expect(back!.RuleSetId).toBe(42);
    expect(back!.Rules[0].Shape.W).toBe(240);
    expect(back!.DraftMeta.Origin).toBe("indexeddb");
  });

  it("returns null when no draft exists", async () => {
    expect(await getDraft(999)).toBeNull();
  });

  it("delete removes the draft", async () => {
    await putDraft(valid(7));
    await deleteDraft(7);
    expect(await getDraft(7)).toBeNull();
  });

  it("listDraftIds returns only rs-draft: keys sorted", async () => {
    await putDraft(valid(3));
    await putDraft(valid(1));
    await putDraft(valid(9));
    memory.set("unrelated:x", 1);
    expect(await listDraftIds()).toEqual([1, 3, 9]);
  });

  it.each([
    ["bad SchemaVersion", (e: RuleSetEnvelope) => ({ ...e, SchemaVersion: 2 as unknown as 1 })],
    ["negative RuleSetId", (e: RuleSetEnvelope) => ({ ...e, RuleSetId: -1 })],
    ["empty Name", (e: RuleSetEnvelope) => ({ ...e, Name: "" })],
    ["non-bool Enabled", (e: RuleSetEnvelope) => ({ ...e, Enabled: "yes" as unknown as boolean })],
    [
      "duplicate rule Ids",
      (e: RuleSetEnvelope) => ({ ...e, Rules: [e.Rules[0], { ...e.Rules[0] }] }),
    ],
    [
      "bad Origin",
      (e: RuleSetEnvelope) => ({
        ...e,
        DraftMeta: { ...e.DraftMeta, Origin: "cloud" as unknown as "server" },
      }),
    ],
    [
      "non-ISO UpdatedAt",
      (e: RuleSetEnvelope) => ({ ...e, DraftMeta: { ...e.DraftMeta, UpdatedAt: "yesterday" } }),
    ],
  ])("rejects invalid payload: %s", async (_label, mutate) => {
    await expect(putDraft(mutate(valid()) as unknown as RuleSetEnvelope)).rejects.toThrow(
      /draftStore/,
    );
  });

  it("rejects invalid RuleSetId at key layer", async () => {
    await expect(getDraft(-5)).rejects.toThrow(/invalid RuleSetId/);
  });
});
