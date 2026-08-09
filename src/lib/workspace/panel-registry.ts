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
