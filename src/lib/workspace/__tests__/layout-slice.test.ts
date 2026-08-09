// Plan 65 step 6: reducer purity, persistence merge, and observability.

import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  buildDefaultPanels,
  layoutReducers,
  makeObservableStorage,
  useWorkspaceLayoutStore,
  LAYOUT_STORAGE_KEY,
  type PanelState,
} from "../layout-slice";
import { PANELS, getPanel } from "../panel-registry";
import { DockSlotType } from "@/lib/enums/ui";
import { subscribe, __resetErrorBusForTest } from "@/lib/errors/error-bus";
import type { ErrorRecord } from "@/lib/errors";

describe("workspace layout-slice", () => {
  beforeEach(() => {
    __resetErrorBusForTest();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset the singleton store between tests.
    useWorkspaceLayoutStore.setState({ panels: buildDefaultPanels() });
  });

  describe("defaults", () => {
    it("builds one entry per registered panel", () => {
      const panels = buildDefaultPanels();
      expect(Object.keys(panels).sort()).toEqual(PANELS.map((p) => p.id).sort());
    });

    it("respects Command 23 rule 7: Layers and Settings default closed", () => {
      const panels = buildDefaultPanels();
      expect(panels.layers.open).toBe(false);
      expect(panels.settings.open).toBe(false);
      expect(panels.tools.open).toBe(true);
      expect(panels.rules.open).toBe(true);
    });
  });

  describe("reducers are pure", () => {
    it("toggle flips open without mutating the input", () => {
      const before = buildDefaultPanels();
      const snapshot = JSON.parse(JSON.stringify(before)) as typeof before;
      const after = layoutReducers.toggle(before, "layers");
      expect(after.layers.open).toBe(true);
      expect(before).toEqual(snapshot);
      expect(after).not.toBe(before);
    });

    it("open sets open true and clears minimized", () => {
      const start = layoutReducers.minimize(buildDefaultPanels(), "rules");
      const after = layoutReducers.open(start, "rules");
      expect(after.rules.open).toBe(true);
      expect(after.rules.minimized).toBe(false);
    });

    it("close sets open false", () => {
      const after = layoutReducers.close(buildDefaultPanels(), "rules");
      expect(after.rules.open).toBe(false);
    });

    it("dock switches slot and clears floating rect when leaving 'floating'", () => {
      const start = layoutReducers.float(buildDefaultPanels(), "devices", {
        x: 10,
        y: 20,
        width: 300,
        height: 200,
      });
      expect(start.devices.dock).toBe("floating");
      expect(start.devices.floatingRect).toEqual({ x: 10, y: 20, width: 300, height: 200 });
      const docked = layoutReducers.dock(start, "devices", DockSlotType.Right);
      expect(docked.devices.dock).toBe(DockSlotType.Right);
      expect(docked.devices.floatingRect).toBeUndefined();
    });

    it("collapseOthers keeps the target expanded and minimizes the rest", () => {
      const after = layoutReducers.collapseOthers(buildDefaultPanels(), "rules");
      expect(after.rules.minimized).toBe(false);
      expect(after.rules.open).toBe(true);
      for (const [id, s] of Object.entries(after)) {
        if (id === "rules") continue;
        expect(s.minimized).toBe(true);
      }
    });
  });

  describe("unknown panel ids", () => {
    it("rejects and emits E_PANEL_UNKNOWN_ID without mutating state", () => {
      const records: ErrorRecord[] = [];
      subscribe((r) => records.push(r));
      const before = buildDefaultPanels();
      const after = layoutReducers.toggle(before, "does-not-exist");
      expect(after).toBe(before);
      expect(records).toHaveLength(1);
      expect(records[0].detail?.code).toBe("E_PANEL_UNKNOWN_ID");
      expect(records[0].detail?.panelId).toBe("does-not-exist");
      expect(records[0].detail?.caller).toBe("togglePanel");
    });
  });

  describe("merge (persist round-trip)", () => {
    it("prunes stale ids and back-fills new ones from defaults", () => {
      const records: ErrorRecord[] = [];
      subscribe((r) => records.push(r));
      const persisted: Record<string, Partial<PanelState>> = {
        // Valid id with a user override.
        layers: { open: true, dock: DockSlotType.Floating },
        tools: { open: false, dock: DockSlotType.Left },
        "old-inspector": { open: true, dock: DockSlotType.Right },
      };
      const merged = layoutReducers.merge(persisted);
      expect(getPanel("old-inspector")).toBeUndefined();
      expect(merged["old-inspector"]).toBeUndefined();
      expect(merged.layers.open).toBe(true);
      expect(merged.layers.dock).toBe(DockSlotType.Floating);
      // Panels not in the persisted snapshot fall back to defaults.
      expect(merged.tools.open).toBe(false);
      // Pruning fires exactly one E_PANEL_UNKNOWN_ID.
      const pruneEmissions = records.filter(
        (r) => r.detail?.code === "E_PANEL_UNKNOWN_ID" && r.detail?.panelId === "old-inspector",
      );
      expect(pruneEmissions).toHaveLength(1);
    });

    it("returns defaults when persisted is missing or malformed", () => {
      expect(layoutReducers.merge(undefined)).toEqual(buildDefaultPanels());
    });
  });

  describe("observable storage", () => {
    it("emits E_LAYOUT_PERSIST_FAILED when setItem throws", () => {
      const records: ErrorRecord[] = [];
      subscribe((r) => records.push(r));
      const throwing = {
        getItem: () => null,
        setItem: () => {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        },
        removeItem: () => {},
      };
      const wrapped = makeObservableStorage(throwing);
      // Must not throw: the wrapper swallows and reports.
      expect(() => wrapped.setItem("k", "v".repeat(1000))).not.toThrow();
      const persistFailures = records.filter((r) => r.detail?.code === "E_LAYOUT_PERSIST_FAILED");
      expect(persistFailures).toHaveLength(1);
      expect(persistFailures[0].detail?.reason).toBe("QuotaExceededError");
      expect(persistFailures[0].detail?.bytes).toBe(1000);
      expect(persistFailures[0].detail?.storageKey).toBe("k");
    });

    it("passes through getItem and setItem success paths", () => {
      const box: Record<string, string> = {};
      const wrapped = makeObservableStorage({
        getItem: (k) => box[k] ?? null,
        setItem: (k, v) => {
          box[k] = v;
        },
        removeItem: (k) => {
          delete box[k];
        },
      });
      wrapped.setItem("a", "1");
      expect(wrapped.getItem("a")).toBe("1");
      wrapped.removeItem("a");
      expect(wrapped.getItem("a")).toBeNull();
    });
  });

  describe("store actions", () => {
    it("resetLayout returns to defaults", () => {
      const store = useWorkspaceLayoutStore;
      store.getState().openPanel("layers");
      expect(store.getState().panels.layers.open).toBe(true);
      store.getState().resetLayout();
      expect(store.getState().panels.layers.open).toBe(false);
    });

    it("dockPanel + floatPanel round-trip through the store", () => {
      const store = useWorkspaceLayoutStore;
      store.getState().floatPanel("devices", { x: 5, y: 5, width: 200, height: 200 });
      expect(store.getState().panels.devices.dock).toBe(DockSlotType.Floating);
      store.getState().dockPanel("devices", DockSlotType.Bottom);
      expect(store.getState().panels.devices.dock).toBe(DockSlotType.Bottom);
      expect(store.getState().panels.devices.floatingRect).toBeUndefined();
    });
  });

  it("exposes a stable storage key so QA can inspect localStorage", () => {
    expect(LAYOUT_STORAGE_KEY).toBe("workspace-layout:v1");
  });
});
