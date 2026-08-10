import { ErrorSourceType } from "@/lib/errors/error-record";
/**
 * Plan 65 step 7 (SS-02): PanelHost.
 *
 * Reads the workspace layout store and renders every registered panel
 * into the correct slot (left / right / bottom dock or a floating
 * window). Panels with `open: false` are not rendered. Consumers pass a
 * `content` map keyed by panel id so this file stays free of concrete
 * panel components; wiring happens in plan step 10-11.
 *
 * The single `DndContext` owns all drags and commits the result via the
 * store's `dockPanel` / `floatPanel` actions. Invalid drops surface as
 * `W_PANEL_DROP_INVALID` through the error bus.
 */

import * as React from "react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { PANELS, getPanel } from "@/lib/workspace/panel-registry";
import { DockSlotType, PanelModeType } from "@/lib/enums/ui";
import {
  useWorkspaceLayoutStore,
  type FloatingRect,
  type PanelState,
} from "@/lib/workspace/layout-slice";
import { reportError } from "@/lib/errors/error-bus";
import { registerPanelHost } from "@/lib/workspace/panel-host-registry";
import { DockSlot } from "./DockSlot";
import { FloatingWindow } from "./FloatingWindow";
import { PanelChrome } from "./PanelChrome";
import { MinimizedRail } from "./MinimizedRail";

export interface PanelHostProps {
  /** Map of panelId -> body content. Missing entries render a placeholder. */
  content: Partial<Record<string, React.ReactNode>>;
  /**
   * Optional canvas region rendered between the left and right docks.
   * When supplied, the editor canvas sits inside the panel host so that
   * left/right docks flank it and the bottom dock stacks underneath.
   */
  canvasSlot?: React.ReactNode;
}

/**
 * Plan 65 step 12: minimum pointer travel (px) before an out-of-dock drop
 * spawns a floating window. Below this threshold we treat the gesture as a
 * mis-click and leave the panel docked. Also used as the default floating
 * window size when the registry does not specify one.
 */
const DRAG_OUT_THRESHOLD_PX = 24;
const DEFAULT_FLOAT_WIDTH = 320;
const DEFAULT_FLOAT_HEIGHT = 240;
// Plan 65 step 36: clamp initial floating-window size so a torn-out
// dock panel (whose bounding rect can span the full viewport height)
// spawns as a normal-looking window instead of covering the canvas.
const MAX_FLOAT_WIDTH = 640;
const MAX_FLOAT_HEIGHT = 520;

function groupByDock(panels: Record<string, PanelState>) {
  const buckets: Record<string, string[]> = {
    [DockSlotType.Top]: [],
    [DockSlotType.Left]: [],
    [DockSlotType.Right]: [],
    [DockSlotType.Bottom]: [],
    [DockSlotType.Floating]: [],
  };
  for (const p of PANELS) {
    const state = panels[p.id];
    if (!state?.open) {
      continue;
    }
    const dock = DockSlotType.isHidden(state.dock) ? p.defaultDock : state.dock;

    if (buckets[dock]) buckets[dock].push(p.id);
  }

  return buckets;
}

function commitDockDrag(
  event: DragEndEvent,
  panelId: string,
  overSlot: Exclude<DockSlotType, DockSlotType.Hidden> | undefined,
): void {
  const state = useWorkspaceLayoutStore.getState();
  const distance = Math.hypot(event.delta.x, event.delta.y);
  const sourceDock = state.panels[panelId]?.dock;

  if (overSlot && overSlot !== sourceDock) {
    if (getPanel(panelId) === undefined) return;
    state.dockPanel(panelId, overSlot);

    return;
  }

  if (distance >= DRAG_OUT_THRESHOLD_PX) {
    const initial = event.active.rect.current.initial;
    const x = (initial?.left ?? DEFAULT_FLOAT_WIDTH / 2) + event.delta.x;
    const y = (initial?.top ?? DEFAULT_FLOAT_HEIGHT / 2) + event.delta.y;
    // Prefer the panel's registered `defaultFloatSize` so torn-out panels
    // (Tools column, Rules rail) spawn snug to their content instead of
    // inheriting the dock column's full height, which is what caused the
    // "big empty area under the toolbox" screenshot.
    const preferred = getPanel(panelId)?.defaultFloatSize;
    const rawWidth = preferred?.width ?? initial?.width ?? DEFAULT_FLOAT_WIDTH;
    const rawHeight = preferred?.height ?? initial?.height ?? DEFAULT_FLOAT_HEIGHT;
    state.floatPanel(panelId, {
      x,
      y,
      // Allow torn-out toolboxes to be narrower than the generic minimum
      // (Tools is ~100px wide). Preferred sizes are trusted; only clamp
      // fallbacks against the generic min.
      width: preferred
        ? Math.min(rawWidth, MAX_FLOAT_WIDTH)
        : Math.min(Math.max(rawWidth, DEFAULT_FLOAT_WIDTH), MAX_FLOAT_WIDTH),
      height: Math.min(Math.max(rawHeight, DEFAULT_FLOAT_HEIGHT), MAX_FLOAT_HEIGHT),
    });

    return;
  }

  reportError(
    ErrorSourceType.Manual,
    new Error(`W_PANEL_DROP_INVALID: ${panelId} dropped outside any slot`),
    {
      code: "W_PANEL_DROP_INVALID",
      panelId,
      sourceDock: state.panels[panelId]?.dock,
      targetDock: null,
      reason: "no-target-below-threshold",
      distance,
    },
  );
}

