// @vitest-environment jsdom
// Plan 86 Step 35: helper hook wires seeded empty-state CTA through command bus.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { emptyStatesFacade } from "@/lib/facades/slice-facades";
import { setActiveProfile } from "@/lib/seed/active-profile";
import * as bus from "@/lib/command-bus";
import { useSeededEmptyStateAction } from "@/lib/seed/useSeededEmptyStateAction";

describe("useSeededEmptyStateAction (Step 35)", () => {
  beforeEach(() => {
    emptyStatesFacade.resetProfile("prof-default-pcb");
    setActiveProfile("prof-default-pcb");
  });
  afterEach(() => {
    setActiveProfile(null);
    emptyStatesFacade.resetProfile("prof-default-pcb");
  });

  it("returns null cta when no seed row is present", () => {
    const { result } = renderHook(() => useSeededEmptyStateAction("unknown.surface"));
    expect(result.current.cta).toBeNull();
  });

  it("routes CTA click through emitCommand with ctaArgs", async () => {
    await emptyStatesFacade.upsertMany(
      [
        {
          id: "es-x",
          surface: "trial.run",
          title: "T",
          body: "B",
          ctaLabel: "Apply",
          ctaCommandId: "cmd:apply-seed-profile",
          ctaArgs: { profileId: "prof-default-pcb" },
        },
      ],
      { profileId: "prof-default-pcb" },
    );
    const spy = vi.spyOn(bus, "emitCommand").mockImplementation(() => undefined);
    const { result } = renderHook(() => useSeededEmptyStateAction("trial.run"));
    expect(result.current.cta?.label).toBe("Apply");
    result.current.cta?.onClick();
    expect(spy).toHaveBeenCalledWith("cmd:apply-seed-profile", { profileId: "prof-default-pcb" });
    spy.mockRestore();
  });
});
