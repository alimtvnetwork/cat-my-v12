/**
 * Plan 65 step 5 (SS-01): dockable panel registry.
 *
 * Single source of truth for every Photoshop-style panel the app can dock,
 * float, minimize, or open from the Window menu. The actual React component
 * for each panel is wired in later steps (SS-02 `PanelHost`, plan steps
 * 10-11); here we only declare identity + defaults + search terms so the
 * layout slice (`layout-slice.ts`), Window menu (SS-03), and search palette
 * can compile against a stable id union.
 *
 * Do NOT import React components here. Keeping this file component-free
 * lets the layout slice unit-test without JSX and prevents circular imports
 * between panels and the store.
 */

import { DockSlotType } from "@/lib/enums/ui";

export interface PanelDef {
  /** Stable id. Used as the persisted key. Never rename without a migration. */
  readonly id: string;
  /** Human-readable title shown in the panel title bar and Window menu. */
  readonly title: string;
  /** Where the panel lands on a fresh workspace. */
  readonly defaultDock: Exclude<DockSlotType, DockSlotType.Hidden>;
  /** Whether the panel is open on a fresh workspace. */
  readonly defaultOpen: boolean;
  /**
   * Preferred initial size (in px) when the panel is torn out of a dock
   * into a floating window, or when it opens as `defaultDock: "floating"`.
   * Missing entries fall back to the generic float defaults in PanelHost
   * (320x240). Sized to hug the panel's content so the floating chrome
   * does not leave a big empty area under the tool tiles / rule list.
   */
  readonly defaultFloatSize?: { readonly width: number; readonly height: number };
  /**
   * Keywords the Cmd/Ctrl+Shift+P search palette (SS-03) matches against.
   * Include the panel title, domain terms, and detector names that live
   * inside it. Keep lowercase.
   */
  readonly searchTerms: readonly string[];
}

export const PANELS: readonly PanelDef[] = [
  {
    id: "tools",
    title: "Tools",
    defaultDock: DockSlotType.Left,
    defaultOpen: true,
    // Tools ribbon is a single 36px icon column. Keep the
    // torn-out window snug against that content instead of the generic
    // 320x240 float that leaves a large blank area beneath the tiles.
    defaultFloatSize: { width: 72, height: 312 },
    searchTerms: [
      "tools",
      "toolbox",
      "roi",
      "rect",
      "ocr",
      "text",
      "math",
      "anchor",
      "blob",
      "color",
    ],
  },
  {
    id: "rules",
    title: "Rules",
    defaultDock: DockSlotType.Right,
    defaultOpen: true,
    defaultFloatSize: { width: 320, height: 460 },
    searchTerms: ["rules", "rule list", "layers list", "rule set", "ruleset"],
  },
  {
    id: "layers",
    title: "Layers",
    defaultDock: DockSlotType.Right,
    // Command 23 rule 7: Layers defaults CLOSED so the canvas breathes.
    defaultOpen: false,
    // Plan 75 step 10 (Issue 11): floating Layers window hugs the rule
    // rows so tearing it out does not leave a large blank area.
    defaultFloatSize: { width: 300, height: 420 },
    searchTerms: ["layers", "layer stack", "group", "merge"],
  },
  {
    id: "properties",
    title: "Properties",
    defaultDock: DockSlotType.Right,
    defaultOpen: false,
    // Plan 75 step 10 (Issue 11): Inspector / detector controls need a
    // taller default float to fit acceptance + mask + focus stacks.
    defaultFloatSize: { width: 420, height: 380 },
    searchTerms: [
      "properties",
      "inspector",
      "parameters",
      "acceptance criteria",
      "shaping mask",
      "blur",
    ],
  },
  {
    id: "detectors",
    title: "Detectors",
    defaultDock: DockSlotType.Right,
    defaultOpen: false,
    searchTerms: [
      "detectors",
      "circle detector",
      "pattern edge",
      "focus",
      "mask",
      "number",
      "reference asset",
    ],
  },
  {
    id: "preview",
    title: "Preview",
    defaultDock: DockSlotType.Right,
    defaultOpen: false,
    searchTerms: ["preview", "preview settings", "overlay"],
  },
  {
    id: "console",
    title: "Console",
    defaultDock: DockSlotType.Bottom,
    defaultOpen: false,
    searchTerms: ["console", "status log", "logs"],
  },
  {
    id: "history",
    title: "History",
    defaultDock: DockSlotType.Bottom,
    defaultOpen: false,
    searchTerms: ["history", "run history", "past runs"],
  },
  {
    id: "devices",
    title: "Devices",
    defaultDock: DockSlotType.Floating,
    defaultOpen: false,
    searchTerms: ["devices", "device discovery", "camera", "worker"],
  },
  {
    id: "settings",
    title: "Settings",
    defaultDock: DockSlotType.Floating,
    // Command 23 rule 7: Settings defaults CLOSED.
    defaultOpen: false,
    searchTerms: ["settings", "preferences", "options"],
  },
] as const;

