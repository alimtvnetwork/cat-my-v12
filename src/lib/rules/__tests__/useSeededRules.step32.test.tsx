// @vitest-environment jsdom
// Plan 86 Step 32: layered read tests for `useSeededRulesets` / `useSeededRules`.

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSeededRulesets, useSeededRules } from "@/lib/rules/useSeededRules";
import { rulesetsFacade, rulesFacade } from "@/lib/facades/slice-facades";
import { __resetActiveProfileForTests, setActiveProfile } from "@/lib/seed/active-profile";
import { useProjectStore } from "@/lib/projects/store";

const PROFILE = "prof-test-rules-32";

describe("useSeededRulesets / useSeededRules (Plan 86 Step 32)", () => {
  beforeEach(async () => {
    __resetActiveProfileForTests();
    await rulesetsFacade.resetProfile(PROFILE);
    await rulesFacade.resetProfile(PROFILE);
    // Wipe project store to a known shape for the legacy path test.
    useProjectStore.setState({ projects: {}, rulesets: {} }, false);
  });

  it("no active profile → legacy store path (empty when no project)", () => {
    const { result } = renderHook(() => useSeededRulesets("nope"));
    expect(result.current.fromFacadeV2).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it("active profile + facade rulesets → v2 projection, sorted by order", async () => {
    await rulesetsFacade.upsertMany(
      [
        { id: "rs-b", name: "B", order: 20 } as never,
        { id: "rs-a", name: "A", order: 10 } as never,
      ],
      { profileId: PROFILE },
    );
    act(() => setActiveProfile(PROFILE));

    const { result } = renderHook(() => useSeededRulesets(null));
    expect(result.current.fromFacadeV2).toBe(true);
    expect(result.current.items.map((r) => r.id)).toEqual(["rs-a", "rs-b"]);
  });

  it("useSeededRules filters facade rows by rulesetId", async () => {
    await rulesFacade.upsertMany(
      [
        { id: "rule-1", name: "One", rulesetId: "rs-a" } as never,
        { id: "rule-2", name: "Two", rulesetId: "rs-b" } as never,
      ],
      { profileId: PROFILE },
    );
    act(() => setActiveProfile(PROFILE));

    const { result } = renderHook(() => useSeededRules("rs-a"));
    expect(result.current.fromFacadeV2).toBe(true);
    expect(result.current.rules.map((r) => r.id)).toEqual(["rule-1"]);
  });
});
