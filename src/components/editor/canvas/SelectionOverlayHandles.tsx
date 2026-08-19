import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { HANDLES } from "./SelectionOverlayConstants";

interface Props {
  tl: { x: number; y: number };
  br: { x: number; y: number };
  boxCenter: { x: number; y: number };
  theta: number;
  onHandleDown: (
    e: ReactPointerEvent<HTMLDivElement>,
    handle: string,
    expected: { x: number; y: number },
  ) => void;
  onHandleMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onHandleUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>, handle: string) => void;
}

export function SelectionOverlayHandles({
  tl,
  br,
  boxCenter,
  theta,
  onHandleDown,
  onHandleMove,
  onHandleUp,
  onResizeKeyDown,
}: Props): React.JSX.Element | null {
  // Resize grips must ride along with the rotated bounding
  // rectangle. Compute their axis-aligned position, then
  // rotate that offset around boxCenter by theta so grips
  // stay glued to the visual edges/corners regardless of the
  // current rotation. Cursor angles are also offset by theta
  // so a rotated N-edge shows an N-oriented cursor.
  const rad = (theta * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Derive the cursor per-handle from the handle's own
  // resize-axis in image space, then rotate that axis by
  // theta and snap to the nearest 45° cursor. Doing it
  // geometrically (from sx/sy) instead of via a base-cursor
  // lookup keeps every handle correct: edges point along
  // their outward normal, corners along the true diagonal,
  // and mirrored handles (e.g. nw/se) resolve identically
  // because cursors are undirected.
  const cursorForHandle = (sx: number, sy: number): string => {
    // Axis vector in image space, pre-rotation (E=+x, S=+y).
    const vx = sx - 0.5;
    const vy = sy - 0.5;

    if (vx === 0 && vy === 0) return "move";
    // Rotate by theta.
    const rx = vx * cos - vy * sin;
    const ry = vx * sin + vy * cos;
    // Angle in degrees, 0 = east, positive = clockwise
    // (screen y-down). Fold to [0,180) since cursors are
    // undirected, then snap to the nearest 45°.
    let deg = (Math.atan2(ry, rx) * 180) / Math.PI;
    deg = ((deg % 180) + 180) % 180;
    const snap = Math.round(deg / 45) % 4;
    switch (snap) {
      case 0:
        return "ew-resize";
      case 1:
        return "nwse-resize";
      case 2:
        return "ns-resize";
      case 3:
        return "nesw-resize";
      default:
        return "ew-resize";
    }
  };

  return (
    <>
      {HANDLES.map((h) => {
        const ax = tl.x + (br.x - tl.x) * h.sx - boxCenter.x;
        const ay = tl.y + (br.y - tl.y) * h.sy - boxCenter.y;
        const x = boxCenter.x + ax * cos - ay * sin;
        const y = boxCenter.y + ax * sin + ay * cos;

        return (
          <div
            key={h.id}
            role="button"
            aria-label={`Resize ${h.id}`}
            tabIndex={0}
            data-testid={`rule-resize-handle-${h.id}`}
            className="pointer-events-auto absolute z-50 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            style={{
              left: x,
              top: y,
              cursor: cursorForHandle(h.sx, h.sy),
              touchAction: "none",
            }}
            onPointerDown={(e) => onHandleDown(e, h.id, { x, y })}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
            onKeyDown={(e) => onResizeKeyDown(e, h.id)}
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-sm border-2 border-white bg-ca-select shadow-md"
            />
          </div>
        );
      })}
    </>
  );
}
