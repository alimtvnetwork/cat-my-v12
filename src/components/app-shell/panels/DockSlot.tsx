/**
 * Plan 65 step 7 (SS-02): DockSlot.
 *
 * A droppable column that accepts panels for a specific dock (`left`,
 * `right`, `bottom`). Wires up dnd-kit's `useDroppable` and toggles a
 * `data-drop-active` attribute so the CSS in `src/styles.css` can render
 * the drop indicator. The reducer surface lives in
 * `src/lib/workspace/layout-slice.ts`; consumers call `dockPanel` in
 * `onDrop` and let this component only handle the drop-target UI.
 */

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { DockSlotType } from "@/lib/enums/ui";
import { useWorkspaceLayoutStore, dockMinSize, dockMaxSize } from "@/lib/workspace/layout-slice";

export interface DockSlotProps {
  slot: Exclude<DockSlotType, DockSlotType.Hidden | DockSlotType.Floating>;
  className?: string;
  /**
   * Plan 65 step 13: true while any panel drag is in flight. Lets the
   * slot paint an always-visible dashed target (not just on hover) so
   * users can see where a floating panel can land.
   */
  dragActive?: boolean;
  /**
   * Plan 65 step 14: optional 40px minimized-panels rail rendered on the
   * docked edge of the slot. Left / right slots place it on their outer
   * edge; the bottom slot places it above the panel column.
   */
  minimizedRail?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Plan 65 step 35: drag-to-resize handle rendered on the inner edge of a
 * dock (bottom edge of the top dock, right edge of the left dock, left
 * edge of the right dock, top edge of the bottom dock). Pointer capture keeps the drag active even
 * if the pointer leaves the handle. Commits the final size to the
 * layout store on pointerup so the reducer runs once per gesture and
 * persistence writes a single entry.
 */
function DockResizeHandle({
  slot,
  size,
  onResize,
  onCommit,
}: {
  slot: Exclude<DockSlotType, DockSlotType.Hidden | DockSlotType.Floating>;
  size: number;
  onResize: (px: number) => void;
  onCommit: (px: number) => void;
}) {
  const startRef = React.useRef<{ x: number; y: number; size: number } | null>(null);
  const latestRef = React.useRef(size);
  latestRef.current = size;
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Do not let the drag handle initiate a panel drag.
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, size };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;

    if (!s) return;
    let next: number;

    if (DockSlotType.isTop(slot)) next = s.size + (e.clientY - s.y);
    else if (DockSlotType.isLeft(slot)) next = s.size + (e.clientX - s.x);
    else if (DockSlotType.isRight(slot)) next = s.size - (e.clientX - s.x);
    else next = s.size - (e.clientY - s.y);

    if (next < dockMinSize(slot)) next = dockMinSize(slot);

    if (next > dockMaxSize(slot)) next = dockMaxSize(slot);
    latestRef.current = next;
    onResize(next);
  };
  const finish = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore, pointer already released
    }

    startRef.current = null;
    onCommit(latestRef.current);
  };

  return (
    <div
      role="separator"
      aria-orientation={
        DockSlotType.isTop(slot) || DockSlotType.isBottom(slot) ? "horizontal" : "vertical"
      }
      aria-label={`Resize ${slot} dock`}
      data-testid={`dock-resize-${slot}`}
      data-dock-resize={slot}
      className="panel-dock-resize"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    />
  );
}

export function DockSlot({
  slot,
  className,
  dragActive = false,
  minimizedRail,
  children,
}: DockSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id: `dock:${slot}`, data: { slot } });
  const storedSize = useWorkspaceLayoutStore((s) => s.dockSizes[slot]);
  const setDockSize = useWorkspaceLayoutStore((s) => s.setDockSize);
  // Local size for smooth drag; commits to store on pointerup.
  const [liveSize, setLiveSize] = React.useState<number | null>(null);
  const size = DockSlotType.isLeft(slot) ? 52 : (liveSize ?? storedSize);
  const canResize = DockSlotType.isLeft(slot) === false;
  const railBefore =
    DockSlotType.isTop(slot) || DockSlotType.isLeft(slot) || DockSlotType.isBottom(slot);
  // Expose the target size as a CSS variable; styles.css applies it as
  // width (left/right) or height (bottom) and resets on mobile stacking.
  const style = { ["--dock-size" as string]: `${size}px` } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      data-dock-slot={slot}
      data-drop-active={isOver ? "true" : "false"}
      data-drag-active={dragActive ? "true" : "false"}
      data-testid={`dock-slot-${slot}`}
      style={className?.includes("hidden") ? undefined : style}
      className={cn("panel-dock-slot", className)}
    >
      {railBefore ? minimizedRail : null}
      <div className="panel-dock-slot-column">{children}</div>
      {railBefore ? null : minimizedRail}
      {className?.includes("hidden") === false && canResize ? (
        <DockResizeHandle
          slot={slot}
          size={size}
          onResize={setLiveSize}
          onCommit={(px) => {
            setDockSize(slot, px);
            setLiveSize(null);
          }}
        />
      ) : null}
    </div>
  );
}