function dockSlotAtPoint(
  x: number,
  y: number,
  sourceDock?: string,
): Exclude<DockSlotType, DockSlotType.Hidden | DockSlotType.Floating> | undefined {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    const dockEl = el.closest("[data-dock-slot]");
    const isHidden = dockEl?.classList.contains("hidden");

    if (isHidden) continue;
    const slot = dockEl?.getAttribute("data-dock-slot") as Exclude<
      DockSlotType,
      DockSlotType.Hidden | DockSlotType.Floating
    > | null;

    if (slot && slot !== sourceDock) return slot;
  }

  return undefined;
}

function handleDragEnd(event: DragEndEvent) {
  const overSlot = event.over?.data.current?.slot as
    Exclude<DockSlotType, DockSlotType.Hidden> | undefined;
  const kind = event.active.data.current?.kind as
    PanelModeType.Dock | PanelModeType.Float | undefined;
  const panelId = (event.active.data.current?.panelId as string | undefined) ?? null;
  if (!panelId) {
    return;
  }
  const state = useWorkspaceLayoutStore.getState();

  if (PanelModeType.isFloat(kind)) {
    // Floating -> if dropped over a dock slot, dock the panel there so
    // users can pull a floating window back into a column. Otherwise
    // commit the translated rect as the new floating position.
    if (overSlot) {
      if (getPanel(panelId) === undefined) return;
      state.dockPanel(panelId, overSlot);

      return;
    }

    const currentRect = state.panels[panelId]?.floatingRect;
    if (!currentRect || !event.delta) {
      return;
    }
    const next: FloatingRect = {
      x: currentRect.x + event.delta.x,
      y: currentRect.y + event.delta.y,
      width: currentRect.width,
      height: currentRect.height,
    };
    state.floatPanel(panelId, next);

    return;
  }

  // Docked panel drag: either move to another slot, spawn a floating
  // window when dragged far enough outside any slot, or ignore.
  commitDockDrag(event, panelId, overSlot);
}

/**
 * Plan 65 step 12: wrap a docked panel so its title bar activates a
 * dnd-kit drag. Applies the drag transform to the whole panel so the
 * user sees it lift out of its column. The render-prop mirrors
 * `FloatingWindow` so `PanelChrome` receives its `dragHandleProps`
 * without extra plumbing.
 */
interface DockedDraggableProps {
  panelId: string;
  onDragChange?: (isDragging: boolean) => void;
  children: (handleProps: React.HTMLAttributes<HTMLDivElement>) => React.ReactNode;
}

