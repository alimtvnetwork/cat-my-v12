import { ClientLogger } from "@/lib/observability/client-logger";
// UI preferences: user-toggleable chrome (status bar visibility, future
// rail visibility, etc). Persisted via localStorage so preferences survive
// reload. SSR-safe (guards window). Consumed by HmiShell and by View menu
// actions in TopMenuBar.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { StorageKey } from "@/lib/constants";
import { createFacadeStateStorage } from "@/lib/projects/facade";
import { subscribeFacadeWrites } from "@/lib/projects/broadcast";

export enum HeaderDensityType {
  Comfortable = "comfortable",
  Compact = "compact",
}
export type HeaderDensity = HeaderDensityType;
// App color-theme variant.
//   "dark"   : force the dark HMI palette (default; matches historical UI).
//   "light"  : force the light HMI palette. Chrome tokens (--ca-chrome,
//              --ca-panel, --ca-ink, ...) flip via a `.light` class on
//              <html>; shadcn tokens fall back to :root light values.
//   "system" : follow prefers-color-scheme. ThemeController watches the
//              media query and mirrors the resolved value onto <html>.
export enum ThemeVariantType {
  Light = "light",
  Dark = "dark",
  System = "system",
}
export type ThemeVariant = ThemeVariantType;

// App UI flavor.
//   "standard" : Standard UI design with classic aesthetics.
//   "modern"   : Modern dynamic UI design.
export enum UiFlavorType {
  Standard = "standard",
  Modern = "modern",
}
export type UiFlavor = UiFlavorType;
// Tools palette tooltip visibility mode.
//   "hover"     : Radix default. Tooltip shows on hover AND keyboard focus.
//   "on-demand" : Tooltip is suppressed on hover; it still shows on keyboard
//                 focus so keyboard / screen-reader users are not cut off.
//                 Useful for touch-first operators who find hover tooltips
//                 noisy and prefer tapping "View full guide" for details.
export enum ToolTooltipModeType {
  Hover = "hover",
  OnDemand = "on-demand",
}
export type ToolTooltipMode = ToolTooltipModeType;

// Default rotation snap step in degrees for on-canvas rotate handles.
// `0` = continuous (no snap). Per-rule params.rotationSnap overrides
// this default; Alt during a drag still forces continuous regardless.
// Kept as a number so future presets (e.g. 2.5°) work without a schema
// change. See `ROTATION_SNAP_PRESETS` in `@/lib/editor/rotation`.
export type RotationSnapStep = number;

// Plan 81 step 5: which Settings-hub groups are collapsed. Keyed by a
// short stable id ("deviceCapture" | "operatorRetention" today). A
// missing key = expanded (default), a `true` value = collapsed. Kept as
// a map so future groups can be added without a schema migration.
export enum SettingsGroupIdType {
  Devicecapture = "deviceCapture",
  Operatorretention = "operatorRetention",
  Datasource = "dataSource",
}
export type SettingsGroupId = SettingsGroupIdType;
export type SettingsGroupsCollapsed = Partial<Record<SettingsGroupId, boolean>>;

// Plan 100 Phase E step 42: which `/setup/rules` group sections are
// collapsed. Missing / false = expanded. Keyed by the section id so
// future groups (e.g. archived) can be added without a schema change.
export enum RulesGroupIdType {
  Categories = "categories",
  Rules = "rules",
}
export type RulesGroupId = RulesGroupIdType;
export type RulesGroupsCollapsed = Partial<Record<RulesGroupId, boolean>>;

// Plan 81 step 15: Properties palette layout + remembered open pane per
// rule kind. `mode` toggles the 24-px icon rail vs a vertical accordion
// where only one pane is open at a time. `openPaneByKind` remembers the
// last pane the operator chose for each rule kind so switching between
// a Category and a Rule editor keeps the palette contextual.
export enum PropertiesPaletteModeType {
  Rail = "rail",
  Accordion = "accordion",
  Tabs = "tabs",
}
export type PropertiesPaletteMode = PropertiesPaletteModeType;
export enum PropertiesPaneIdType {
  Info = "info",
  History = "history",
  Adjust = "adjust",
  Grid = "grid",
  Brush = "brush",
  Layers = "layers",
  Type = "type",
  Paragraph = "paragraph",
  Css = "css",
  Image = "image",
}
export type PropertiesPaneId = PropertiesPaneIdType;
// Plan 100 Phase E step 27: expand persistence key to include ROI kinds
// (C/R/K/S/E) in addition to the coarse rule/category route context.
// The palette prefers the actual selection kind when one is available,
// falling back to rule/category so unselected routes still remember a
// pane per editor context. Persisted `rule` and `category` values from
// prior versions continue to load without migration.
export enum PropertiesPaletteRuleKindType {
  Rule = "rule",
  Category = "category",
  C = "C",
  R = "R",
  K = "K",
  S = "S",
  E = "E",
}
export type PropertiesPaletteRuleKind = PropertiesPaletteRuleKindType;
export type PropertiesPaletteOpenPaneByKind = Partial<
  Record<PropertiesPaletteRuleKind, PropertiesPaneId>
