// @vitest-environment jsdom
// Plan 86 Step 31: layered read tests for `useSampleLibrary`.
//
// Verifies the 3-tier fallback: v2 facade (projected) > v1 seed slice > legacy.

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSampleLibrary } from "@/lib/editor/useSampleLibrary";
import { samplesFacade } from "@/lib/facades/slice-facades";
import { __resetActiveProfileForTests, setActiveProfile } from "@/lib/seed/active-profile";
import { SAMPLE_LIBRARY } from "@/lib/editor/sample-library";

describe("useSampleLibrary (Plan 86 Step 31)", () => {
  beforeEach(async () => {
    __resetActiveProfileForTests();
    // Clear both profiles we touch in this suite.
    await samplesFacade.resetProfile("prof-test-lib");
    await samplesFacade.resetProfile("prof-test-empty");
  });

  it("no active profile → legacy SAMPLE_LIBRARY fallback", () => {
    const { result } = renderHook(() => useSampleLibrary());
    expect(result.current.fromFacadeV2).toBe(false);
    expect(result.current.library.length).toBeGreaterThan(0);
  });

  it("active profile + facade rows carrying library extras → v2 projection", async () => {
    // Reuse a real bundled asset id so `urlIndex()` resolves it.
    const anchor = SAMPLE_LIBRARY[0];
    await samplesFacade.upsertMany(
      [
        {
          id: anchor.id,
          projectId: "proj-x",
          label: anchor.label,
          category: anchor.category,
          fov: anchor.fov,
          assetId: anchor.id,
          pocketCount: anchor.pocketCount,
        } as never,
      ],
      { profileId: "prof-test-lib" },
    );
    act(() => setActiveProfile("prof-test-lib"));

    const { result } = renderHook(() => useSampleLibrary());
    expect(result.current.fromFacadeV2).toBe(true);
    expect(result.current.library).toHaveLength(1);
    expect(result.current.library[0].id).toBe(anchor.id);
  });

  it("active profile + rows without library extras → falls through to legacy", async () => {
    await samplesFacade.upsertMany([{ id: "smp-only-projectid", projectId: "proj-y" }], {
      profileId: "prof-test-empty",
    });
    act(() => setActiveProfile("prof-test-empty"));

    const { result } = renderHook(() => useSampleLibrary());
    expect(result.current.fromFacadeV2).toBe(false);
    // Legacy path still returns a non-empty library.
    expect(result.current.library.length).toBeGreaterThan(0);
  });
});
