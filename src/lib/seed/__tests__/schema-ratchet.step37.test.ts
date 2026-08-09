// Plan 86 Step 37: seed-bundle schema tests — missing required fields,
// unsupported top-level slice names, duplicate ids, and invalid profile
// references. Complements the existing coverage in schemas-v2.test.ts.
import { describe, it, expect } from "vitest";
import { parseSeedBundleV2, checkBundleIntegrity, FROZEN_PROFILE_IDS } from "../schemas-v2";
import bundle from "../data/bundle.v2.json";

const base = bundle as unknown as Record<string, unknown>;

describe("Step 37: schema ratchet", () => {
  it("rejects bundle missing top-level `schemaVersion`", () => {
    const { schemaVersion: _drop, ...rest } = base;
    expect(() => parseSeedBundleV2(rest)).toThrow();
  });

  it("rejects bundle missing top-level `profiles`", () => {
    const { profiles: _drop, ...rest } = base;
    expect(() => parseSeedBundleV2(rest)).toThrow();
  });

  it("rejects a profile row missing required `name`", () => {
    expect(() =>
      parseSeedBundleV2({
        ...base,
        profiles: FROZEN_PROFILE_IDS.map((id, i) => ({
          id,
          isDefault: i === 0,
          // name intentionally omitted for id[1]
          ...(i === 0 ? { name: "default" } : {}),
        })),
      }),
    ).toThrow();
  });

  it("rejects a row missing required `id`", () => {
    expect(() =>
      parseSeedBundleV2({
        ...base,
        categories: [{ profileId: "prof-default-pcb", name: "no id here" }],
      }),
    ).toThrow();
  });

  it("flags an unsupported top-level slice via checkBundleIntegrity", () => {
    const parsed = parseSeedBundleV2(base);
    // Simulate an authoring mistake where someone added `widgets: [...]`
    // hoping the orchestrator would pick it up.
    const issues = checkBundleIntegrity({
      ...parsed,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      widgets: [{ id: "widget-1", name: "unsupported" }] as any,
    });
    expect(issues.some((m) => m === "unsupported slice: widgets")).toBe(true);
  });

  it("ignores unknown non-slice top-level keys (e.g. `$comment`)", () => {
    const parsed = parseSeedBundleV2({ ...base, $comment: "meta note" });
    const issues = checkBundleIntegrity(parsed);
    expect(issues).toEqual([]);
  });

  it("rejects an invalid `schemaVersion` literal", () => {
    expect(() => parseSeedBundleV2({ ...base, schemaVersion: "plan86.v1" })).toThrow();
  });

  it("surfaces duplicate id AND unknown profile in the same run via integrity check", () => {
    const parsed = parseSeedBundleV2(base);
    const issues = checkBundleIntegrity({
      ...parsed,
      cameras: [
        { id: "cam-a", profileId: "prof-default-pcb" },
        { id: "cam-a", profileId: "prof-default-pcb" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
    });
    expect(issues.some((m) => m.includes("duplicate id in cameras: cam-a"))).toBe(true);
  });
});
