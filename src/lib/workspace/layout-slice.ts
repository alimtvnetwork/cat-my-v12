import { ErrorSourceType } from "@/lib/errors/error-record";
/**
 * Plan 65 step 5 (SS-01): workspace layout Zustand slice.
 *
 * Owns the open/closed, docked/floating, minimized state of every registered
 * panel plus a small z-order field for floating windows. Persists to
 * localStorage under `workspace-layout:v1`. All reducers are pure and drive
 * off the panel-registry so tests never touch React.
 *
 * Observability:
 *  - `E_LAYOUT_PERSIST_FAILED` when the storage adapter rejects a write.
 *  - `E_PANEL_UNKNOWN_ID` when a reducer receives an id not in the registry
 *    (stale persisted state, typo, deleted panel).
 *  - `W_PANEL_DROP_INVALID` is reserved for the DockSlot component (SS-02);
 *    the reducer surface only rejects invalid ids, not invalid drops.
 */

import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { PANELS, PANEL_IDS, getPanel } from "./panel-registry";
import { DockSlotType } from "@/lib/enums/ui";
import { reportError } from "@/lib/errors/error-bus";

export interface FloatingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelState {
  open: boolean;
  dock: DockSlotType;
  minimized: boolean;
  order: number;
  floatingRect?: FloatingRect;
}

/**
 * Plan 65 step 35: user-controllable size (in px) of each dock column.
 * left / right are widths; bottom is a height. Clamped by
 * DOCK_SIZE_MIN / DOCK_SIZE_MAX in the reducer.
 */