>;

const PROPERTIES_PANES: readonly PropertiesPaneId[] = [
  PropertiesPaneIdType.Info,
  PropertiesPaneIdType.History,
  PropertiesPaneIdType.Adjust,
  PropertiesPaneIdType.Grid,
  PropertiesPaneIdType.Brush,
  PropertiesPaneIdType.Layers,
  PropertiesPaneIdType.Type,
  PropertiesPaneIdType.Paragraph,
  PropertiesPaneIdType.Css,
  PropertiesPaneIdType.Image,
];
function isPaneId(v: unknown): v is PropertiesPaneId {
  return typeof v === "string" && (PROPERTIES_PANES as readonly string[]).includes(v);
}

function isPaletteMode(v: unknown): v is PropertiesPaletteMode {
  return v === "rail" || v === "accordion" || v === "tabs";
}

function sanitizeOpenPaneByKind(v: unknown): PropertiesPaletteOpenPaneByKind {
  if (!v || typeof v !== "object") return {};
  const src = v as Record<string, unknown>;
  const out: PropertiesPaletteOpenPaneByKind = {};
  const keys: PropertiesPaletteRuleKind[] = [
    PropertiesPaletteRuleKindType.Rule,
    PropertiesPaletteRuleKindType.Category,
    PropertiesPaletteRuleKindType.C,
    PropertiesPaletteRuleKindType.R,
    PropertiesPaletteRuleKindType.K,
    PropertiesPaletteRuleKindType.S,
    PropertiesPaletteRuleKindType.E,
  ];
  for (const k of keys) {
    const v = src[k];

    if (isPaneId(v)) out[k] = v;
  }

  return out;
}

export interface UiPrefsState {
  showStatusBar: boolean;
  toggleStatusBar: () => void;
  setShowStatusBar: (next: boolean) => void;
  headerDensity: HeaderDensity;
  toggleHeaderDensity: () => void;
  setHeaderDensity: (next: HeaderDensity) => void;
  toolTooltipMode: ToolTooltipMode;
  setToolTooltipMode: (next: ToolTooltipMode) => void;
  toggleToolTooltipMode: () => void;
  // Plan 100 Phase I: when true, ROI preview overlays skip the
  // kind-specific `backdrop-filter` styling so the underlying image
  // stays pixel-crisp under the selection. Operators toggle it to
  // compare "sharpened" (no overlay filter) against the styled
  // preview. Default true (crisp).
  roiPreviewSharpen: boolean;
  toggleRoiPreviewSharpen: () => void;
  setRoiPreviewSharpen: (next: boolean) => void;
  rotationSnapDefault: RotationSnapStep;
  setRotationSnapDefault: (next: RotationSnapStep) => void;
  theme: ThemeVariant;
  setTheme: (next: ThemeVariant) => void;
  cycleTheme: () => void;
  uiFlavor: UiFlavor;
  setUiFlavor: (next: UiFlavor) => void;
  toggleUiFlavor: () => void;
  settingsGroupsCollapsed: SettingsGroupsCollapsed;
  toggleSettingsGroup: (id: SettingsGroupId) => void;
  setSettingsGroup: (id: SettingsGroupId, collapsed: boolean) => void;
  rulesGroupsCollapsed: RulesGroupsCollapsed;
  toggleRulesGroup: (id: RulesGroupId) => void;
  setRulesGroup: (id: RulesGroupId, collapsed: boolean) => void;
  propertiesPaletteMode: PropertiesPaletteMode;
  setPropertiesPaletteMode: (next: PropertiesPaletteMode) => void;
  togglePropertiesPaletteMode: () => void;
  propertiesPaletteOpenPaneByKind: PropertiesPaletteOpenPaneByKind;
  setPropertiesPaletteOpenPane: (kind: PropertiesPaletteRuleKind, pane: PropertiesPaneId) => void;
  hudFollowsShape: boolean;
  setHudFollowsShape: (next: boolean) => void;
  toggleHudFollowsShape: () => void;
  // When true, the floating properties HUD renders a small debug badge
  // showing whether its stored position is "shape"-anchored (offset
  // relative to the selection top-left) or "canvas"-anchored (absolute
  // canvas coords), or "default" (no persisted position). Useful when
  // verifying re-anchor behaviour on drag / preference flips.
  hudAnchorDebug: boolean;
  setHudAnchorDebug: (next: boolean) => void;
  toggleHudAnchorDebug: () => void;
}

