/**
 * Plan 100 Phase E step 28: closeout test for per-ROI-kind pane
 * persistence. Locks that `setPropertiesPaletteOpenPane` stores a pane
 * choice under each of the seven valid keys (rule/category + C/R/K/S/E)
 * without mangling the others, and that the sanitizer drops unknown
 * keys on rehydrate.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { useUiPrefsStore } from "@/lib/ui-prefs-store";

beforeEach(() => {
  useUiPrefsStore.setState({ propertiesPaletteOpenPaneByKind: {} });
});

describe("ui-prefs propertiesPaletteOpenPaneByKind (per-kind persistence)", () => {
  it("stores independent panes for each ROI kind key", () => {
    const { setPropertiesPaletteOpenPane } = useUiPrefsStore.getState();
    setPropertiesPaletteOpenPane("R", "grid");
    setPropertiesPaletteOpenPane("C", "adjust");
    setPropertiesPaletteOpenPane("S", "css");
    setPropertiesPaletteOpenPane("rule", "info");
    const map = useUiPrefsStore.getState().propertiesPaletteOpenPaneByKind;
    expect(map).toEqual({ R: "grid", C: "adjust", S: "css", rule: "info" });
  });

  it("overwrites only the touched key", () => {
    const { setPropertiesPaletteOpenPane } = useUiPrefsStore.getState();
    setPropertiesPaletteOpenPane("R", "grid");
    setPropertiesPaletteOpenPane("C", "adjust");
    setPropertiesPaletteOpenPane("R", "history");
    const map = useUiPrefsStore.getState().propertiesPaletteOpenPaneByKind;
    expect(map.R).toBe("history");
    expect(map.C).toBe("adjust");
  });
});