/** Ordered list of every registered panel id (stable). */
export const PANEL_IDS: readonly string[] = PANELS.map((p) => p.id);

const PANEL_INDEX: ReadonlyMap<string, PanelDef> = new Map(PANELS.map((p) => [p.id, p]));

/**
 * Look up a panel by id. Returns undefined for unknown ids so callers can
 * decide whether to prune (reducers) or emit `E_PANEL_UNKNOWN_ID` (imperative
 * call sites like the Window menu).
 */
export function getPanel(id: string): PanelDef | undefined {
  return PANEL_INDEX.get(id);
}

export function isPanelId(id: string): boolean {
  return PANEL_INDEX.has(id);
}

/**
 * Plan 88 Steps 5 + 7: registry of right-rail panels (Preview / Layers /
 * Properties + the five Properties subsections) whose hide/close controls
 * were added via CollapsiblePanelSection. Kept here (not in WindowMenu)
 * so WindowMenu and WindowMenubarGroup share one list: a rail panel added
 * in one menu appears in the other, and neither menu can drift.
 */
export interface RailPanelItem {
  storageKey: string;
  title: string;
}

export const RAIL_PANELS: readonly RailPanelItem[] = [
  { storageKey: "inspector.main", title: "Inspector" },
  { storageKey: "properties.position", title: "Properties: Position" },
  { storageKey: "properties.size", title: "Properties: Size" },
  { storageKey: "properties.acceptance", title: "Properties: Acceptance" },
  { storageKey: "properties.mask", title: "Properties: Mask" },
  { storageKey: "properties.focus", title: "Properties: Focus" },
  { storageKey: "properties.kind", title: "Properties: Kind" },
];

/**
 * Window-menu visibility for a workspace panel. A panel counts as visible
 * only when it is open, not minimized, and not docked to the Hidden slot:
 * a Hidden-docked panel renders nowhere (stale persisted state is the
 * only path that produces one, since no UI action sets Hidden), so
 * showing it checked would lie about what the operator sees. Both Window
 * menus use this so their checkmarks cannot drift apart.
 */
export interface PanelVisibilityState {
  open: boolean;
  minimized: boolean;
  dock: DockSlotType;
}

export function isPanelVisible(state: PanelVisibilityState | undefined): boolean {
  if (state === undefined) {
    return false;
  }

  return state.open && !state.minimized && DockSlotType.isHidden(state.dock) === false;
}

/**
 * Palettes the Window menus offer as a bridge into the palette system
 * (spec 03 section 1.2 defect 1). Palette ids overlap workspace registry
 * titles but are distinct panels: workspace "tools" is the icon ribbon
 * while palette "Tools" is the rule-kind palette, and "userFunctions"
 * exists only in the palette store. Only the framed palettes are listed:
 * palette "layers" and "preview" have no PaletteFrame consumer, so a menu
 * entry for them would promise a visible effect that does not exist.
 * Ids are plain strings here on purpose (panel-registry stays free of a
 * runtime import of the palette store); menus cast to PaletteId when
 * calling restore/set, and the values must match PaletteIdType.
 */
export interface PaletteMenuItem {
  id: string;
  title: string;
}

export const PALETTE_MENU_ITEMS: readonly PaletteMenuItem[] = [
  { id: "tools", title: "Tools" },
  { id: "userFunctions", title: "User Functions" },
];