export interface DockSizes {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export const DOCK_SIZE_MIN = 200;
// Left dock hosts the compact Photoshop-style Tools toolbox by default,
// so it needs to shrink well below the generic 200px minimum used by
// wider right/bottom docks that host list panels.
export const DOCK_LEFT_SIZE_MIN = 52;
// Right dock hosts the Rules rail. Operators asked to shrink it further
// than the generic 200px floor (screenshot 2026-07-20). 160px still fits
// the NumberInput row + chevron gutter of `.rail-panel-head` while giving
// the canvas back ~40-50px.
export const DOCK_RIGHT_SIZE_MIN = 160;
export const DOCK_SIZE_MAX = 800;
export const DOCK_TOP_SIZE_MIN = 84;
export const DOCK_TOP_SIZE_MAX = 180;
export const DEFAULT_DOCK_SIZES: DockSizes = { top: 96, left: 52, right: 360, bottom: 220 };

export function dockMinSize(slot: keyof DockSizes): number {
  if (slot === "top") return DOCK_TOP_SIZE_MIN;

  if (slot === "left") return DOCK_LEFT_SIZE_MIN;

  if (slot === "right") return DOCK_RIGHT_SIZE_MIN;

  return DOCK_SIZE_MIN;
}

export function dockMaxSize(slot: keyof DockSizes): number {
  if (slot === "left") return DOCK_LEFT_SIZE_MIN;

  return slot === "top" ? DOCK_TOP_SIZE_MAX : DOCK_SIZE_MAX;
}

function clampDockSize(slot: keyof DockSizes, px: number): number {
  if (Number.isFinite(px))
    return Math.max(dockMinSize(slot), Math.min(dockMaxSize(slot), Math.round(px)));

  return dockMinSize(slot);
}

export interface WorkspaceLayoutState {
  panels: Record<string, PanelState>;
  dockSizes: DockSizes;
  togglePanel: (id: string) => void;
  openPanel: (id: string) => void;
  closePanel: (id: string) => void;
  dockPanel: (id: string, slot: DockSlotType) => void;
  floatPanel: (id: string, rect: FloatingRect) => void;
  minimizePanel: (id: string) => void;
  restorePanel: (id: string) => void;
  collapseOthers: (id: string) => void;
  setDockSize: (slot: keyof DockSizes, px: number) => void;
  resetLayout: () => void;
  applyLayoutSnapshot: (snapshot: LayoutSnapshot) => void;
}

/**
 * A saveable/restorable capture of the workspace layout. Named user presets
 * live in `useLayoutPresetsStore`; this shape is what they store and what
 * `applyLayoutSnapshot` writes back into the live slice.
 */
export interface LayoutSnapshot {
  panels: Record<string, PanelState>;
  dockSizes: DockSizes;
}

export const LAYOUT_STORAGE_KEY = "workspace-layout:v1";

/**
 * Build the default `panels` map from the registry. Called on first load and
 * on `resetLayout()`. Exported for tests and for the persist merge step so
 * ids added after a user's last save show up with sensible defaults instead
 * of `undefined`.
 */
export function buildDefaultPanels(): Record<string, PanelState> {
  const out: Record<string, PanelState> = {};
  let order = 0;
  for (const p of PANELS) {
    out[p.id] = {
      open: p.defaultOpen,
      dock: p.defaultDock,
      minimized: false,
      order: order++,
    };
  }

  return out;
}

/**
 * Reset Tools/Rules to their canonical anchored positions. Only invoked by
 * `resetLayout()` and by first-time bootstrap (no persisted snapshot). Merge
 * of an existing persisted layout does NOT call this so user-customized
 * Tools/Rules positions, sizes, and floating rects survive reloads.
 */
function enforceDefaultWorkspaceAnchors(
  panels: Record<string, PanelState>,
): Record<string, PanelState> {
  const tools = panels.tools;
  const rules = panels.rules;

  return {
    ...panels,
    ...(tools
      ? {
          tools: {
            ...tools,
            open: true,
            dock: DockSlotType.Left,
            minimized: false,
            floatingRect: undefined,
          },
        }
      : null),
    ...(rules
      ? {
          rules: {
            ...rules,
            open: true,
            dock: DockSlotType.Right,
            minimized: false,
            floatingRect: undefined,
          },
        }
      : null),
  };
}

/**
 * Guard for reducer inputs. Emits `E_PANEL_UNKNOWN_ID` and returns `false`
 * when the id is not registered so the caller can early-return without
 * mutating state.
 */
function assertKnownPanel(id: string, caller: string): boolean {
  if (getPanel(id)) return true;
  reportError(
    ErrorSourceType.Manual,
    new Error(`E_PANEL_UNKNOWN_ID: ${caller} received unknown panelId '${id}'`),
    {
      code: "E_PANEL_UNKNOWN_ID",
      panelId: id,
      caller,
      knownIds: PANEL_IDS,
    },
  );

  return false;
}

/**
 * Wrap a `StateStorage` so a `setItem` rejection surfaces as
 * `E_LAYOUT_PERSIST_FAILED` instead of a silent swallow inside zustand
 * `persist`. The in-memory state stays consistent because zustand mutates
 * before it writes.
 */
export function makeObservableStorage(inner: StateStorage): StateStorage {
  return {
    getItem: (name) => inner.getItem(name),
    setItem: (name, value) => {
      try {
        const result = inner.setItem(name, value);

        return result;
      } catch (err) {
        reportError(ErrorSourceType.Manual, err, {
          code: "E_LAYOUT_PERSIST_FAILED",
          panelId: "*",
          reason: err instanceof Error ? err.name : "UnknownError",
          bytes: value.length,
          storageKey: name,
        });

        // Do not rethrow: zustand persist would otherwise crash the caller
        // for a non-critical UX write. The user is already notified via the
        // error bus toast.
        return undefined;
      }
    },
    removeItem: (name) => inner.removeItem(name),
  };
}

function browserStorage(): StateStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Pure reducer helpers. Each takes the current panels map and returns the
 * next one, so tests can call them directly without instantiating the store.
 */
export const layoutReducers = {
  toggle(panels: Record<string, PanelState>, id: string): Record<string, PanelState> {
    if (assertKnownPanel(id, "togglePanel") === false) return panels;
    const current = panels[id];

    return { ...panels, [id]: { ...current, open: !current.open } };
  },
  open(panels: Record<string, PanelState>, id: string): Record<string, PanelState> {
    if (assertKnownPanel(id, "openPanel") === false) return panels;
    const current = panels[id];

    return { ...panels, [id]: { ...current, open: true, minimized: false } };
  },
  close(panels: Record<string, PanelState>, id: string): Record<string, PanelState> {
    if (assertKnownPanel(id, "closePanel") === false) return panels;

    return { ...panels, [id]: { ...panels[id], open: false } };
  },
  dock(
    panels: Record<string, PanelState>,
    id: string,
    slot: DockSlotType,
  ): Record<string, PanelState> {
    if (assertKnownPanel(id, "dockPanel") === false) return panels;
    const next: PanelState = { ...panels[id], dock: slot };

    if (DockSlotType.isFloating(slot) === false) next.floatingRect = undefined;

    return { ...panels, [id]: next };
  },
  float(
    panels: Record<string, PanelState>,
    id: string,
    rect: FloatingRect,
  ): Record<string, PanelState> {
    if (assertKnownPanel(id, "floatPanel") === false) return panels;

    return { ...panels, [id]: { ...panels[id], dock: DockSlotType.Floating, floatingRect: rect } };
  },
  minimize(panels: Record<string, PanelState>, id: string): Record<string, PanelState> {
    if (assertKnownPanel(id, "minimizePanel") === false) return panels;

    return { ...panels, [id]: { ...panels[id], minimized: true } };
  },
  restore(panels: Record<string, PanelState>, id: string): Record<string, PanelState> {
    if (assertKnownPanel(id, "restorePanel") === false) return panels;

    return { ...panels, [id]: { ...panels[id], minimized: false, open: true } };
  },
  collapseOthers(panels: Record<string, PanelState>, keepId: string): Record<string, PanelState> {
    if (assertKnownPanel(keepId, "collapseOthers") === false) return panels;
    const next: Record<string, PanelState> = {};
    for (const [id, state] of Object.entries(panels)) {
      next[id] =
        id === keepId ? { ...state, open: true, minimized: false } : { ...state, minimized: true };
    }

    return next;
  },
  /**
   * Merge a persisted snapshot with defaults. Prunes ids that are not in the
   * registry (a panel got renamed/removed) and fills in ids added since the
   * snapshot. Emits `E_PANEL_UNKNOWN_ID` once per pruned id for observability.
   */
  merge(persisted: Record<string, unknown> | undefined): Record<string, PanelState> {
    const defaults = buildDefaultPanels();

    if (!persisted || typeof persisted !== "object") return defaults;
    const out = { ...defaults };
    for (const [id, value] of Object.entries(persisted)) {
      if (getPanel(id) === undefined) {
        reportError(
          ErrorSourceType.Manual,
          new Error(`E_PANEL_UNKNOWN_ID: pruning stale persisted panel '${id}'`),
          {
            code: "E_PANEL_UNKNOWN_ID",
            panelId: id,
            caller: "layout-slice.merge",
            knownIds: PANEL_IDS,
          },
        );
        continue;
      }

      if (value && typeof value === "object") {
        out[id] = { ...defaults[id], ...(value as Partial<PanelState>) };
      }
    }

    return out;
  },
};

const storage = browserStorage();

export const useWorkspaceLayoutStore = create<WorkspaceLayoutState>()(
  persist(
    (set) => ({
      panels: buildDefaultPanels(),
      dockSizes: { ...DEFAULT_DOCK_SIZES },
      togglePanel: (id) => set((s) => ({ panels: layoutReducers.toggle(s.panels, id) })),
      openPanel: (id) => set((s) => ({ panels: layoutReducers.open(s.panels, id) })),
      closePanel: (id) => set((s) => ({ panels: layoutReducers.close(s.panels, id) })),
      dockPanel: (id, slot) => set((s) => ({ panels: layoutReducers.dock(s.panels, id, slot) })),
      floatPanel: (id, rect) => set((s) => ({ panels: layoutReducers.float(s.panels, id, rect) })),
      minimizePanel: (id) => set((s) => ({ panels: layoutReducers.minimize(s.panels, id) })),
      restorePanel: (id) => set((s) => ({ panels: layoutReducers.restore(s.panels, id) })),
      collapseOthers: (id) => set((s) => ({ panels: layoutReducers.collapseOthers(s.panels, id) })),
      setDockSize: (slot, px) =>
        set((s) => ({ dockSizes: { ...s.dockSizes, [slot]: clampDockSize(slot, px) } })),
      resetLayout: () =>
        set({
          panels: enforceDefaultWorkspaceAnchors(buildDefaultPanels()),
          dockSizes: { ...DEFAULT_DOCK_SIZES },
        }),
      applyLayoutSnapshot: (snapshot) => {
        const mergedPanels = layoutReducers.merge(snapshot.panels as Record<string, unknown>);
        const s = snapshot.dockSizes ?? DEFAULT_DOCK_SIZES;
        set({
          panels: mergedPanels,
          dockSizes: {
            top: clampDockSize("top", s.top),
            left: clampDockSize("left", s.left),
            right: clampDockSize("right", s.right),
            bottom: clampDockSize("bottom", s.bottom),
          },
        });
      },
    }),
    {
      name: LAYOUT_STORAGE_KEY,
      // v2: tools panel default dock moved from "top" to "left". Bumping
      // the version discards persisted layouts that still had tools docked
      // to the top strip, so returning users see the new vertical layout.
      // v5: force canonical Tools-left and Rules-right docking, and clear
      // earlier floating or minimized states that made the editor look broken.
      // v6: stop overwriting user-customized Tools/Rules positions on merge;
      // custom dock, size, and floating-rect state now persists across
      // reloads. resetLayout() still restores canonical anchors on demand.
      // v7: lower the left Tools rail floor from a wide panel to a compact
      // 52px icon-only rail, clearing older oversized left-dock snapshots.
      // v8: make the left dock fixed at 52px so saved or dragged 90px
      // widths cannot return and create the empty gutter shown in screenshots.
      // v9: clear persisted section chrome and titlebar layout snapshots after
      // moving Properties actions out of nested inspector sections.
      version: 9,
      storage: storage ? createJSONStorage(() => makeObservableStorage(storage)) : undefined,
      // Merge prunes stale ids and back-fills defaults for new ones. It does
      // NOT re-anchor Tools/Rules: the user's saved dock, size, and floating
      // rect win. First-time users still get canonical anchors via the
      // initial state below.
      merge: (persistedState, currentState) => {
        const p = persistedState as
          | { panels?: Record<string, unknown>; dockSizes?: Partial<DockSizes> }
          | undefined;
        const hasPersistedPanels = !!p?.panels && Object.keys(p.panels).length > 0;
        const mergedSizes: DockSizes = {
          top: clampDockSize("top", p?.dockSizes?.top ?? DEFAULT_DOCK_SIZES.top),
          left: clampDockSize("left", p?.dockSizes?.left ?? DEFAULT_DOCK_SIZES.left),
          right: clampDockSize("right", p?.dockSizes?.right ?? DEFAULT_DOCK_SIZES.right),
          bottom: clampDockSize("bottom", p?.dockSizes?.bottom ?? DEFAULT_DOCK_SIZES.bottom),
        };
        const mergedPanels = layoutReducers.merge(p?.panels);

        return {
          ...currentState,
          panels: hasPersistedPanels ? mergedPanels : enforceDefaultWorkspaceAnchors(mergedPanels),
          dockSizes: mergedSizes,
        };
      },
      partialize: (state) => ({ panels: state.panels, dockSizes: state.dockSizes }),
    },
  ),
);