// Plan 83 backlog item 9 (issue #33): when true (default), the floating
// properties HUD re-anchors to the selected shape's top-left as the shape
// moves, so the HUD follows the shape across drags. When false, the HUD
// stays pinned to canvas coordinates (legacy behaviour). Persisted via
// the same facade envelope as the other ui prefs.

function isDensity(value: unknown): value is HeaderDensity {
  return value === "comfortable" || value === "compact";
}

function isTooltipMode(value: unknown): value is ToolTooltipMode {
  return value === "hover" || value === "on-demand";
}

function isTheme(value: unknown): value is ThemeVariant {
  return value === "light" || value === "dark" || value === "system";
}

function isUiFlavor(value: unknown): value is UiFlavor {
  return value === "standard" || value === "modern";
}

function sanitizeGroups(value: unknown): SettingsGroupsCollapsed {
  if (!value || typeof value !== "object") return {};
  const src = value as Record<string, unknown>;
  const out: SettingsGroupsCollapsed = {};

  if (typeof src.deviceCapture === "boolean") out.deviceCapture = src.deviceCapture;

  if (typeof src.operatorRetention === "boolean") out.operatorRetention = src.operatorRetention;

  return out;
}

function sanitizeRulesGroups(value: unknown): RulesGroupsCollapsed {
  if (!value || typeof value !== "object") return {};
  const src = value as Record<string, unknown>;
  const out: RulesGroupsCollapsed = {};

  if (typeof src.categories === "boolean") out.categories = src.categories;

  if (typeof src.rules === "boolean") out.rules = src.rules;

  return out;
}