function DockedDraggable({ panelId, onDragChange, children }: DockedDraggableProps) {
  const nodeRef = React.useRef<HTMLDivElement | null>(null);
  const startRef = React.useRef<{ x: number; y: number; rect: DOMRect } | null>(null);
  const hasMovedRef = React.useRef(false);
  const hoveredSlotRef = React.useRef<Element | null>(null);
  const [transform, setTransform] = React.useState<{ x: number; y: number } | null>(null);
  const [settling, setSettling] = React.useState(false);
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: transform ? 50 : undefined,
    position: "relative",
    transition: settling ? "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)" : undefined,
  };
  const clearHover = () => {
    if (hoveredSlotRef.current) {
      hoveredSlotRef.current.removeAttribute("data-drop-hover");
      hoveredSlotRef.current = null;
    }
  };
  const updateHover = (x: number, y: number) => {
    const state = useWorkspaceLayoutStore.getState();
    const sourceDock = state.panels[panelId]?.dock;
    const els = document.elementsFromPoint(x, y);
    let match: Element | null = null;
    for (const el of els) {
      const dockEl = el.closest("[data-dock-slot]");
      const isHidden = dockEl?.classList.contains("hidden");

      if (!dockEl || isHidden) {
        continue;
      }
      const s = dockEl.getAttribute("data-dock-slot");

      if (s && s !== sourceDock) {
        match = dockEl;
        break;
      }
    }

    if (match !== hoveredSlotRef.current) {
      clearHover();

      if (match) {
        match.setAttribute("data-drop-hover", "true");
        hoveredSlotRef.current = match;
      }
    }
  };
  const beginDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const isControl = (e.target as Element).closest("button");
    const isHandle = (e.target as Element).closest("[data-panel-drag-handle]");

    if (isControl) return;
    if (!isHandle) {
      return;
    }
    const rect = nodeRef.current?.getBoundingClientRect();

    if (rect) startRef.current = { x: e.clientX, y: e.clientY, rect };
    hasMovedRef.current = false;
    setSettling(false);

    if (rect) onDragChange?.(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (!s) {
      return;
    }
    const next = { x: e.clientX - s.x, y: e.clientY - s.y };

    if (Math.hypot(next.x, next.y) >= DRAG_OUT_THRESHOLD_PX) hasMovedRef.current = true;
    setTransform(next);
    updateHover(e.clientX, e.clientY);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    startRef.current = null;
    clearHover();
    onDragChange?.(false);
    let isCommitted = false;

    if (s && hasMovedRef.current) {
      isCommitted = finishDockedDrag(panelId, s, e.clientX, e.clientY);
    }

    hasMovedRef.current = false;

    if (isCommitted) {
      setTransform(null);
      setSettling(false);

      return;
    }
    // Invalid or no-op drop: animate back to origin.
    setSettling(true);
    requestAnimationFrame(() => setTransform({ x: 0, y: 0 }));
    window.setTimeout(() => {
      setTransform(null);
      setSettling(false);
    }, 210);
  };
  const handleProps: React.HTMLAttributes<HTMLDivElement> = {};

  return (
    <div
      ref={nodeRef}
      style={style}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      data-dragging={transform ? "true" : "false"}
      data-panel-drag-id={panelId}
    >
      {children(handleProps)}
    </div>
  );
}

function finishDockedDrag(
  panelId: string,
  start: { x: number; y: number; rect: DOMRect },
  x: number,
  y: number,
): boolean {
  const state = useWorkspaceLayoutStore.getState();
  const sourceDock = state.panels[panelId]?.dock;
  const slot = dockSlotAtPoint(x, y, sourceDock);
  const distance = Math.hypot(x - start.x, y - start.y);

  if (slot) {
    state.dockPanel(panelId, slot);

    return true;
  }

  if (distance < DRAG_OUT_THRESHOLD_PX) return false;
  const preferred = getPanel(panelId)?.defaultFloatSize;
  const rawWidth = preferred?.width ?? start.rect.width;
  const rawHeight = preferred?.height ?? start.rect.height;
  state.floatPanel(panelId, {
    x: start.rect.left + x - start.x,
    y: start.rect.top + y - start.y,
    width: preferred
      ? Math.min(rawWidth, MAX_FLOAT_WIDTH)
      : Math.min(Math.max(rawWidth, DEFAULT_FLOAT_WIDTH), MAX_FLOAT_WIDTH),
    height: Math.min(Math.max(rawHeight, DEFAULT_FLOAT_HEIGHT), MAX_FLOAT_HEIGHT),
  });

  return true;
}

