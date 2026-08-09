// @vitest-environment jsdom
// Plan 86 Step 30 tests: useFacadeOrStore + active-profile.
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createMemoryDomainFacade } from "../memory-domain-facade";
import { useFacadeOrStore } from "../useFacadeOrStore";
import {
  setActiveProfile,
  getActiveProfile,
  __resetActiveProfileForTests,
} from "@/lib/seed/active-profile";

interface Row {
  readonly id: string;
  readonly name: string;
  readonly profile?: string;
}

describe("useFacadeOrStore", () => {
  beforeEach(() => {
    __resetActiveProfileForTests();
  });

  it("returns fallback when no profile is active", () => {
    const facade = createMemoryDomainFacade<Row>("projects");
    const fallback = [{ id: "legacy-1", name: "Legacy" }];
    const { result } = renderHook(() => useFacadeOrStore(facade, () => fallback));
    expect(result.current).toBe(fallback);
  });

  it("returns facade rows scoped to the active profile", async () => {
    const facade = createMemoryDomainFacade<Row>("projects");
    await facade.upsertMany(
      [
        { id: "proj-a", name: "A" },
        { id: "proj-b", name: "B" },
      ],
      { profileId: "prof-default-pcb" },
    );
    await facade.upsertMany([{ id: "proj-c", name: "C" }], { profileId: "prof-soic-inspection" });

    const fallback = [{ id: "legacy", name: "Legacy" }];
    const { result, rerender } = renderHook(() => useFacadeOrStore(facade, () => fallback));
    // Start: no profile -> fallback.
    expect(result.current).toBe(fallback);

    act(() => setActiveProfile("prof-default-pcb"));
    rerender();
    expect(Array.isArray(result.current)).toBe(true);
    const rows = result.current as Row[];
    expect(rows.map((r) => r.id).sort()).toEqual(["proj-a", "proj-b"]);

    act(() => setActiveProfile("prof-soic-inspection"));
    rerender();
    const rows2 = result.current as Row[];
    expect(rows2.map((r) => r.id)).toEqual(["proj-c"]);

    act(() => setActiveProfile(null));
    rerender();
    expect(result.current).toBe(fallback);
    expect(getActiveProfile()).toBeNull();
  });

  it("re-renders on facade mutations while a profile is active", async () => {
    const facade = createMemoryDomainFacade<Row>("projects");
    await facade.upsertMany([{ id: "proj-a", name: "A" }], { profileId: "prof-default-pcb" });
    setActiveProfile("prof-default-pcb");

    const { result } = renderHook(() => useFacadeOrStore(facade, () => [] as Row[]));
    expect((result.current as Row[]).map((r) => r.id)).toEqual(["proj-a"]);

    await act(async () => {
      await facade.upsertMany([{ id: "proj-b", name: "B" }], { profileId: "prof-default-pcb" });
    });
    expect((result.current as Row[]).map((r) => r.id).sort()).toEqual(["proj-a", "proj-b"]);
  });
});
