// @vitest-environment jsdom
// Plan 72 step 24: migrated to drive seed categories through the
// MemoryUiSeedFacade + SeedProvider path instead of relying on the
// "no provider mounted" degrade branch. This locks the merge behavior
// implemented in useCategoryOptions.ts against the same facade
// contract production uses (spec/21-app/52-sdk-facade-pattern.md).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { useCategoryOptions } from "@/lib/projects/useCategoryOptions";
import { useProjectStore } from "@/lib/projects/store";
import { MemoryUiSeedFacade, SeedProvider, EMPTY_CAT_SEED_BUNDLE } from "@/lib/seed";

function reset() {
  useProjectStore.setState({ projects: {}, rulesets: {} } as never, false);
}

function withSeed(facade: MemoryUiSeedFacade): (props: { children: ReactNode }) => ReactElement {
  return function Wrapper({ children }) {
    return <SeedProvider facade={facade}>{children}</SeedProvider>;
  };
}

describe("useCategoryOptions", () => {
  beforeEach(() => reset());
  afterEach(() => cleanup());

  it("returns workspace union when no projectId (no SeedProvider)", () => {
    const p1 = useProjectStore
      .getState()
      .createProject("A", { categoryNames: ["Bottles", "Cans"] });
    const p2 = useProjectStore
      .getState()
      .createProject("B", { categoryNames: ["Bottles", "Caps"] });
    expect(p1).toBeTruthy();
    expect(p2).toBeTruthy();
    const { result } = renderHook(() => useCategoryOptions());
    expect(result.current.options).toEqual(["Bottles", "Cans", "Caps"]);
    expect(result.current.usageCount.get("bottles")).toBe(2);
  });

  it("scopes to a single project when projectId is provided", () => {
    const p1 = useProjectStore.getState().createProject("A", { categoryNames: ["Bottles"] });
    useProjectStore.getState().createProject("B", { categoryNames: ["Caps"] });
    const { result } = renderHook(() => useCategoryOptions(p1));
    expect(result.current.options).toEqual(["Bottles"]);
  });

  it("create() persists into the project scope", () => {
    const p1 = useProjectStore.getState().createProject("A", { categoryNames: ["Bottles"] });
    const { result, rerender } = renderHook(() => useCategoryOptions(p1));
    act(() => result.current.create("Lids"));
    rerender();
    expect(result.current.options).toContain("Lids");
  });

  it("merges MemoryUiSeedFacade categories into workspace scope", async () => {
    // Real project has "Bottles"; seed facade contributes "Caps" + "Lids".
    useProjectStore.getState().createProject("A", { categoryNames: ["Bottles"] });
    const facade = new MemoryUiSeedFacade({
      ...EMPTY_CAT_SEED_BUNDLE,
      categories: [{ name: "Caps" }, { name: "Lids" }],
    });
    const { result } = renderHook(() => useCategoryOptions(), {
      wrapper: withSeed(facade),
    });
    // SeedProvider resolves on the next microtask; wait for merge.
    await waitFor(() =>
      expect(result.current.options).toEqual(expect.arrayContaining(["Bottles", "Caps", "Lids"])),
    );
  });

  it("project scope ignores seed categories (only owning project counts)", async () => {
    const p1 = useProjectStore.getState().createProject("A", { categoryNames: ["Bottles"] });
    const facade = new MemoryUiSeedFacade({
      ...EMPTY_CAT_SEED_BUNDLE,
      categories: [{ name: "Caps" }, { name: "Lids" }],
    });
    const { result } = renderHook(() => useCategoryOptions(p1), {
      wrapper: withSeed(facade),
    });
    await waitFor(() => expect(result.current.options).toEqual(["Bottles"]));
    expect(result.current.options).not.toContain("Caps");
  });
});
