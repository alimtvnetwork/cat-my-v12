import { ToolIdType } from "@/components/rules/tools/toolTooltipMap";
// Plan 79 steps 27-29. V4 Tools palette (compact left rail).
//
// Root cause the palette fixes, in one sentence: the editor had no
// compact left rail, so shape tools could not host long-press flyouts
// (rect / circle / polygon) without stealing horizontal canvas space.
//
// Behavior:
//   - Fixed 40 px column, 30 px tiles, radiogroup semantics.
//   - Rich Radix tooltip per tool (title, hotkey, steps, tips).
//   - Long-press (400 ms) or right-click on rectangle / circle /
//     polygon opens the variant flyout. Clicking a variant selects
//     that tool AND stamps the variant as the current one.
//   - Shift+M cycles variants of the currently active shape tool.
//   - Last-used variant per tool is persisted in localStorage under
//     `v4.tools.variants` (single JSON blob). Best-effort: any storage
//     failure is caught and logged; the UI falls back to defaults.
//
// This file is purely presentational. State (which tool is active)
// stays with the caller so the palette can be reused by other surfaces.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, Circle, MousePointer, Pentagon, Square, Type } from "lucide-react";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { logger } from "@/lib/editor/errors";
import { useUiPrefsStore, type ToolTooltipMode } from "@/lib/stores/ui-prefs-store";
import { TOOL_ORDER, TOOL_TOOLTIPS, type ToolId, type ToolVariant } from "./toolTooltipMap";
import { ToolGuideDialog } from "./ToolGuideDialog";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

const ICONS: Record<ToolId, typeof MousePointer> = {
  select: MousePointer,
  rectangle: Square,
  circle: Circle,
  polygon: Pentagon,
  textTools: Type,
};

const LONG_PRESS_MS = 400;
const VARIANT_STORAGE_KEY = "v4.tools.variants";

type VariantMap = Partial<Record<ToolId, string>>;

function readStoredVariants(): VariantMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VARIANT_STORAGE_KEY);

    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") return {};

    return parsed as VariantMap;
  } catch (err) {
    logger.warn("W_UI_TOOL_VARIANT_READ_FAILED", { err: String(err) });

    return {};
  }
}

function writeStoredVariants(map: VariantMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VARIANT_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    logger.warn("W_UI_TOOL_VARIANT_WRITE_FAILED", { err: String(err) });
  }
}

function defaultVariantId(id: ToolId): string | undefined {
  return TOOL_TOOLTIPS[id].variants?.[0]?.id;
}

interface Props {
  activeTool: ToolId;
  onChange: (tool: ToolId) => void;
  /**
   * Fires when the user picks a variant from the flyout OR cycles via
   * Shift+M. Optional so callers that do not yet render variants can
   * ignore it.
   */
  onVariantChange?: (tool: ToolId, variantId: string) => void;
}

