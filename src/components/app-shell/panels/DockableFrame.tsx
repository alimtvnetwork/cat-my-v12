import { ErrorSourceType } from "@/lib/errors/error-record";
/**
 * Plan 66 step 10 (SS-03 slice 1): DockableFrame primitive.
 *
 * Single component that owns titlebar + body + control wiring for every
 * Photoshop-style panel (Layers, Tools, Properties, Preview, and any
 * future panel registered in `panel-registry`). Consumers wrap their
 * content and get four modes for free:
 *
 *   - dock  (mode === PanelModeType.Dock):     rendered inside a DockSlot column.
 *   - float (mode === PanelModeType.Float):    rendered as a FloatingWindow.
 *   - min   (mode === PanelModeType.Min):      only the titlebar is visible.
 *   - hidden(mode === PanelModeType.Hidden):   returns null; reachable via Window menu.
 *
 * The primitive does NOT re-implement placement (DockSlot / FloatingWindow
 * / MinimizedRail already own that in PanelHost). It is a titlebar+body
 * pair with control buttons wired directly to the workspace layout store,
 * so panel authors stop duplicating chrome and drift.
 *
 * Observability: unknown panel ids surface `E_PANEL_UNKNOWN_ID` through
 * the reducers in `layout-slice.ts`. This component leans on that; it
 * does not re-report to avoid duplicate toasts.
 */
import * as React from "react";
import { PanelChrome } from "./PanelChrome";
import { useWorkspaceLayoutStore, type PanelState } from "@/lib/workspace/layout-slice";
import { getPanel } from "@/lib/workspace/panel-registry";
import { reportError } from "@/lib/errors/error-bus";
import { registerPanelHost } from "@/lib/workspace/panel-host-registry";
import { PanelModeType } from "@/lib/enums/ui";

/** Derive the four-mode enum from the (open, dock, minimized) triple. */
// eslint-disable-next-line react-refresh/only-export-components
export function derivePanelMode(state: PanelState | undefined): PanelModeType {
  const isStateMissing = state == null;
  if (isStateMissing) return PanelModeType.Hidden;

  const isPanelClosed = state.open === false;
  if (isPanelClosed) return PanelModeType.Hidden;

  if (state.minimized) return PanelModeType.Min;

  return state.dock === "floating" ? PanelModeType.Float : PanelModeType.Dock;
}

export interface PanelControls {
  mode: PanelModeType;
  minimize: () => void;
  restore: () => void;
  hide: () => void;
  toggle: () => void;
}

/**
 * Hook returning the current mode plus the action callbacks bound to
 * `panelId`. Handy for consumers that need to render their own control
 * (for example: a "float" toggle button inside a custom toolbar).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function usePanelControls(panelId: string): PanelControls {
  const state = useWorkspaceLayoutStore((s) => s.panels[panelId]);
  const minimizePanel = useWorkspaceLayoutStore((s) => s.minimizePanel);
  const restorePanel = useWorkspaceLayoutStore((s) => s.restorePanel);
  const closePanel = useWorkspaceLayoutStore((s) => s.closePanel);
  const togglePanel = useWorkspaceLayoutStore((s) => s.togglePanel);

  return React.useMemo(
    () => ({
      mode: derivePanelMode(state),
      minimize: () => minimizePanel(panelId),
      restore: () => restorePanel(panelId),
      hide: () => closePanel(panelId),
      toggle: () => togglePanel(panelId),
    }),
    [state, minimizePanel, restorePanel, closePanel, togglePanel, panelId],
  );
}

export interface DockableFrameProps {
  /** Registered panel id (see panel-registry.ts). */
  panelId: string;
  /**
   * Titlebar text. Optional: defaults to the registry title so consumers
   * don't have to duplicate it. Passing a value overrides for edge cases.
   */
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  /** Panel body. */
  children?: React.ReactNode;
  /**
   * When true (default), a panel in mode "hidden" returns null. Set to
   * false when the parent host already gates rendering (e.g. PanelHost
   * iterates only open panels) and the frame should still render body
   * even if a race left the store in a transient hidden state.
   */
  hideWhenHidden?: boolean;
}

/**
 * Titlebar + body wrapper wired to the workspace layout store. Renders
 * PanelChrome with minimize / hide controls and toggles the body based
 * on `minimized`. Placement (dock slot vs floating window) is still owned
 * by PanelHost; this primitive only owns chrome.
 */
export function DockableFrame({
  panelId,
  title,
  icon,
  className,
  children,
  hideWhenHidden = true,
}: DockableFrameProps): React.JSX.Element | null {
  const def = getPanel(panelId);
  const controls = usePanelControls(panelId);
  const { mode } = controls;

  // Count this DockableFrame in the host registry so the Window menu can
  // gate on "a panel host is mounted", not just "editor path matches".
  React.useEffect(() => registerPanelHost(), []);

  // Surface unknown ids the same way the reducers do: an authoring bug
  // in the panel wiring is not something we want to swallow.
  React.useEffect(() => {
    if (!def) {
      reportError(
        ErrorSourceType.Manual,
        new Error(`E_PANEL_UNKNOWN_ID: DockableFrame received unknown panelId '${panelId}'`),
        { code: "E_PANEL_UNKNOWN_ID", panelId, caller: "DockableFrame" },
      );
    }
  }, [def, panelId]);

  if (!def) return null;

  if (hideWhenHidden && PanelModeType.isHidden(mode)) return null;

  const isMin = PanelModeType.isMin(mode);

  // Mode is surfaced via a wrapper div (PanelChrome does not accept
  // arbitrary data-* props). Tests and CSS can target it.
  return (
    <div data-panel-mode={controls.mode} data-testid={`dockable-${panelId}`} className="contents">
      <PanelChrome
        panelId={panelId}
        title={title ?? def.title}
        icon={icon}
        collapsed={isMin}
        onToggleCollapse={isMin ? controls.restore : controls.minimize}
        onMinimize={isMin ? undefined : controls.minimize}
        onClose={controls.hide}
        className={className}
      >
        {children}
      </PanelChrome>
    </div>
  );
}
