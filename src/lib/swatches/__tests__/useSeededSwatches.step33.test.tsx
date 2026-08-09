// @vitest-environment jsdom
// Plan 86 Step 33: layered read tests for `useSeededSwatches`.

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSeededSwatches } from "@/lib/swatches/useSeededSwatches";
import { swatchesFacade } from "@/lib/facades/slice-facades";
import { __resetActiveProfileForTests, setActiveProfile } from "@/lib/seed/active-profile";

const PROFILE = "prof-test-swatches-33";

describe("useSeededSwatches (Plan 86 Step 33)", () => {
  beforeEach(async () => {
    __resetActiveProfileForTests();
    await swatchesFacade.resetProfile(PROFILE);
  });

  it("no active profile → legacy defaults (non-empty)", () => {
    const { result } = renderHook(() => useSeededSwatches());
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current[0]).toMatch(/^#/);
  });

  it("active profile with seeded rows → hex[] sorted by order", async () => {
    await swatchesFacade.upsertMany(
      [
        { id: "sw-b", name: "B", hex: "#222222", order: 20 } as never,
        { id: "sw-a", name: "A", hex: "#111111", order: 10 } as never,
      ],
      { profileId: PROFILE },
    );
    act(() => setActiveProfile(PROFILE));

    const { result } = renderHook(() => useSeededSwatches());
    expect(result.current).toEqual(["#111111", "#222222"]);
  });

  it("active profile with zero seeded rows → falls back to legacy defaults", async () => {
    act(() => setActiveProfile(PROFILE));
    const { result } = renderHook(() => useSeededSwatches());
    expect(result.current.length).toBeGreaterThan(0);
  });
});
