// Plan 43 slice-2 (v3.228.0): AppEvent registry smoke tests.
// Renamed from constants-events-ipc-errors.test.ts after the aspirational
// IpcChannel / ErrorCode / camera / sample-library registries were removed
// in v3.228.0 (zero call sites; error-codes also conflicted with the real
// wire E_* codes in `src/lib/capture.shared.ts`).

import { describe, expect, it } from "vitest";
import { ALL_APP_EVENTS, AppEvent, isAppEvent } from "@/lib/constants";

describe("AppEvent", () => {
  it("locks reality-aligned literal values", () => {
    expect(AppEvent.EditorOpenInspector).toBe("editor:open-inspector");
    expect(AppEvent.EditorReferenceReady).toBe("editor-reference-ready");
    expect(AppEvent.BugError).toBe("ca:bug-error");
    expect(AppEvent.MenuCommand).toBe("ca:menu-command");
  });
  it("guard accepts registered events and rejects others", () => {
    expect(isAppEvent(AppEvent.MenuCommand)).toBe(true);
    expect(isAppEvent("editor:OPEN-INSPECTOR")).toBe(false);
    expect(isAppEvent(42)).toBe(false);
  });
  it("ALL_APP_EVENTS is unique", () => {
    expect(new Set(ALL_APP_EVENTS).size).toBe(ALL_APP_EVENTS.length);
  });
});