export function PanelHost({ content, canvasSlot }: PanelHostProps) {
  const panels = useWorkspaceLayoutStore((s) => s.panels);
  // Plan 73 step 18 (issue 21): register with panel-host-registry so
  // TopMenuBar's `usePanelHostMounted()` gate flips true and the Window
  // menu renders. Previously only the unused legacy `DockableFrame`
  // called `registerPanelHost`, so the Window menu never mounted in
  // production even though PanelHost was on screen.
  React.useEffect(() => registerPanelHost(), []);
  const closePanel = useWorkspaceLayoutStore((s) => s.closePanel);
  const minimizePanel = useWorkspaceLayoutStore((s) => s.minimizePanel);
  const togglePanel = useWorkspaceLayoutStore((s) => s.togglePanel);
  const restorePanel = useWorkspaceLayoutStore((s) => s.restorePanel);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const buckets = React.useMemo(() => groupByDock(panels), [panels]);
  // Plan 65 step 13: track whether any drag is in flight so DockSlot can
  // paint always-visible drop indicators (not just on hover).
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const onDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);
  const onDragEndWrapped = React.useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    handleDragEnd(event);
  }, []);
  const onDragCancel = React.useCallback(() => {
    setActiveDragId(null);
  }, []);
  const isDragActive = activeDragId !== null;
  const renderExpandedPanel = (id: string): React.ReactNode => {
    const def = getPanel(id);

    if (def === undefined) return null;
    const state = panels[id];

    return (
      <DockedDraggable
        key={id}
        panelId={id}
        onDragChange={(isDragging) => setActiveDragId(isDragging ? `direct:${id}` : null)}
      >
        {(handleProps) => (
          <PanelChrome
            panelId={id}
            title={def.title}
            collapsed={state.minimized}
            onToggleCollapse={() => togglePanel(id)}
            onMinimize={() => minimizePanel(id)}
            onClose={() => closePanel(id)}
            dragHandleProps={handleProps}
          >
            {renderBody(id)}
          </PanelChrome>
        )}
      </DockedDraggable>
    );
  };

  const renderBody = (panelId: string): React.ReactNode => {
    return (
      content[panelId] ?? (
        <div className="p-4 text-xs text-muted-foreground">
          No content wired for <code>{panelId}</code>.
        </div>
      )
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEndWrapped}
      onDragCancel={onDragCancel}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-hmi-2" data-testid="panel-host">
        {([DockSlotType.Top] as const).map((slot) => {
          const ids = buckets[slot];
          const allIds = ids ?? [];
          const expandedIds = allIds.filter((id) => panels[id]?.minimized === false);
          const minimizedIds = allIds.filter((id) => panels[id]?.minimized === true);
          const hasAny = allIds.length > 0;
          if (!hasAny && !isDragActive) {
            return <DockSlot key={slot} slot={slot} className="hidden" dragActive={false} />;
          }

          return (
            <DockSlot
              key={slot}
              slot={slot}
              dragActive={isDragActive}
              minimizedRail={
                <MinimizedRail slot={slot} ids={minimizedIds} onRestore={restorePanel} />
              }
            >
              {expandedIds.map(renderExpandedPanel)}
            </DockSlot>
          );
        })}
        <div className="flex min-h-0 flex-1 flex-col gap-hmi-2 sm:flex-row">
          {([DockSlotType.Left, DockSlotType.Right] as const).map((slot) => {
            const renderSlot = (position: DockSlotType.Left | DockSlotType.Right) => {
              const ids = buckets[position];
              const allIds = ids ?? [];
              const expandedIds = allIds.filter((id) => panels[id]?.minimized === false);
              const minimizedIds = allIds.filter((id) => panels[id]?.minimized === true);
              const hasAny = allIds.length > 0;
              if (!hasAny && !isDragActive) {
                return (
                  <DockSlot key={position} slot={position} className="hidden" dragActive={false} />
                );
              }

              return (
                <DockSlot
                  key={position}
                  slot={position}
                  dragActive={isDragActive}
                  minimizedRail={
                    <MinimizedRail slot={position} ids={minimizedIds} onRestore={restorePanel} />
                  }
                >
                  {expandedIds.map(renderExpandedPanel)}
                </DockSlot>
              );
            };

            if (DockSlotType.isLeft(slot)) {
              return renderSlot(DockSlotType.Left);
            }

            return (
              <React.Fragment key="canvas-and-right">
                {canvasSlot ? (
                  <div
                    className="flex min-h-0 min-w-0 flex-1 flex-col"
                    data-testid="panel-host-canvas"
                  >
                    {canvasSlot}
                  </div>
                ) : null}
                {renderSlot(DockSlotType.Right)}
              </React.Fragment>
            );
          })}
        </div>
        {([DockSlotType.Bottom] as const).map((slot) => {
          const ids = buckets[slot];
          const allIds = ids ?? [];
          const expandedIds = allIds.filter((id) => panels[id]?.minimized === false);
          const minimizedIds = allIds.filter((id) => panels[id]?.minimized === true);
          const hasAny = allIds.length > 0;
          if (!hasAny && !isDragActive) {
            return <DockSlot key={slot} slot={slot} className="hidden" dragActive={false} />;
          }

          return (
            <DockSlot
              key={slot}
              slot={slot}
              dragActive={isDragActive}
              minimizedRail={
                <MinimizedRail slot={slot} ids={minimizedIds} onRestore={restorePanel} />
              }
            >
              {expandedIds.map(renderExpandedPanel)}
            </DockSlot>
          );
        })}
      </div>
      {buckets[DockSlotType.Floating].map((id) => {
        const def = getPanel(id);
        if (!def) {
          return null;
        }
        const state = panels[id];
        const rect = state.floatingRect ?? { x: 120, y: 120, width: 320, height: 240 };

        return (
          <FloatingWindow
            key={id}
            panelId={id}
            rect={rect}
            onDragChange={(isDragging) => setActiveDragId(isDragging ? `direct:${id}` : null)}
          >
            {(handleProps) => (
              <PanelChrome
                panelId={id}
                title={def.title}
                collapsed={state.minimized}
                onToggleCollapse={() => togglePanel(id)}
                onMinimize={() => minimizePanel(id)}
                onClose={() => closePanel(id)}
                dragHandleProps={handleProps}
              >
                {renderBody(id)}
              </PanelChrome>
            )}
          </FloatingWindow>
        );
      })}
    </DndContext>
  );
}
