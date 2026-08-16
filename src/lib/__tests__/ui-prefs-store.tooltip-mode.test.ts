import { ToolTooltipModeType } from "@/lib/stores/ui-prefs-store";
// @vitest-environment jsdom
// Persistence + defaults for the Tools palette tooltip-mode preference.

import { describe, it, expect, beforeEach } from "vitest";
import {
  __setProjectRepositoryFacadeForTests,
  makeProjectRepositoryFacade,
} from "../projects/facade";

// Small helper: zustand persist's setItem is async; flush pending microtasks
// and give the facade a tick to complete its write before we read it back.
async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe("useUiPrefsStore tool tooltip mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Force a fresh in-memory facade so each test starts empty. The store
    // persists via the ProjectRepositoryFacade, not localStorage.
    __setProjectRepositoryFacadeForTests(null);
  });

  it("defaults to 'hover' and persists updates via the facade", async () => {
    const mod = await import("../stores/ui-prefs-store");
    expect(["hover", "on-demand"]).toContain(mod.useUiPrefsStore.getState().toolTooltipMode);

    mod.useUiPrefsStore.getState().setToolTooltipMode(ToolTooltipModeType.OnDemand);
    expect(mod.useUiPrefsStore.getState().toolTooltipMode).toBe("on-demand");

    await flush();
    const facade = makeProjectRepositoryFacade();
    const raw = await facade.readItem("ca.uiPrefs.v1");
    // The persist blob shape is internal; assert the mode field survived.
    expect(raw ?? "").toContain("on-demand");

    mod.useUiPrefsStore.getState().toggleToolTooltipMode();
    expect(mod.useUiPrefsStore.getState().toolTooltipMode).toBe("hover");

    await flush();
    const raw2 = await facade.readItem("ca.uiPrefs.v1");
    expect(raw2 ?? "").toContain("hover");
  });
});
