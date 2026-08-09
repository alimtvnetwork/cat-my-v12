// Plan 86 Step 39: Idempotency ratchet for the v2 seed orchestrator.
//
// Goes beyond the existing "created===0 on second run" check in
// `orchestrator-v2.test.ts` and proves the two SS-09 invariants that Step 39
// promises:
//   (A) Running `runSeedV2` twice with the same bundle+profile yields
//       structurally identical facade snapshots (per-slice row count AND
//       per-slice sorted JSON payload). No drift, no duplicates, no order-of-
//       operations skew.
//   (B) Rows outside the target profile — including user-authored rows that
//       carry no profile at all, and rows belonging to a different seeded
//       profile — are NOT touched by a seed run. This is the guarantee that
//       "reseed my sandbox" never nukes the operator's work.
//
// Root cause guarded: `upsertMany` in `memory-domain-facade.ts` stamps
// `profile: opts.profileId` on every write and `resetProfile` filters by that
// stamp. A regression that either (i) forgot to stamp, or (ii) widened the
// reset to include foreign profiles would silently pass the shallow
// idempotency check but fail these tests.

import { beforeEach, describe, expect, it } from "vitest";
import { __resetSeedV2, runSeedV2, SEED_WRITE_ORDER } from "../orchestrator-v2";
import { createMemoryDomainFacade } from "@/lib/facades/memory-domain-facade";
import type { DomainFacade, DomainFacadeRegistry, DomainRow } from "@/lib/facades/domain-facade";
import bundleV2 from "../data/bundle.v2.json";

function fullRegistry(): DomainFacadeRegistry {
  const reg: DomainFacadeRegistry = {};
  for (const slice of SEED_WRITE_ORDER) {
    reg[slice] = createMemoryDomainFacade(slice);
  }

  return reg;
}

async function snapshotAll(reg: DomainFacadeRegistry) {
  const out: Record<string, unknown> = {};
  for (const slice of SEED_WRITE_ORDER) {
    const facade = reg[slice] as DomainFacade<DomainRow> | undefined;
    if (!facade) continue;
    const rows = await facade.list();
    // Sort by id so ordering never affects equality.
    out[slice] = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  }

  return out;
}

const silent = { info: () => {}, warn: () => {} };

beforeEach(() => __resetSeedV2());

describe("Plan 86 Step 39 — seed orchestrator idempotency", () => {
  it("two runs of the same profile produce identical facade snapshots", async () => {
    const registry = fullRegistry();
    const opts = {
      bundle: bundleV2,
      registry,
      profileId: "prof-default-pcb",
      logger: silent,
    };

    const first = await runSeedV2(opts);
    const afterFirst = await snapshotAll(registry);

    __resetSeedV2();
    const second = await runSeedV2(opts);
    const afterSecond = await snapshotAll(registry);

    expect(first.ok && second.ok).toBe(true);

    // Deep equality across every slice. This catches (a) row-count drift,
    // (b) mutated payloads, (c) reordering that leaks into a store.
    expect(afterSecond).toEqual(afterFirst);

    // And the second run must not create anything net-new.
    for (const r of second.results) {
      if (r.status !== "written") continue;
      expect(r.upsert?.created ?? 0, `slice ${r.slice} created`).toBe(0);
    }
  });

  it("reseeding profile A does not touch profile-scoped rows owned by profile B", async () => {
    // Only `projects` carries a per-row `profileId` in the bundle today.
    // All other slices are shared master data and are intentionally re-stamped
    // to the latest seeding profile (see orchestrator-v2 header comment).
    // The user-visible guarantee we protect here is: a project row created
    // for profile B is byte-identical after profile A is seeded on top.
    const registry = fullRegistry();
    const projects = registry.projects as DomainFacade<DomainRow> | undefined;
    expect(projects).toBeDefined();

    await runSeedV2({
      bundle: bundleV2,
      registry,
      profileId: "prof-blister-qa",
      logger: silent,
    });
    const bBefore = (await projects!.list("prof-blister-qa"))
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(bBefore.length, "profile B seeds at least one project").toBeGreaterThan(0);

    __resetSeedV2();
    await runSeedV2({
      bundle: bundleV2,
      registry,
      profileId: "prof-default-pcb",
      logger: silent,
    });

    const bAfter = (await projects!.list("prof-blister-qa"))
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
    expect(bAfter).toEqual(bBefore);

    // And profile A actually landed too — proves the reseed happened.
    const aAfter = await projects!.list("prof-default-pcb");
    expect(aAfter.length).toBeGreaterThan(0);
  });

  it("user-authored rows (no profile stamp) survive a seed run and a resetProfile", async () => {
    const registry = fullRegistry();

    // Simulate a user-authored project row — no profile stamp — created
    // directly via create() to bypass the seed upsert path.
    const projects = registry.projects as DomainFacade<DomainRow> | undefined;
    expect(projects).toBeDefined();
    const userRow = { id: "proj-user-authored-42", name: "Local WIP" } as DomainRow;
    await projects!.create(userRow);

    // Seed a profile. The user row must survive untouched.
    await runSeedV2({
      bundle: bundleV2,
      registry,
      profileId: "prof-default-pcb",
      logger: silent,
    });
    const afterSeed = await projects!.get(userRow.id);
    expect(afterSeed).toEqual(userRow);
    expect(afterSeed?.profile).toBeUndefined();

    // resetProfile must scope to the profile and leave the user row alone.
    const reset = await projects!.resetProfile("prof-default-pcb");
    expect(reset.removed).toBeGreaterThan(0);
    const afterReset = await projects!.get(userRow.id);
    expect(afterReset).toEqual(userRow);
  });
});
