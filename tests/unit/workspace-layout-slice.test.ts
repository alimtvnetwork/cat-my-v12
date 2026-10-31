import { beforeEach, describe, expect, it } from "vitest";
import { DockSlotType } from "@/lib/enums/ui";
import { subscribe, __resetErrorBusForTest } from "@/lib/errors/error-bus";
import type { ErrorRecord } from "@/lib/errors/error-record";
import {
  buildDefaultPanels,
  layoutReducers,
  type PanelState,
} from "@/lib/workspace/layout-slice";

// F7: no workspace-layout-slice unit test file existed, so the Hidden and
// invalid-dock reducer behavior added by the window-menu worker was
// entirely untested. These tests lock it: every "make this panel visible"
// action (open, restore, toggle-on, collapse-others survivor) moves a
// Hidden-docked panel back to its registry default dock, while merge
// keeps a persisted Hidden dock (a valid value) and falls back only
// genuinely invalid dock values, reporting W_PANEL_DOCK_INVALID.

function withPanel(
  panels: Record<string, PanelState>,
  id: string,
  patch: Partial<PanelState>,
): Record<string, PanelState> {
  return { ...panels, [id]: { ...panels[id], ...patch } };
}

describe("layoutReducers visibility actions", () => {
  it("open moves a Hidden-docked panel back to its default dock", () => {
    const panels = withPanel(buildDefaultPanels(), "tools", {
      open: false,
      dock: DockSlotType.Hidden,
    });
    const next = layoutReducers.open(panels, "tools");
    expect(next.tools.open).toBe(true);
    expect(next.tools.minimized).toBe(false);
    expect(next.tools.dock).toBe(DockSlotType.Left);
  });

  it("restore moves a Hidden-docked panel back to its default dock", () => {
    const panels = withPanel(buildDefaultPanels(), "rules", {
      open: false,
      minimized: true,
      dock: DockSlotType.Hidden,
    });
    const next = layoutReducers.restore(panels, "rules");
    expect(next.rules.open).toBe(true);
    expect(next.rules.minimized).toBe(false);
    expect(next.rules.dock).toBe(DockSlotType.Right);
  });

  it("toggle-on un-hides but toggle-off keeps the dock", () => {
    const hidden = withPanel(buildDefaultPanels(), "layers", {
      open: false,
      dock: DockSlotType.Hidden,
    });
    const opened = layoutReducers.toggle(hidden, "layers");
    expect(opened.layers.open).toBe(true);
    expect(opened.layers.dock).toBe(DockSlotType.Right);
    const closed = layoutReducers.toggle(opened, "layers");
    expect(closed.layers.open).toBe(false);
    expect(closed.layers.dock).toBe(DockSlotType.Right);
  });

  it("toggle-off from a Hidden dock leaves the dock Hidden", () => {
    const panels = withPanel(buildDefaultPanels(), "tools", {
      open: true,
      dock: DockSlotType.Hidden,
    });
    const next = layoutReducers.toggle(panels, "tools");
    expect(next.tools.open).toBe(false);
    expect(next.tools.dock).toBe(DockSlotType.Hidden);
  });

  it("collapseOthers un-hides the survivor and minimizes the rest", () => {
    const panels = withPanel(buildDefaultPanels(), "tools", {
      open: false,
      dock: DockSlotType.Hidden,
    });
    const next = layoutReducers.collapseOthers(panels, "tools");
    expect(next.tools.open).toBe(true);
    expect(next.tools.minimized).toBe(false);
    expect(next.tools.dock).toBe(DockSlotType.Left);
    expect(next.rules.minimized).toBe(true);
    expect(next.layers.minimized).toBe(true);
  });

  it("close does not un-hide: it is not a make-visible action", () => {
    const panels = withPanel(buildDefaultPanels(), "tools", {
      open: true,
      dock: DockSlotType.Hidden,
    });
    const next = layoutReducers.close(panels, "tools");
    expect(next.tools.open).toBe(false);
    expect(next.tools.dock).toBe(DockSlotType.Hidden);
  });

  it("actions on an unknown panel leave the map untouched", () => {
    const panels = buildDefaultPanels();
    expect(layoutReducers.open(panels, "no-such-panel")).toBe(panels);
    expect(layoutReducers.toggle(panels, "no-such-panel")).toBe(panels);
  });
});

describe("layoutReducers.merge", () => {
  beforeEach(() => {
    __resetErrorBusForTest();
  });

  it("falls back an invalid persisted dock to the panel default and reports it", () => {
    const seen: ErrorRecord[] = [];
    const off = subscribe((rec) => {
      seen.push(rec);
    });
    const next = layoutReducers.merge({
      tools: { open: true, dock: "nonsense-dock", minimized: false, order: 0 },
    });
    off();
    expect(next.tools.dock).toBe(DockSlotType.Left);
    expect(next.tools.open).toBe(true);
    expect(
      seen.some(
        (rec) =>
          rec.detail?.code === "W_PANEL_DOCK_INVALID" &&
          typeof rec.detail?.panelId === "string" &&
          (rec.detail.panelId as string) === "tools",
      ),
    ).toBe(true);
  });

  it("keeps a persisted Hidden dock: it is a valid value, not an error", () => {
    const seen: ErrorRecord[] = [];
    const off = subscribe((rec) => {
      seen.push(rec);
    });
    const next = layoutReducers.merge({
      tools: { open: true, dock: DockSlotType.Hidden, minimized: false, order: 0 },
    });
    off();
    expect(next.tools.dock).toBe(DockSlotType.Hidden);
    expect(next.tools.open).toBe(true);
    expect(seen.some((rec) => rec.detail?.code === "W_PANEL_DOCK_INVALID")).toBe(false);
  });

  it("prunes unknown persisted ids and reports them", () => {
    const seen: ErrorRecord[] = [];
    const off = subscribe((rec) => {
      seen.push(rec);
    });
    const next = layoutReducers.merge({
      "renamed-panel": { open: true, dock: DockSlotType.Left, minimized: false, order: 0 },
    });
    off();
    expect("renamed-panel" in next).toBe(false);
    expect(
      seen.some((rec) => rec.detail?.code === "E_PANEL_UNKNOWN_ID"),
    ).toBe(true);
  });

  it("undefined persisted state yields the defaults", () => {
    expect(layoutReducers.merge(undefined)).toEqual(buildDefaultPanels());
  });
});