export function ToolsPalette({ activeTool, onChange, onVariantChange }: Props) {
  const [variantMap, setVariantMap] = useState<VariantMap>(() => readStoredVariants());
  // Persisted user preference: "hover" (default Radix behavior) or
  // "on-demand" (suppress hover; still opens on keyboard focus so screen
  // reader / keyboard users are not cut off). Controlled per-tile below.
  const tooltipMode = useUiPrefsStore((s) => s.toolTooltipMode);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [guideTool, setGuideTool] = useState<ToolId | null>(null);
  const openGuide = useCallback((id: ToolId) => {
    logger.info("I_UI_TOOL_GUIDE_OPEN", { tool: id });
    setGuideTool(id);
  }, []);

  const selectVariant = useCallback(
    (tool: ToolId, variantId: string) => {
      setVariantMap((prev) => {
        if (prev[tool] === variantId) return prev;
        const next: VariantMap = { ...prev, [tool]: variantId };
        writeStoredVariants(next);

        return next;
      });
      logger.info("I_UI_TOOL_VARIANT_SELECT", { tool, variant: variantId });
      onVariantChange?.(tool, variantId);
    },
    [onVariantChange],
  );

  const cycleVariant = useCallback(
    (tool: ToolId) => {
      const variants = TOOL_TOOLTIPS[tool].variants;

      if (!variants || variants.length < 2) return;
      const current = variantMap[tool] ?? variants[0].id;
      const idx = variants.findIndex((v) => v.id === current);
      const nextIdx = (idx + 1) % variants.length;
      const nextVariant = variants[nextIdx];
      logger.info("I_UI_TOOL_VARIANT_CYCLE", {
        tool,
        from: current,
        to: nextVariant.id,
      });
      selectVariant(tool, nextVariant.id);
    },
    [selectVariant, variantMap],
  );

  // Keyboard shortcuts (single letters, no modifiers, ignore when typing).
  // Shift+M cycles variants of the active shape tool.
  useEffect(() => {
    const isTyping = (t: EventTarget | null): boolean => {
      const el = t as HTMLElement | null;

      if (!el?.tagName) return false;
      const tag = el.tagName.toLowerCase();

      return (
        tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      // Shift+M: cycle variants for the active shape tool.
      if (e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "m") {
        const activeTip = TOOL_TOOLTIPS[activeTool];

        if (activeTip.variants && activeTip.variants.length > 1) {
          e.preventDefault();
          cycleVariant(activeTool);
        }

        return;
      }

      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      const textVariantByKey: Record<string, string> = {
        o: "textTools.ocr",
        t: "textTools.text",
        e: "textTools.math",
      };
      const textVariant = textVariantByKey[key];

      if (textVariant) {
        e.preventDefault();
        selectVariant(ToolIdType.Texttools, textVariant);
        onChange(ToolIdType.Texttools);

        return;
      }

      const match = TOOL_ORDER.find((id) => TOOL_TOOLTIPS[id].hotkey === key);

      if (!match) return;
      e.preventDefault();
      logger.info("I_UI_TOOL_HOTKEY", { key: e.key, tool: match });
      onChange(match);
    };
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [activeTool, cycleVariant, onChange, selectVariant]);

  // Roving tabindex + arrow-key navigation across the radiogroup.
  // ArrowDown/Right move to the next tool, ArrowUp/Left to the previous,
  // Home/End jump to the ends. Selection follows focus, matching WAI-ARIA
  // radiogroup semantics. Alt+ArrowDown opens the flyout for shape tools.
  const onContainerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const idx = TOOL_ORDER.indexOf(activeTool);

      if (idx < 0) return;
      const focusIdx = (nextIdx: number) => {
        const nextId = TOOL_ORDER[nextIdx];
        onChange(nextId);
        // Focus the newly-selected tile so the roving tabindex follows.
        requestAnimationFrame(() => {
          const el = containerRef.current?.querySelector<HTMLButtonElement>(
            `[data-testid="tools-palette-${nextId}"]`,
          );
          el?.focus();
        });
      };

      if (KeyboardKeyType.isArrowDown(e.key) || KeyboardKeyType.isArrowRight(e.key)) {
        e.preventDefault();
        focusIdx((idx + 1) % TOOL_ORDER.length);
      } else if (KeyboardKeyType.isArrowUp(e.key) || KeyboardKeyType.isArrowLeft(e.key)) {
        e.preventDefault();
        focusIdx((idx - 1 + TOOL_ORDER.length) % TOOL_ORDER.length);
      } else if (KeyboardKeyType.isHome(e.key)) {
        e.preventDefault();
        focusIdx(0);
      } else if (KeyboardKeyType.isEnd(e.key)) {
        e.preventDefault();
        focusIdx(TOOL_ORDER.length - 1);
      }
    },
    [activeTool, onChange],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Editor tools"
        data-testid="tools-palette"
        onKeyDown={onContainerKeyDown}
        className="flex w-[40px] shrink-0 flex-col gap-[2px] border-r border-ca-border bg-ca-panel py-hmi-1"
      >
        {TOOL_ORDER.map((id) => (
          <ToolTile
            key={id}
            id={id}
            active={id === activeTool}
            currentVariantId={variantMap[id] ?? defaultVariantId(id)}
            tooltipMode={tooltipMode}
            onSelect={() => onChange(id)}
            onVariantPick={(variantId) => {
              selectVariant(id, variantId);
              onChange(id);
            }}
            onOpenGuide={() => openGuide(id)}
          />
        ))}
      </div>
      <ToolGuideDialog
        toolId={guideTool}
        open={guideTool !== null}
        onOpenChange={(next) => {
          if (!next) setGuideTool(null);
        }}
      />
    </TooltipProvider>
  );
}

interface TileProps {
  id: ToolId;
  active: boolean;
  currentVariantId?: string;
  tooltipMode: ToolTooltipMode;
  onSelect: () => void;
  onVariantPick: (variantId: string) => void;
  onOpenGuide: () => void;
}

