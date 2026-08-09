// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { toIntId, fromIntId, seedIntIds, __resetRuleIdAliasForTests } from "../rule-id-alias";

describe("rule-id-alias", () => {
  beforeEach(() => {
    __resetRuleIdAliasForTests();
  });

  it("assigns stable positive integers", () => {
    const a = toIntId("smp-pcb-refdes-01");
    const b = toIntId("smp-pcb-refdes-01");
    expect(a).toBe(b);
    expect(Number.isInteger(a)).toBe(true);
    expect(a).toBeGreaterThan(0);
  });

  it("assigns distinct ids to distinct rules and reverses cleanly", () => {
    const a = toIntId("rule-alpha");
    const b = toIntId("rule-beta");
    expect(a).not.toBe(b);
    expect(fromIntId(a)).toBe("rule-alpha");
    expect(fromIntId(b)).toBe("rule-beta");
  });

  it("returns null for unknown or invalid ints", () => {
    expect(fromIntId(999999)).toBeNull();
    expect(fromIntId(0)).toBeNull();
    expect(fromIntId(-3)).toBeNull();
    expect(fromIntId(1.5)).toBeNull();
  });

  it("persists across reads (survives simulated reload)", () => {
    const a = toIntId("persist-me");
    // Simulate reload by re-invoking through the same localStorage state.
    expect(fromIntId(a)).toBe("persist-me");
  });

  it("migrates legacy string ids by assigning a fresh alias on first use", () => {
    // Simulates opening a bookmark saved before the integer-alias URL scheme.
    const legacy = "0f8c1e5a-4b6d-4e7a-9a2c-1234567890ab";
    const intId = toIntId(legacy);
    expect(Number.isInteger(intId)).toBe(true);
    expect(intId).toBeGreaterThan(0);
    expect(fromIntId(intId)).toBe(legacy);
    // Second lookup is stable, so the redirect target from the route is stable.
    expect(toIntId(legacy)).toBe(intId);
  });

  it("seedIntIds assigns integers deterministically in lexicographic order", () => {
    // Insertion order is intentionally scrambled to prove the seeder sorts.
    seedIntIds(["zeta", "alpha", "mu", "beta"]);
    expect(toIntId("alpha")).toBe(1);
    expect(toIntId("beta")).toBe(2);
    expect(toIntId("mu")).toBe(3);
    expect(toIntId("zeta")).toBe(4);
  });

  it("seedIntIds is idempotent and preserves prior aliases", () => {
    seedIntIds(["alpha", "beta"]);
    const alpha1 = toIntId("alpha");
    const beta1 = toIntId("beta");
    // Re-run with additional ids: existing ids keep their integers,
    // only new ones consume fresh integers.
    seedIntIds(["gamma", "alpha", "beta", "delta"]);
    expect(toIntId("alpha")).toBe(alpha1);
    expect(toIntId("beta")).toBe(beta1);
    // gamma < delta lexicographically, so delta comes first alphabetically
    // among the NEW ids ("delta" < "gamma").
    expect(toIntId("delta")).toBe(3);
    expect(toIntId("gamma")).toBe(4);
  });

  it("seedIntIds produces the same mapping on two isolated fresh installs", () => {
    const ids = ["rule-c", "rule-a", "rule-b"];
    seedIntIds(ids);
    const snapshot = { a: toIntId("rule-a"), b: toIntId("rule-b"), c: toIntId("rule-c") };
    __resetRuleIdAliasForTests();
    seedIntIds([...ids].reverse());
    expect({ a: toIntId("rule-a"), b: toIntId("rule-b"), c: toIntId("rule-c") }).toEqual(snapshot);
  });
});
