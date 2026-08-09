// Plan 86 Step 23: Memory facade variant tests.
import { describe, expect, it } from "vitest";
import { createMemoryDomainFacade } from "../memory-domain-facade";
import type { DomainRow } from "../domain-facade";

interface Row extends DomainRow {
  name: string;
}

describe("createMemoryDomainFacade", () => {
  it("upsertMany stamps profile and is idempotent", async () => {
    const f = createMemoryDomainFacade<Row>("projects");
    const batch: Row[] = [
      { id: "proj-a", name: "A" },
      { id: "proj-b", name: "B" },
    ];
    const r1 = await f.upsertMany(batch, { profileId: "prof-default" });
    expect(r1).toEqual({ created: 2, updated: 0, skipped: 0 });
    const r2 = await f.upsertMany(batch, { profileId: "prof-default" });
    expect(r2).toEqual({ created: 0, updated: 2, skipped: 0 });
    const rows = await f.list("prof-default");
    expect(rows.every((r) => r.profile === "prof-default")).toBe(true);
  });

  it("resetProfile removes only that profile's rows", async () => {
    const f = createMemoryDomainFacade<Row>("projects");
    await f.upsertMany([{ id: "proj-a", name: "A" }], {
      profileId: "prof-default",
    });
    await f.upsertMany([{ id: "proj-b", name: "B" }], { profileId: "prof-qa" });
    await f.create({ id: "proj-user", name: "user-made" });
    const res = await f.resetProfile("prof-default");
    expect(res.removed).toBe(1);
    expect(await f.get("proj-a")).toBeUndefined();
    expect(await f.get("proj-b")).toBeDefined();
    expect(await f.get("proj-user")).toBeDefined();
  });

  it("duplicate id in upsertMany batch throws", async () => {
    const f = createMemoryDomainFacade<Row>("projects");
    await expect(
      f.upsertMany(
        [
          { id: "proj-dup", name: "A" },
          { id: "proj-dup", name: "B" },
        ],
        { profileId: "prof-default" },
      ),
    ).rejects.toThrow(/duplicate id/);
  });

  it("get returns undefined on miss, never throws", async () => {
    const f = createMemoryDomainFacade<Row>("projects");
    expect(await f.get("nope")).toBeUndefined();
  });

  it("returned rows are cloned (mutation isolation)", async () => {
    const f = createMemoryDomainFacade<Row>("projects");
    await f.create({ id: "proj-a", name: "A" });
    const row = await f.get("proj-a");
    row!.name = "MUTATED";
    const again = await f.get("proj-a");
    expect(again!.name).toBe("A");
  });
});
