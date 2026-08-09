import { describe, it, expect } from "vitest";
import { parseSeedBundleV2, checkBundleIntegrity } from "../schemas-v2";
import bundle from "../data/bundle.v2.json";

describe("seed bundle v2 schema", () => {
  it("accepts the shipped empty bundle", () => {
    expect(() => parseSeedBundleV2(bundle)).not.toThrow();
  });

  it("flags duplicate ids inside a slice", () => {
    const bad = {
      ...(bundle as object),
      categories: [
        { id: "cat-dup", profileId: "prof-default-pcb", name: "A" },
        { id: "cat-dup", profileId: "prof-default-pcb", name: "B" },
      ],
    };
    const parsed = parseSeedBundleV2({
      ...(bundle as object),
      categories: [],
      rulesets: [],
      rules: [],
      samples: [],
      projects: [],
      propertyPresets: [],
      emptyStates: [],
      commands: [],
    });
    const issues = checkBundleIntegrity({
      ...parsed,
      categories: bad.categories as never,
    });
    expect(issues.some((m) => m.includes("duplicate id in categories"))).toBe(true);
  });

  it("rejects an id missing its slice prefix", () => {
    expect(() =>
      parseSeedBundleV2({
        ...(bundle as object),
        categories: [{ id: "wrong-prefix", profileId: "prof-default-pcb", name: "A" }],
      }),
    ).toThrow();
  });

  it("rejects an unknown profileId", () => {
    expect(() =>
      parseSeedBundleV2({
        ...(bundle as object),
        categories: [{ id: "cat-a", profileId: "prof-does-not-exist", name: "A" }],
      }),
    ).toThrow();
  });

  it("rejects a bundle missing a frozen profile", () => {
    expect(() =>
      parseSeedBundleV2({
        ...(bundle as object),
        profiles: [{ id: "prof-default-pcb", name: "x", isDefault: true }],
      }),
    ).toThrow(/missing frozen profile/);
  });
});
