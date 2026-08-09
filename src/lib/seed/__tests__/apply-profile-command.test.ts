import { CommandIdType } from "@/lib/command-bus";
// @vitest-environment jsdom
// Plan 86 Step 28: apply-seed-profile command handler tests.
//
// Verifies:
//   1. Valid profile id triggers a real `runSeedV2` write through the
//      default registry, and the report is `ok`.
//   2. Unknown profile id is rejected BEFORE any facade write and lands
//      in the errorStore with an actionable code.
//   3. The `onCommand` subscription actually fires the handler.
import { describe, expect, it, beforeEach } from "vitest";
import {
  applySeedProfile,
  registerApplySeedProfileHandler,
  FROZEN_SEED_PROFILES,
} from "../apply-profile-command";
import { emitCommand } from "@/lib/command-bus";
import { defaultDomainRegistry } from "@/lib/facades/registry";
import { __resetSeedV2 } from "../orchestrator-v2";
import { useErrorStore } from "@/lib/errors/errorStore";

beforeEach(async () => {
  __resetSeedV2();
  // Reset all facade slices for the default profile so per-test writes are
  // observable via `created` counts, not `updated`.
  for (const facade of Object.values(defaultDomainRegistry)) {
    await facade!.resetProfile("prof-default-pcb");
  }
  useErrorStore.getState().clearHistory();
});

describe("cmd:apply-seed-profile", () => {
  it("exposes seven frozen palette entries (SS-07)", () => {
    expect(FROZEN_SEED_PROFILES).toHaveLength(7);
    expect(FROZEN_SEED_PROFILES.map((p) => p.id)).toContain("prof-default-pcb");
  });

  it("applies the default profile through the shared registry", async () => {
    const report = await applySeedProfile("prof-default-pcb");
    expect(report).not.toBeNull();
    expect(report!.ok).toBe(true);
    // At least one slice must have written rows.
    const written = report!.results.filter((r) => r.status === "written");
    expect(written.length).toBeGreaterThan(0);
    // Categories slice (SS-09 first) must be present and non-empty.
    const cats = written.find((r) => r.slice === "categories");
    expect(cats?.upsert?.created).toBeGreaterThan(0);
  });

  it("rejects unknown profile id and captures a SEED_V2_UNKNOWN_PROFILE error", async () => {
    const report = await applySeedProfile("prof-does-not-exist");
    expect(report).toBeNull();
    const history = useErrorStore.getState().history;
    expect(history[0]?.code).toBe("SEED_V2_UNKNOWN_PROFILE");
  });

  it("registered handler fires from the command bus", async () => {
    const off = registerApplySeedProfileHandler();
    try {
      __resetSeedV2();
      emitCommand(CommandIdType.CmdApplySeedProfile, { profileId: "prof-soic-inspection" });
      // Give the handler's microtask + orchestrator promise a tick.
      await new Promise((r) => setTimeout(r, 300));
      const count = await defaultDomainRegistry.categories!.count();
      expect(count).toBeGreaterThan(0);
    } finally {
      off();
    }
  });
});
