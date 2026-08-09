import { describe, it, expect, beforeEach } from "vitest";
import { useRunStore } from "@/lib/run-store";
import { getRunLock, RunLockStateType, assertMutationAllowed } from "@/lib/rpc/guards";

describe("run-store <-> RPC guard sync (F-27)", () => {
  beforeEach(() => useRunStore.getState().reset());

  it("start() flips guard to Running and blocks mutations", () => {
    expect(getRunLock()).toBe(RunLockStateType.Idle);
    useRunStore.getState().start();
    expect(getRunLock()).toBe(RunLockStateType.Running);
    expect(() => assertMutationAllowed("updateTask")).toThrow(/blocked/);
  });

  it("stop() releases guard", () => {
    useRunStore.getState().start();
    useRunStore.getState().stop();
    expect(getRunLock()).toBe(RunLockStateType.Idle);
    expect(() => assertMutationAllowed("updateTask")).not.toThrow();
  });

  it("reset() releases guard", () => {
    useRunStore.getState().start();
    useRunStore.getState().reset();
    expect(getRunLock()).toBe(RunLockStateType.Idle);
  });
});
