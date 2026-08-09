/**
 * Plan 65 step 7 (SS-02): PanelChrome.
 *
 * Purely presentational title-bar + body wrapper for every dockable panel.
 * Consumers (DockSlot / FloatingWindow / PanelHost) supply the panel id,
 * title, icon, current collapsed/minimized state, and drag-handle props
 * (from `useDraggable`). The chrome renders the title bar row and the
 * body slot, and never touches the layout store directly, which lets it
 * unit-test without dnd-kit or zustand.
 *
 * Sizing comes from panel-chrome tokens (`--panel-titlebar-height`,
 * `--panel-control-size`, `--panel-icon-size`) so every panel has the
 * same 36px title bar and 32x32 hit targets (Command 23 rule 1). No
 * hardcoded px anywhere in this file.
 */

import * as React from "react";
import { ChevronDown, ChevronRight, GripVertical, HelpCircle, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface PanelChromeProps {
  panelId: string;
  title: string;
  icon?: React.ReactNode;
  /** Whether the body is expanded. Chevron rotates 90deg between states. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
  /**
   * Spread onto the title-bar row so the entire bar acts as a drag handle.
   * Consumers derive this from dnd-kit `useDraggable().listeners` +
   * `attributes`.
   */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Additional className for the outer container. */
  className?: string;
  /** Panel body. */
  children?: React.ReactNode;
}

/**
 * A single title-bar control button. 32x32 hit target with an 18px glyph,
 * hover + focus ring, `title` attribute for a browser tooltip, and
 * `aria-label` for AT.
 */
function ChromeControl({
  label,
  onClick,
  children,
  intent = "default",
  "data-testid": testId,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  intent?: "default" | "collapse" | "minimize" | "close";
  "data-testid"?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          onClick={onClick}
          // Plan 65 step 34: the parent titlebar spreads dnd-kit useDraggable
          // listeners so the whole bar acts as a drag handle. Without stopping
          // propagation here, pointerdown on this control is captured by the
          // drag sensor, dnd-kit calls preventDefault, and the button's own
          // onClick never fires. Symptom: close/minimize/collapse appear dead
          // and every click surfaces W_PANEL_DROP_INVALID via the error bus.
          // Stopping pointerdown + mousedown (keyboard activations are
          // unaffected) keeps the drag handle intact for the rest of the bar
          // while restoring normal button behavior on the controls.
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          data-panel-control={intent}
          data-testid={testId}
          className={cn(
            "panel-chrome-control",
            "inline-flex shrink-0 items-center justify-center rounded-md",
            "text-ca-chrome-ink focus-visible:outline-none",
          )}
        >
          <span className="panel-chrome-control-glyph" aria-hidden>
            {children}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function getPanelHint(panelId: string): string | null {
  if (panelId === "tools")
    return "Tools stay on the left: draw, select, and edit inspection regions.";

  if (panelId === "rules")
    return "Rules stay on the right: review checks, order, visibility, and validation.";

  return null;
}

function PanelHint({ hint, title }: { hint: string; title: string }) {
  return (
    <TooltipProvider delayDuration={180}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${title} panel hint`}
            title={hint}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              "panel-chrome-hint inline-flex shrink-0 items-center justify-center rounded-sm",
              "text-ca-chrome-ink/60 hover:bg-ca-panel-2 hover:text-ca-chrome-ink",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-accent",
            )}
          >
            <HelpCircle aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" className="max-w-64 text-balance text-center">
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const PanelChrome = React.forwardRef<HTMLDivElement, PanelChromeProps>(
  (
    {
      panelId,
      title,
      icon,
      collapsed = false,
      onToggleCollapse,
      onMinimize,
      onClose,
      dragHandleProps,
      className,
      children,
    },
    ref,
  ) => {
    const hint = getPanelHint(panelId);
    const [dynamicTitle, setDynamicTitle] = React.useState(() =>
      panelId === "rules" ? "Layers" : title,
    );
    React.useEffect(() => {
      if (panelId !== "rules" || typeof window === "undefined") {
        setDynamicTitle(title);

        return;
      }

      setDynamicTitle((current) => (current === title ? "Layers" : current));
      const onTitle = (event: Event) => {
        const detail = (event as CustomEvent<{ label?: string }>).detail;

        if (typeof detail?.label === "string" && detail.label.trim()) {
          setDynamicTitle(detail.label.trim());
        }
      };
      window.addEventListener("hmi:inspector-tab-title", onTitle);

      return () => window.removeEventListener("hmi:inspector-tab-title", onTitle);
    }, [panelId, title]);
    const chromeTitle = panelId === "rules" ? dynamicTitle : title;

    return (
      <section
        ref={ref}
        data-panel-id={panelId}
        data-collapsed={collapsed ? "true" : "false"}
        aria-labelledby={`panel-${panelId}-title`}
        className={cn(
          "panel-chrome flex min-h-0 flex-col rounded-lg border border-ca-border bg-ca-panel",
          className,
        )}
      >
        <TooltipProvider delayDuration={140}>
          <div
            role="toolbar"
            aria-label={`${chromeTitle} panel title bar`}
            data-testid={`panel-${panelId}-titlebar`}
            data-panel-drag-handle="grip"
            className={cn(
              "panel-chrome-titlebar flex items-center gap-2 border-b border-ca-border px-2",
              "select-none",
              "bg-ca-chrome text-ca-chrome-ink",
            )}
          >
            <ChromeControl
              label={collapsed ? `Expand ${chromeTitle}` : `Collapse ${chromeTitle}`}
              onClick={onToggleCollapse}
              intent="collapse"
              data-testid={`panel-${panelId}-toggle`}
            >
              {collapsed ? <ChevronRight /> : <ChevronDown />}
            </ChromeControl>
            <span
              {...dragHandleProps}
              title={`Drag ${chromeTitle} panel`}
              aria-label={`Drag ${chromeTitle} panel`}
              data-testid={`panel-${panelId}-drag-grip`}
              data-panel-drag-initiator="true"
              className={cn(
                "panel-chrome-grip hidden shrink-0 items-center justify-center sm:inline-flex",
                "cursor-grab active:cursor-grabbing rounded-sm",
                "text-ca-chrome-ink/70 hover:text-ca-chrome-ink hover:bg-ca-panel-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-accent",
              )}
            >
              <GripVertical aria-hidden />
            </span>

            {icon ? (
              <span className="panel-chrome-panel-icon shrink-0" aria-hidden>
                {icon}
              </span>
            ) : null}
            {panelId === "rules" ? (
              <div
                data-inspector-tabs-mount
                className="inspector-tabs-inline-mount flex min-w-0 flex-1 items-stretch self-stretch"
                aria-label="Inspector sections"
              />
            ) : (
              <h2
                id={`panel-${panelId}-title`}
                className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight"
              >
                {chromeTitle}
              </h2>
            )}
            {hint ? <PanelHint hint={hint} title={chromeTitle} /> : null}

            {onMinimize ? (
              <ChromeControl
                label={`Minimize ${chromeTitle}`}
                onClick={onMinimize}
                intent="minimize"
                data-testid={`panel-${panelId}-minimize`}
              >
                <Minus />
              </ChromeControl>
            ) : null}
            {onClose ? (
              <ChromeControl
                label={`Close ${chromeTitle}`}
                onClick={onClose}
                intent="close"
                data-testid={`panel-${panelId}-close`}
              >
                <X />
              </ChromeControl>
            ) : null}
          </div>
        </TooltipProvider>
        <div
          className={cn(
            "panel-chrome-body editor-scroll-fancy min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
            collapsed && "hidden",
          )}
          aria-hidden={collapsed}
          data-testid={`panel-${panelId}-body`}
        >
          {children}
        </div>
      </section>
    );
  },
);
PanelChrome.displayName = "PanelChrome";