// Plan 80 step 31: route persistence through the SDK facade (spec 21/52).
// `createFacadeStateStorage` also one-shot migrates the legacy raw
// `ca.uiPrefs.v1` localStorage payload into IndexedDB. Zustand's persist
// envelope differs from that legacy shape, so `merge` below tolerates
// both: a legacy `{ showStatusBar, headerDensity, toolTooltipMode }`
// object and the current `{ state: {...}, version }` envelope.
export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set, get) => ({
      showStatusBar: false,
      headerDensity: "comfortable" as HeaderDensity,
      toolTooltipMode: "hover" as ToolTooltipMode,
      roiPreviewSharpen: true,
      rotationSnapDefault: 15 as RotationSnapStep,
      theme: "dark" as ThemeVariant,
      uiFlavor: "standard" as UiFlavor,
      settingsGroupsCollapsed: {} as SettingsGroupsCollapsed,
      rulesGroupsCollapsed: {} as RulesGroupsCollapsed,
      propertiesPaletteMode: PropertiesPaletteModeType.Rail as PropertiesPaletteMode,
      propertiesPaletteOpenPaneByKind: {} as PropertiesPaletteOpenPaneByKind,
      hudFollowsShape: true,
      hudAnchorDebug: false,

      toggleStatusBar: () => set({ showStatusBar: !get().showStatusBar }),
      setShowStatusBar: (next) => set({ showStatusBar: next }),
      toggleHeaderDensity: () => {
        const next: HeaderDensity =
          get().headerDensity === HeaderDensityType.Comfortable
            ? HeaderDensityType.Compact
            : HeaderDensityType.Comfortable;
        set({ headerDensity: next });
        ClientLogger.info("[ui-prefs] header density toggled", { density: next });
      },
      setHeaderDensity: (next) => set({ headerDensity: next }),
      setToolTooltipMode: (next) => {
        set({ toolTooltipMode: next });
        ClientLogger.info("[ui-prefs] tool tooltip mode set", { mode: next });
      },
      toggleToolTooltipMode: () => {
        const next: ToolTooltipMode =
          get().toolTooltipMode === ToolTooltipModeType.Hover
            ? ToolTooltipModeType.OnDemand
            : ToolTooltipModeType.Hover;
        set({ toolTooltipMode: next });
        ClientLogger.info("[ui-prefs] tool tooltip mode toggled", { mode: next });
      },
      toggleRoiPreviewSharpen: () => {
        const next = !get().roiPreviewSharpen;
        set({ roiPreviewSharpen: next });
        ClientLogger.info("[ui-prefs] roi preview sharpen toggled", { sharpen: next });
      },
      setRoiPreviewSharpen: (next) => set({ roiPreviewSharpen: next }),
      setRotationSnapDefault: (next) => {
        const safe = Number.isFinite(next) && next >= 0 ? next : 0;
        set({ rotationSnapDefault: safe });
        ClientLogger.info("[ui-prefs] rotation snap default set", { snap: safe });
      },
      setTheme: (next) => {
        set({ theme: next });
        ClientLogger.info("[ui-prefs] theme set", { theme: next });
      },
      cycleTheme: () => {
        const order: ThemeVariant[] = [
          ThemeVariantType.Dark,
          ThemeVariantType.Light,
          ThemeVariantType.System,
        ];
        const idx = order.indexOf(get().theme);
        const next = order[(idx + 1) % order.length];
        set({ theme: next });
        ClientLogger.info("[ui-prefs] theme cycled", { theme: next });
      },
      setUiFlavor: (next) => {
        set({ uiFlavor: next });
        ClientLogger.info("[ui-prefs] ui flavor set", { flavor: next });
      },
      toggleUiFlavor: () => {
        const next: UiFlavor =
          get().uiFlavor === UiFlavorType.Standard ? UiFlavorType.Modern : UiFlavorType.Standard;
        set({ uiFlavor: next });
        ClientLogger.info("[ui-prefs] ui flavor toggled", { flavor: next });
      },
      toggleSettingsGroup: (id) => {
        const cur = get().settingsGroupsCollapsed;
        const next: SettingsGroupsCollapsed = { ...cur, [id]: !cur[id] };
        set({ settingsGroupsCollapsed: next });
        ClientLogger.info("[ui-prefs] settings group toggled", { id, collapsed: next[id] });
      },
      setSettingsGroup: (id, collapsed) => {
        const cur = get().settingsGroupsCollapsed;
        set({ settingsGroupsCollapsed: { ...cur, [id]: collapsed } });
      },
      toggleRulesGroup: (id) => {
        const cur = get().rulesGroupsCollapsed;
        const next: RulesGroupsCollapsed = { ...cur, [id]: !cur[id] };
        set({ rulesGroupsCollapsed: next });
        ClientLogger.info("[ui-prefs] rules group toggled", { id, collapsed: next[id] });
      },
      setRulesGroup: (id, collapsed) => {
        const cur = get().rulesGroupsCollapsed;
        set({ rulesGroupsCollapsed: { ...cur, [id]: collapsed } });
      },
      setPropertiesPaletteMode: (next) => {
        set({ propertiesPaletteMode: next });
        ClientLogger.info("[ui-prefs] properties palette mode set", { mode: next });
      },
      togglePropertiesPaletteMode: () => {
        // Plan 86: cycle rail -> accordion -> tabs -> rail so operators
        // can reach the compact tabbed inspector with the same toggle.
        const cur = get().propertiesPaletteMode;
        const next: PropertiesPaletteMode =
          cur === PropertiesPaletteModeType.Rail
            ? PropertiesPaletteModeType.Accordion
            : cur === PropertiesPaletteModeType.Accordion
              ? PropertiesPaletteModeType.Tabs
              : PropertiesPaletteModeType.Rail;
        set({ propertiesPaletteMode: next });
        ClientLogger.info("[ui-prefs] properties palette mode toggled", { mode: next });
      },
      setPropertiesPaletteOpenPane: (kind, pane) => {
        const cur = get().propertiesPaletteOpenPaneByKind;
        set({ propertiesPaletteOpenPaneByKind: { ...cur, [kind]: pane } });
      },
      setHudFollowsShape: (next) => {
        set({ hudFollowsShape: next });
        ClientLogger.info("[ui-prefs] hud follows shape set", { follow: next });
      },
      toggleHudFollowsShape: () => {
        const next = !get().hudFollowsShape;
        set({ hudFollowsShape: next });
        ClientLogger.info("[ui-prefs] hud follows shape toggled", { follow: next });
      },
      setHudAnchorDebug: (next) => {
        set({ hudAnchorDebug: next });
        ClientLogger.info("[ui-prefs] hud anchor debug set", { on: next });
      },
      toggleHudAnchorDebug: () => {
        const next = !get().hudAnchorDebug;
        set({ hudAnchorDebug: next });
        ClientLogger.info("[ui-prefs] hud anchor debug toggled", { on: next });
      },
    }),
    {
      name: StorageKey.UiPrefs,
      storage: createJSONStorage(() => createFacadeStateStorage()),
      partialize: (s) => ({
        showStatusBar: s.showStatusBar,
        headerDensity: s.headerDensity,
        toolTooltipMode: s.toolTooltipMode,
        roiPreviewSharpen: s.roiPreviewSharpen,
        rotationSnapDefault: s.rotationSnapDefault,
        theme: s.theme,
        uiFlavor: s.uiFlavor,
        settingsGroupsCollapsed: s.settingsGroupsCollapsed,
        rulesGroupsCollapsed: s.rulesGroupsCollapsed,
        propertiesPaletteMode: s.propertiesPaletteMode,
        propertiesPaletteOpenPaneByKind: s.propertiesPaletteOpenPaneByKind,
        hudFollowsShape: s.hudFollowsShape,
        hudAnchorDebug: s.hudAnchorDebug,
      }),
      merge: (persisted, current) => {
        const src = (persisted ?? {}) as Record<string, unknown>;

        return {
          ...current,
          showStatusBar:
            typeof src.showStatusBar === "boolean" ? src.showStatusBar : current.showStatusBar,
          headerDensity: isDensity(src.headerDensity) ? src.headerDensity : current.headerDensity,
          toolTooltipMode: isTooltipMode(src.toolTooltipMode)
            ? src.toolTooltipMode
            : current.toolTooltipMode,
          roiPreviewSharpen:
            typeof src.roiPreviewSharpen === "boolean"
              ? src.roiPreviewSharpen
              : current.roiPreviewSharpen,
          rotationSnapDefault:
            typeof src.rotationSnapDefault === "number" &&
            Number.isFinite(src.rotationSnapDefault) &&
            src.rotationSnapDefault >= 0
              ? src.rotationSnapDefault
              : current.rotationSnapDefault,
          theme: isTheme(src.theme) ? src.theme : current.theme,
          uiFlavor: isUiFlavor(src.uiFlavor) ? src.uiFlavor : current.uiFlavor,
          settingsGroupsCollapsed: sanitizeGroups(src.settingsGroupsCollapsed),
          rulesGroupsCollapsed: sanitizeRulesGroups(src.rulesGroupsCollapsed),
          propertiesPaletteMode: isPaletteMode(src.propertiesPaletteMode)
            ? src.propertiesPaletteMode
            : current.propertiesPaletteMode,
          propertiesPaletteOpenPaneByKind: sanitizeOpenPaneByKind(
            src.propertiesPaletteOpenPaneByKind,
          ),
          hudFollowsShape:
            typeof src.hudFollowsShape === "boolean"
              ? src.hudFollowsShape
              : current.hudFollowsShape,
          hudAnchorDebug:
            typeof src.hudAnchorDebug === "boolean" ? src.hudAnchorDebug : current.hudAnchorDebug,
        };
      },
    },
  ),
);

// Plan 80 step 38: cross-tab sync. Another tab writing to
// `StorageKey.UiPrefs` broadcasts a facade write message; we rehydrate
// from the facade so the two tabs converge on the same status-bar,
// density, and tooltip-mode settings.
if (typeof window !== "undefined") {
  subscribeFacadeWrites((msg) => {
    if (msg.name !== StorageKey.UiPrefs) return;
    ClientLogger.info("[ui-prefs] cross-tab facade write, rehydrating", msg);
    void useUiPrefsStore.persist.rehydrate();
  });
}