function ToolTile({
  id,
  active,
  currentVariantId,
  tooltipMode,
  onSelect,
  onVariantPick,
  onOpenGuide,
}: TileProps) {
  const tip = TOOL_TOOLTIPS[id];
  const Icon = ICONS[id];
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  // Controlled tooltip state. In "hover" mode Radix's default open logic
  // runs (hover + focus). In "on-demand" mode we drop hover triggers and
  // only surface the tooltip on keyboard focus so nothing appears from
  // idle mouse movement, matching the user setting.
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  // Tracks whether the most recent pointer sequence triggered the
  // long-press flyout. When true, the trailing `click` (fired by iOS
  // Safari / Android Chrome after `pointerup`) is suppressed so the
  // long-press does not also stamp the tool as selected. Reset on the
  // next `pointerdown`.
  const longPressFiredRef = useRef(false);
  // Origin of the pointer contact. Used to cancel the long-press if the
  // user drags more than a few pixels — matches native touch behavior
  // where a scroll gesture must not fire the long-press hint.
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const tooltipId = useId();

  const openFlyout = useCallback(() => {
    if (!tip.hasFlyout) return;
    logger.info("I_UI_TOOL_FLYOUT_OPEN", { tool: id });
    setFlyoutOpen(true);
  }, [id, tip.hasFlyout]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!tip.hasFlyout) return;
    // Long-press: cancel on move / up. 400 ms matches the V4 spec.
    // Left button only for mouse; touch and pen always report button 0.
    // `pointerup` / `pointerleave` / `pointercancel` / drag-threshold
    // clear the timer. When the timer fires we also mark the sequence
    // so the trailing synthesized `click` (iOS Safari, Android Chrome)
    // is suppressed and does not double-select the tool.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    longPressFiredRef.current = false;
    pointerOriginRef.current = { x: e.clientX, y: e.clientY };
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      openFlyout();
    }, LONG_PRESS_MS);
  };
  const cancelHold = () => {
    window.clearTimeout(holdTimer.current);
    pointerOriginRef.current = null;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const origin = pointerOriginRef.current;

    if (!origin) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    // 8 px slop matches native touch drag thresholds and prevents jitter
    // from firing the flyout during a scroll gesture.
    if (dx * dx + dy * dy > 64) cancelHold();
  };
  const onClick = (e: React.MouseEvent) => {
    if (longPressFiredRef.current) {
      // Long-press already opened the flyout on this sequence. Swallow
      // the trailing synthetic click so we do not also select the tool.
      longPressFiredRef.current = false;
      e.preventDefault();
      e.stopPropagation();

      return;
    }

    onSelect();
  };

  const onDemand = tooltipMode === "on-demand";
  // In on-demand mode we drive Radix Tooltip open state ourselves so
  // hover is a no-op. Keyboard focus / blur still open and close the
  // tooltip so screen reader + keyboard users are not cut off from the
  // hotkey / usage hints. In "hover" mode we pass no props and let
  // Radix's default delay + hover / focus logic run.
  const controlledTooltipProps: {
    open?: boolean;
    onOpenChange?: (next: boolean) => void;
  } = onDemand
    ? {
        open: tooltipOpen && !flyoutOpen,
        onOpenChange: setTooltipOpen,
      }
    : {};
  const focusHandlers = onDemand
    ? {
        onFocus: () => setTooltipOpen(true),
        onBlur: () => setTooltipOpen(false),
      }
    : {};

  const button = (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`${tip.title} tool (${tip.hotkey.toUpperCase()})`}
      aria-keyshortcuts={tip.hotkey.toUpperCase()}
      aria-describedby={tooltipId}
      aria-haspopup={tip.hasFlyout ? "menu" : undefined}
      aria-expanded={tip.hasFlyout ? flyoutOpen : undefined}
      tabIndex={active ? 0 : -1}
      data-testid={`tools-palette-${id}`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={tip.hasFlyout ? onPointerMove : undefined}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      {...focusHandlers}
      style={{
        // iOS Safari long-press shows the callout / magnifier and can
        // hijack the gesture. Disable it on the tile without affecting
        // pointer events. `touch-action: manipulation` removes the 300 ms
        // click delay while still allowing our long-press timer to run.
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: "manipulation",
      }}
      onKeyDown={
        tip.hasFlyout
          ? (e) => {
              // Alt+ArrowDown opens the variant flyout, matching
              // WAI-ARIA button-with-menu keyboard guidance.
              if (e.altKey && KeyboardKeyType.isArrowDown(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                openFlyout();
              }
            }
          : undefined
      }
      onContextMenu={
        tip.hasFlyout
          ? (e) => {
              e.preventDefault();
              openFlyout();
            }
          : undefined
      }
      className={[
        "relative mx-auto flex h-[30px] w-[30px] items-center justify-center rounded-sm border text-ca-ink transition",
        active
          ? "border-ca-select bg-ca-panel-2 text-ca-select shadow-inner"
          : "border-transparent hover:border-ca-border hover:bg-ca-panel-2",
      ].join(" ")}
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden />
      {tip.hasFlyout ? (
        <span
          aria-hidden
          className="absolute bottom-[2px] right-[2px] block h-[3px] w-[3px] rounded-full bg-ca-ink-muted"
        />
      ) : null}
    </button>
  );

  const tooltipContent = (
    <TooltipContent
      side="right"
      align="center"
      sideOffset={8}
      collisionPadding={8}
      avoidCollisions
      id={tooltipId}
      role="tooltip"
      className="z-50 max-w-[260px] space-y-1.5 text-left leading-snug"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold tracking-tight">{tip.title}</span>
        <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 py-[1px] text-[10px] font-mono tabular-nums text-ca-ink-muted">
          {tip.hotkey.toUpperCase()}
        </kbd>
      </div>
      <p className="text-[12px] opacity-90">{tip.body}</p>
      {tip.steps.length > 0 ? (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ca-ink-muted">
            How to use
          </div>
          <ol className="mt-0.5 list-decimal space-y-0.5 pl-4 text-[12px] opacity-90 marker:text-ca-ink-muted">
            {tip.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {tip.tips && tip.tips.length > 0 ? (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ca-ink-muted">
            Tips
          </div>
          <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[12px] opacity-90 marker:text-ca-ink-muted">
            {tip.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="border-t border-ca-border/60 pt-1 text-[11px] italic opacity-75">
        {tip.whenToUse}
      </div>
      {tip.hasFlyout ? (
        <div className="text-[11px] opacity-70">Long-press for shape variants.</div>
      ) : null}
      <button
        type="button"
        data-testid={`tools-palette-${id}-guide`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenGuide();
        }}
        onPointerDown={(e) => {
          // Stop the trigger's long-press timer from starting.
          e.stopPropagation();
        }}
        className="mt-1 inline-flex items-center gap-1 rounded-sm border border-ca-border bg-ca-panel-2 px-1.5 py-[2px] text-[11px] font-medium text-ca-ink transition hover:border-ca-select hover:text-ca-select focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ca-select"
      >
        View full guide
        <span aria-hidden>&rarr;</span>
      </button>
    </TooltipContent>
  );

  if (!tip.hasFlyout) {
    return (
      <Tooltip {...controlledTooltipProps}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        {tooltipContent}
      </Tooltip>
    );
  }

  return (
    <Popover open={flyoutOpen} onOpenChange={setFlyoutOpen}>
      <Tooltip {...controlledTooltipProps}>
        <TooltipTrigger asChild>
          <PopoverAnchor asChild>{button}</PopoverAnchor>
        </TooltipTrigger>
        {flyoutOpen ? null : tooltipContent}
      </Tooltip>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={10}
        collisionPadding={8}
        className="w-[220px] p-1"
        data-testid={`tools-palette-${id}-flyout`}
      >
        <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-ca-ink-muted">
          {tip.title} variants
        </div>
        <ul role="menu" aria-label={`${tip.title} variants`} className="flex flex-col">
          {(tip.variants ?? []).map((variant) => (
            <VariantRow
              key={variant.id}
              variant={variant}
              selected={variant.id === currentVariantId}
              onPick={() => {
                setFlyoutOpen(false);
                onVariantPick(variant.id);
              }}
            />
          ))}
        </ul>
        <div className="mt-1 border-t border-ca-border/60 px-2 py-1 text-[11px] text-ca-ink-muted">
          <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 py-[1px] font-mono">
            Shift+M
          </kbd>{" "}
          cycles variants.
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface VariantRowProps {
  variant: ToolVariant;
  selected: boolean;
  onPick: () => void;
}

function VariantRow({ variant, selected, onPick }: VariantRowProps) {
  return (
    <li>
      <button
        type="button"
        role="menuitemradio"
        aria-checked={selected}
        data-testid={`tools-palette-variant-${variant.id}`}
        onClick={onPick}
        className={[
          "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left transition",
          selected ? "bg-ca-panel-2 text-ca-select" : "text-ca-ink hover:bg-ca-panel-2",
        ].join(" ")}
      >
        <span aria-hidden className="mt-[3px] flex h-3 w-3 shrink-0 items-center justify-center">
          {selected ? <Check size={12} strokeWidth={2.5} /> : null}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[13px] font-medium leading-tight">{variant.label}</span>
          <span className="text-[11px] leading-tight text-ca-ink-muted">{variant.description}</span>
        </span>
      </button>
    </li>
  );
}
