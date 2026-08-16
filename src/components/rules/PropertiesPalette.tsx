export enum PropertiesPaletteModeType {
  Rail = "rail",
  Accordion = "accordion",
  Tabs = "tabs",
}
export enum ModeToggleTilePropsModeType {
  Rail = "rail",
  Accordion = "accordion",
  Tabs = "tabs",
}

export enum PropertyPaletteIdType {
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
import { PropertiesPaneIdType } from "@/lib/stores/ui-prefs-store";
// Plan 79 step 30 / Plan 80 step 16. V4 Properties palette shell.
//
// Root cause the split fixes, in one sentence: all 10 palette panes were
// declared inline in this file (700+ lines), making them hard to test in
// isolation and forcing every pane change to touch the shell. Step 16
// extracts each pane into `./properties/*Pane.tsx` so this file only owns
// the icon rail, active-palette state, and pane dispatch.
//
// Behavior unchanged: fixed 24 px right rail, 10 palettes in the spec's
// order (Info, History, Adjust, Grid, Brush, Layers, Type, Paragraph,
// CSS, Image), radiogroup semantics, rich Radix tooltips.

import { useEffect, useRef, useState } from "react";
import { MousePointer2 } from "lucide-react";
import {
  AlignLeft,
  Brush,
  ChevronDown,
  FileCode2,
  Grid3x3,
  History,
  Image as ImageIcon,
  Info,
  Layers,
  PanelRight,
  Rows3,
  SlidersHorizontal,
  Type,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { logger } from "@/lib/editor/errors";
import { useSelectedRules } from "@/lib/editor/selection/useSelectedRules";
import { isPaletteApplicable, fallbackPaletteFor } from "@/lib/editor/selection/palette-kind-map";
import {
  useUiPrefsStore,
  PropertiesPaletteRuleKindType,
  type PropertiesPaletteRuleKind,
} from "@/lib/stores/ui-prefs-store";
import { InfoPane } from "./properties/InfoPane";
import { HistoryPane } from "./properties/HistoryPane";
import { AdjustPane } from "./properties/AdjustPane";
import { GridPane } from "./properties/GridPane";
import { SwatchesPane } from "./properties/SwatchesPane";
import { LayersShortcutPane } from "./properties/LayersShortcutPane";
import { TypePane } from "./properties/TypePane";
import { ParagraphPane } from "./properties/ParagraphPane";
import { CssPane } from "./properties/CssPane";
import { ImagePane } from "./properties/ImagePane";

interface PaletteEntry {
  id: PropertyPaletteIdType;
  label: string;
  hint: string;
  Icon: typeof Info;
}

const PALETTES: readonly PaletteEntry[] = [
  {
    id: PropertyPaletteIdType.Info,
    label: "Info",
    hint: "ROI position, size, rotation, and pocket assignment.",
    Icon: Info,
  },
  {
    id: PropertyPaletteIdType.History,
    label: "History",
    hint: "Undo / redo stack for the rule editor session.",
    Icon: History,
  },
  {
    id: PropertyPaletteIdType.Adjust,
    label: "Adjustments",
    hint: "Threshold, contrast, gain, and other numeric knobs.",
    Icon: SlidersHorizontal,
  },
  {
    id: PropertyPaletteIdType.Grid,
    label: "Grid & guides",
    hint: "Snap, grid density, guide lines.",
    Icon: Grid3x3,
  },
  {
    id: PropertyPaletteIdType.Brush,
    label: "Brush & swatches",
    hint: "Stroke width, dash, saved colors for freehand shapes.",
    Icon: Brush,
  },
  {
    id: PropertyPaletteIdType.Layers,
    label: "Layers shortcut",
    hint: "Jump to the Layers palette at the bottom.",
    Icon: Layers,
  },
  {
    id: PropertyPaletteIdType.Type,
    label: "Type",
    hint: "Font, size, weight for OCR / text overlays.",
    Icon: Type,
  },
  {
    id: PropertyPaletteIdType.Paragraph,
    label: "Paragraph",
    hint: "Alignment and line-height for text overlays.",
    Icon: AlignLeft,
  },
  {
    id: PropertyPaletteIdType.Css,
    label: "CSS",
    hint: "Raw JSON view of the current ROI for power users.",
    Icon: FileCode2,
  },
  {
    id: PropertyPaletteIdType.Image,
    label: "Image",
    hint: "Reference image adjustments (rotate, mirror, crop).",
    Icon: ImageIcon,
  },
];

interface Props {
  active?: PropertyPaletteIdType;
  onChange?: (id: PropertyPaletteIdType) => void;
  /** Optional context for per-kind pane persistence (accordion mode). */
  ruleKind?: PropertiesPaletteRuleKind;
}

export function PropertiesPalette({ active, onChange, ruleKind }: Props) {
  const mode = useUiPrefsStore(
    (s) => s.propertiesPaletteMode as unknown as PropertiesPaletteModeType,
  );
  const toggleMode = useUiPrefsStore((s) => s.togglePropertiesPaletteMode);
  const openByKind = useUiPrefsStore((s) => s.propertiesPaletteOpenPaneByKind);
  const setOpenPane = useUiPrefsStore((s) => s.setPropertiesPaletteOpenPane);
  // Plan 100 Phase E step 27: prefer the selection's shared ROI kind
  // (C/R/K/S/E) as the persistence key so switching between a rectangle
  // and a circle re-hydrates the pane the user last opened FOR THAT kind,
  // not just the route (rule vs category). Falls back to the route-level
  // key when no selection or a mixed selection is active.
  const selectionForKey = useSelectedRules();
  const kindKey: PropertiesPaletteRuleKind =
    (selectionForKey.sharedKind as PropertiesPaletteRuleKind | null) ??
    ruleKind ??
    PropertiesPaletteRuleKindType.Rule;
  const remembered = openByKind[kindKey];
  const [internal, setInternal] = useState<PropertyPaletteIdType>(
    (remembered as PropertyPaletteIdType | undefined) ?? PropertyPaletteIdType.Info,
  );
  const activeId = (active ?? remembered ?? internal) as PropertyPaletteIdType;
  const activeEntry = PALETTES.find((p) => p.id === activeId) ?? PALETTES[0];

  // Plan 100 Phase E step 23: selection bridge. When the canvas selection
  // transitions from empty to non-empty, auto-focus the Info pane so the
  // user sees the ROI's position, size, and kind immediately. We only
  // fire on the 0->N edge to avoid overriding an explicit pane choice
  // once the user is actively selecting shapes.
  const selection = selectionForKey;
  const prevSelectionCountRef = useRef<number>(selection.ids.length);
  useEffect(() => {
    const prev = prevSelectionCountRef.current;
    const next = selection.ids.length;
    prevSelectionCountRef.current = next;

    if (prev === 0 && next > 0 && activeId !== PropertyPaletteIdType.Info) {
      logger.info("I_UI_PROPERTIES_PALETTE_AUTO_INFO", {
        selectedCount: next,
        priorPalette: activeId,
      });
      setOpenPane(kindKey, PropertiesPaneIdType.Info);

      if (onChange) onChange(PropertyPaletteIdType.Info);
      else setInternal(PropertyPaletteIdType.Info);
    }
    // activeId intentionally omitted: we only react to selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.ids]);

  // Plan 100 Phase E step 25: kind-aware routing. When a single-kind
  // selection makes the current pane inapplicable (e.g. `grid` while a
  // Circle-style ROI is selected), fall back to the always-applicable
  // `info` pane so the palette body never renders a dead surface.
  const isNonIsPaletteApplicableactiveIdselectionsharedKind =
    isPaletteApplicable(activeId, selection.sharedKind) === false;

  useEffect(() => {
    if (isNonIsPaletteApplicableactiveIdselectionsharedKind) {
      const target = fallbackPaletteFor(selection.sharedKind);
      logger.info("I_UI_PROPERTIES_PALETTE_KIND_FALLBACK", {
        from: activeId,
        to: target,
        sharedKind: selection.sharedKind,
      });
      setOpenPane(kindKey, target as unknown as PropertiesPaneIdType);

      if (onChange) onChange(target);
      else setInternal(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.sharedKind, activeId]);

  const select = (id: PropertyPaletteIdType) => {
    if (isPaletteApplicable(id, selection.sharedKind) === false) {
      logger.info("I_UI_PROPERTIES_PALETTE_SELECT_BLOCKED", {
        palette: id,
        sharedKind: selection.sharedKind,
      });

      return;
    }

    logger.info("I_UI_PROPERTIES_PALETTE_SELECT", { palette: id });
    setOpenPane(kindKey, id as unknown as PropertiesPaneIdType);

    if (onChange) onChange(id);
    else setInternal(id);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        aria-label="Rule properties"
        data-testid="properties-palette"
        data-mode={mode}
        className="flex min-h-0 flex-row-reverse border-l border-ca-border bg-ca-panel"
      >
        {mode === PropertiesPaletteModeType.Accordion ? (
          <AccordionBody
            activeId={activeId}
            onSelect={select}
            onToggleMode={toggleMode}
            sharedKind={selection.sharedKind}
          />
        ) : mode === PropertiesPaletteModeType.Tabs ? (
          <TabbedBody
            activeId={activeId}
            onSelect={select}
            onToggleMode={toggleMode}
            sharedKind={selection.sharedKind}
          />
        ) : (
          <RailBody
            activeId={activeId}
            activeEntry={activeEntry}
            onSelect={select}
            onToggleMode={toggleMode}
            sharedKind={selection.sharedKind}
          />
        )}
      </aside>
    </TooltipProvider>
  );
}

interface RailBodyProps {
  activeId: PropertyPaletteIdType;
  activeEntry: PaletteEntry;
  onSelect: (id: PropertyPaletteIdType) => void;
  onToggleMode: () => void;
  sharedKind: import("@/lib/editor/types").EditorRule["kind"] | null;
}

function RailBody({ activeId, activeEntry, onSelect, onToggleMode, sharedKind }: RailBodyProps) {
  return (
    <>
      <div
        role="radiogroup"
        aria-label="Properties palettes"
        data-testid="properties-palette-rail"
        className="flex w-[24px] shrink-0 flex-col gap-[2px] border-l border-ca-border bg-ca-panel-2 py-hmi-1"
      >
        {PALETTES.map((entry) => (
          <RailTile
            key={entry.id}
            entry={entry}
            active={entry.id === activeId}
            disabled={isPaletteApplicable(entry.id, sharedKind) === false}
            onSelect={() => onSelect(entry.id)}
          />
        ))}
        <ModeToggleTile mode={ModeToggleTilePropsModeType.Rail} onToggle={onToggleMode} />
      </div>
      <div
        data-testid="properties-palette-body"
        data-active-palette={activeId}
        className="flex min-h-0 w-[212px] flex-col gap-hmi-1 overflow-y-auto px-hmi-2 py-hmi-2"
      >
        <header className="flex items-center gap-hmi-2">
          <activeEntry.Icon
            size={14}
            strokeWidth={1.75}
            className="text-ca-ink-muted"
            aria-hidden
          />
          <h3 className="text-[12px] font-semibold tabular-nums text-ca-ink">
            {activeEntry.label}
          </h3>
        </header>
        <p className="text-[11px] leading-snug text-ca-ink-muted">{activeEntry.hint}</p>
        <PaletteBody id={activeId} />
      </div>
    </>
  );
}

interface AccordionBodyProps {
  activeId: PropertyPaletteIdType;
  onSelect: (id: PropertyPaletteIdType) => void;
  onToggleMode: () => void;
  sharedKind: import("@/lib/editor/types").EditorRule["kind"] | null;
}

function AccordionBody({ activeId, onSelect, onToggleMode, sharedKind }: AccordionBodyProps) {
  return (
    <div
      data-testid="properties-palette-accordion"
      data-active-palette={activeId}
      className="flex min-h-0 w-[236px] flex-col border-l border-ca-border bg-ca-panel"
    >
      <div className="flex items-center justify-between border-b border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-1 text-[11px] uppercase tracking-wide text-ca-ink-muted">
        <span className="truncate">Properties</span>
        <ModeToggleTile mode={ModeToggleTilePropsModeType.Accordion} onToggle={onToggleMode} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {PALETTES.map((entry) => {
          const isOpen = entry.id === activeId;
          const disabled = isPaletteApplicable(entry.id, sharedKind) === false;
          const Icon = entry.Icon;

          return (
            <section
              key={entry.id}
              data-testid={`properties-palette-accordion-item-${entry.id}`}
              data-open={isOpen ? "true" : "false"}
              data-disabled={disabled ? "true" : "false"}
              className="border-b border-ca-border"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-disabled={disabled}
                onClick={() => {
                  if (!disabled) onSelect(entry.id);
                }}
                className={[
                  "flex w-full items-center gap-hmi-1 px-hmi-2 py-hmi-1 text-left text-[12px] font-semibold transition-colors",
                  disabled
                    ? "cursor-not-allowed text-ca-ink-muted/60"
                    : "text-ca-ink hover:bg-ca-panel-2",
                ].join(" ")}
              >
                <Icon size={12} strokeWidth={1.75} className="text-ca-ink-muted" aria-hidden />
                <span className="flex-1 truncate">{entry.label}</span>
                <ChevronDown
                  size={12}
                  aria-hidden
                  className={`text-ca-ink-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen ? (
                <div className="flex flex-col gap-hmi-1 border-t border-ca-border bg-ca-panel px-hmi-2 py-hmi-2">
                  <p className="text-[11px] leading-snug text-ca-ink-muted">{entry.hint}</p>
                  <PaletteBody id={entry.id} />
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface ModeToggleTileProps {
  mode: ModeToggleTilePropsModeType;
  onToggle: () => void;
}

function ModeToggleTile({ mode, onToggle }: ModeToggleTileProps) {
  const nextLabel =
    mode === "rail"
      ? "Switch to accordion layout"
      : mode === "accordion"
        ? "Switch to compact tabbed inspector"
        : "Switch to icon rail";
  const Icon = mode === "rail" ? Rows3 : mode === "accordion" ? PanelRight : Rows3;
  const base =
    "flex items-center justify-center rounded-[3px] border text-ca-ink-muted transition hover:border-ca-border hover:bg-ca-panel-2 hover:text-ca-ink";
  const size = mode === "rail" ? "mx-auto mt-hmi-2 h-[20px] w-[20px]" : "h-[18px] w-[18px]";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-testid="properties-palette-mode-toggle"
          data-current-mode={mode}
          aria-label={nextLabel}
          onClick={onToggle}
          className={`${base} ${size} border-transparent`}
        >
          <Icon size={12} strokeWidth={1.75} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        sideOffset={10}
        className="z-50 max-w-[220px] text-left leading-snug"
      >
        <div className="text-[13px] font-semibold tracking-tight">{nextLabel}</div>
      </TooltipContent>
    </Tooltip>
  );
}

// Plan 86: compact tabbed inspector. Groups the 10 panes into three
// top-level tabs (Transform, Style, Rules) so operators can reach a
// palette with one click on the tab strip plus one click on the
// sub-pane chip, instead of scanning the full vertical rail.
export enum InspectorTabIdType {
  Transform = "transform",
  Style = "style",
  Rules = "rules",
}
export type InspectorTabId = InspectorTabIdType;
interface InspectorTab {
  id: InspectorTabId;
  label: string;
  panes: readonly PropertyPaletteIdType[];
}

const INSPECTOR_TABS: readonly InspectorTab[] = [
  {
    id: InspectorTabIdType.Transform,
    label: "Transform",
    panes: [PropertyPaletteIdType.Info, PropertyPaletteIdType.Grid, PropertyPaletteIdType.Image],
  },
  {
    id: InspectorTabIdType.Style,
    label: "Style",
    panes: [
      PropertyPaletteIdType.Adjust,
      PropertyPaletteIdType.Brush,
      PropertyPaletteIdType.Type,
      PropertyPaletteIdType.Paragraph,
    ],
  },
  {
    id: InspectorTabIdType.Rules,
    label: "Rules",
    panes: [PropertyPaletteIdType.History, PropertyPaletteIdType.Css, PropertyPaletteIdType.Layers],
  },
];

function tabForPane(id: PropertyPaletteIdType): InspectorTabId {
  for (const tab of INSPECTOR_TABS) {
    if (tab.panes.includes(id)) return tab.id;
  }

  return InspectorTabIdType.Transform;
}

interface TabbedBodyProps {
  activeId: PropertyPaletteIdType;
  onSelect: (id: PropertyPaletteIdType) => void;
  onToggleMode: () => void;
  sharedKind: import("@/lib/editor/types").EditorRule["kind"] | null;
}

function TabbedBody({ activeId, onSelect, onToggleMode, sharedKind }: TabbedBodyProps) {
  const [activeTab, setActiveTab] = useState<InspectorTabId>(() => tabForPane(activeId));
  useEffect(() => {
    setActiveTab(tabForPane(activeId));
  }, [activeId]);
  const currentTab = INSPECTOR_TABS.find((t) => t.id === activeTab) ?? INSPECTOR_TABS[0];
  const activeEntry = PALETTES.find((p) => p.id === activeId) ?? PALETTES[0];

  return (
    <div
      data-testid="properties-palette-tabs"
      data-active-tab={activeTab}
      data-active-palette={activeId}
      className="flex min-h-0 w-[236px] flex-col border-l border-ca-border bg-ca-panel"
    >
      <div className="flex items-center justify-between border-b border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-[11px] uppercase tracking-wide text-ca-ink-muted">
        <span className="truncate">Inspector</span>
        <ModeToggleTile mode={ModeToggleTilePropsModeType.Tabs} onToggle={onToggleMode} />
      </div>
      <div
        role="tablist"
        aria-label="Inspector tabs"
        className="flex shrink-0 border-b border-ca-border bg-ca-panel-2"
      >
        {INSPECTOR_TABS.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-testid={`properties-palette-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "flex-1 border-b-2 px-hmi-1 py-hmi-1 text-[11px] font-semibold transition-colors",
                isActive
                  ? "border-ca-select text-ca-ink"
                  : "border-transparent text-ca-ink-muted hover:text-ca-ink",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        aria-label={`${currentTab.label} panes`}
        className="flex flex-wrap gap-hmi-1 border-b border-ca-border px-hmi-2 py-hmi-1"
      >
        {currentTab.panes.map((paneId) => {
          const entry = PALETTES.find((p) => p.id === paneId);

          if (!entry) return null;
          const disabled = isPaletteApplicable(paneId, sharedKind) === false;
          const isActive = paneId === activeId;
          const Icon = entry.Icon;

          return (
            <button
              key={paneId}
              type="button"
              aria-pressed={isActive}
              aria-disabled={disabled}
              data-testid={`properties-palette-tab-pane-${paneId}`}
              onClick={() => {
                if (!disabled) onSelect(paneId);
              }}
              className={[
                "inline-flex items-center gap-hmi-1 rounded-[3px] border px-hmi-1 py-[2px] text-[11px] transition",
                disabled
                  ? "cursor-not-allowed border-transparent text-ca-ink-muted/50"
                  : isActive
                    ? "border-ca-select bg-ca-panel text-ca-select"
                    : "border-transparent text-ca-ink-muted hover:border-ca-border hover:bg-ca-panel-2 hover:text-ca-ink",
              ].join(" ")}
            >
              <Icon size={11} strokeWidth={1.75} aria-hidden />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-hmi-1 overflow-y-auto px-hmi-2 py-hmi-2">
        <p className="text-[11px] leading-snug text-ca-ink-muted">{activeEntry.hint}</p>
        <PaletteBody id={activeId} />
      </div>
    </div>
  );
}

function PaletteBody({ id }: { id: PropertyPaletteIdType }) {
  switch (id) {
    case "info":
      return <InfoPane />;
    case "history":
      return <HistoryPane />;
    case "adjust":
      return <AdjustPane />;
    case "grid":
      return <GridPane />;
    case "brush":
      return <SwatchesPane />;
    case "layers":
      return <LayersShortcutPane />;
    case "type":
      return <TypePane />;
    case "paragraph":
      return <ParagraphPane />;
    case "css":
      return <CssPane />;
    case "image":
      return <ImagePane />;
    default:
      return null;
  }
}

/**
 * Plan 100 Phase E step 45: single, discoverable empty-state placeholder
 * shown by any pane whose primary data source is the current ROI
 * selection. Consolidates copy + icon so panes stop each rendering their
 * own inconsistent hint (previously the palette body looked "dead" when
 * nothing was selected). Logging is intentionally at the consumer side:
 * a pane that renders this without a selection is expected behaviour,
 * not an error, so no log fires here.
 */
export function PalettePlaceholder({ hint }: { hint?: string }) {
  return (
    <div
      data-testid="properties-palette-empty"
      className="flex flex-col items-start gap-hmi-1 rounded-sm border border-dashed border-ca-border bg-ca-panel-2/40 px-hmi-2 py-hmi-2 text-[12px] leading-snug text-ca-ink-muted"
    >
      <div className="flex items-center gap-hmi-1 text-ca-ink">
        <MousePointer2 size={12} strokeWidth={1.75} aria-hidden />
        <span className="font-semibold">No ROI selected</span>
      </div>
      <p>
        {hint ??
          "Click a shape on the canvas or a layer in the Layers panel to see its properties here."}
      </p>
    </div>
  );
}

interface RailTileProps {
  entry: PaletteEntry;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

function RailTile({ entry, active, disabled, onSelect }: RailTileProps) {
  const { Icon } = entry;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="radio"
          aria-checked={active}
          aria-disabled={disabled ? true : undefined}
          data-disabled={disabled ? "true" : "false"}
          aria-label={entry.label}
          data-testid={`properties-palette-rail-${entry.id}`}
          onClick={() => {
            if (!disabled) onSelect();
          }}
          className={[
            "mx-auto flex h-[20px] w-[20px] items-center justify-center rounded-[3px] border text-ca-ink transition",
            disabled
              ? "border-transparent text-ca-ink-muted/40 cursor-not-allowed"
              : active
                ? "border-ca-select bg-ca-panel text-ca-select shadow-inner"
                : "border-transparent hover:border-ca-border hover:bg-ca-panel",
          ].join(" ")}
        >
          <Icon size={12} strokeWidth={1.75} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        align="center"
        sideOffset={10}
        collisionPadding={8}
        className="z-50 max-w-[220px] space-y-0.5 text-left leading-snug"
      >
        <div className="text-[13px] font-semibold tracking-tight">{entry.label}</div>
        <div className="text-[12px] opacity-90">{entry.hint}</div>
        {disabled ? (
          <div className="text-[11px] italic opacity-75">
            Not applicable to the current selection.
          </div>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
