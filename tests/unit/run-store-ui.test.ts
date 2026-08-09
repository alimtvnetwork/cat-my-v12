import { beforeEach, describe, expect, it } from "vitest";
import { useRunStore } from "@/lib/run-store";
import { assertMutationAllowed, getRunLock, RunLockStateType } from "@/lib/rpc/guards";

/**
 * F-27 UI derivation: run-store state drives every visible control's
 * enabled/disabled state via the RPC guard. These tests lock the derived
 * booleans a component would compute so a store refactor cannot silently
 * unblock mutations during a live run.
 */
describe("run-store UI derivation (F-27)", () => {
  beforeEach(() => useRunStore.getState().reset());

  it("idle state exposes counters at zero and no NG events", () => {
    const s = useRunStore.getState();
    expect(s.status).toBe("idle");
    expect(s.counters).toEqual({ total: 0, ok: 0, ng: 0 });
    expect(s.ngEvents).toEqual([]);
    expect(getRunLock()).toBe(RunLockStateType.Idle);
  });

  it("tick(ok) and tick(ng) update counters and ngEvents log", () => {
    useRunStore.getState().start();
    useRunStore.getState().tick("ok");
    useRunStore.getState().tick("ng", { tool: "Pattern", reason: "low score", score: 42 });
    const s = useRunStore.getState();
    expect(s.counters).toEqual({ total: 2, ok: 1, ng: 1 });
    expect(s.ngEvents[0]).toMatchObject({ tool: "Pattern", reason: "low score", score: 42 });
  });

  it("ngEvents ring is capped at 100 entries", () => {
    useRunStore.getState().start();
    for (let i = 0; i < 150; i++) useRunStore.getState().tick("ng");
    expect(useRunStore.getState().ngEvents.length).toBe(100);
  });

  it("mutation guard blocks every write RPC while Running", () => {
    useRunStore.getState().start();
    for (const op of ["updateTask", "deleteRule", "renameCamera"]) {
      expect(() => assertMutationAllowed(op)).toThrow(/blocked/);
    }
  });

  it("stop() unblocks mutations and preserves counters (audit review)", () => {
    useRunStore.getState().start();
    useRunStore.getState().tick("ok");
    useRunStore.getState().stop();
    expect(useRunStore.getState().status).toBe("idle");
    expect(useRunStore.getState().counters.total).toBe(1);
    expect(() => assertMutationAllowed("updateTask")).not.toThrow();
  });

  it("reset() clears counters AND releases the guard", () => {
    useRunStore.getState().start();
    useRunStore.getState().tick("ng");
    useRunStore.getState().reset();
    const s = useRunStore.getState();
    expect(s.counters).toEqual({ total: 0, ok: 0, ng: 0 });
    expect(s.ngEvents).toEqual([]);
    expect(getRunLock()).toBe(RunLockStateType.Idle);
  });
});
