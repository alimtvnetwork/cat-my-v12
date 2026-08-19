import { RotateCw } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";

interface Props {
  tl: { x: number; y: number };
  br: { x: number; y: number };
  theta: number;
  boxCenter: { x: number; y: number };
  atAngleBound: boolean;
  isRotating: boolean;
  ringColor: string;
  onRotateDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onRotateMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onRotateUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onRotateKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
}

export function SelectionOverlayRotationHandles({
  tl,
  br,
  theta,
  boxCenter,
  atAngleBound,
  isRotating,
  ringColor,
  onRotateDown,
  onRotateMove,
  onRotateUp,
  onRotateKeyDown,
}: Props) {
  const rad = (theta * Math.PI) / 180;
  const halfW = (br.x - tl.x) / 2;
  const halfH = (br.y - tl.y) / 2;
  // Rotate handles at ALL FOUR corners so operators can grab
  // whichever corner is closest; every handle drives the same
  // rotate pointer sequence, so users can rotate freely in any
  // direction (slide, rotate, or free-form) from any corner.
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners: Array<{ id: string; ax: number; ay: number }> = [
    { id: "ne", ax: halfW + 14, ay: -halfH - 14 },
    { id: "nw", ax: -halfW - 14, ay: -halfH - 14 },
    { id: "se", ax: halfW + 14, ay: halfH + 14 },
    { id: "sw", ax: -halfW - 14, ay: halfH + 14 },
  ];
  const positions = corners.map((c) => ({
    id: c.id,
    hx: boxCenter.x + c.ax * cos - c.ay * sin,
    hy: boxCenter.y + c.ax * sin + c.ay * cos,
  }));
  const primary = positions[0];

  return (
    <>
      {positions.map((p) => (
        <div
          key={p.id}
          role="button"
          aria-label={`Rotate (${p.id})`}
          tabIndex={atAngleBound ? -1 : 0}
          data-testid={
            p.id === "ne" ? "rule-rotate-handle" : `rule-rotate-handle-${p.id}`
          }
          data-at-bound={atAngleBound ? "true" : undefined}
          aria-disabled={atAngleBound || undefined}
          className="pointer-events-auto absolute z-40 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          style={{
            left: p.hx,
            top: p.hy,
            cursor: atAngleBound ? "not-allowed" : "alias",
            touchAction: "none",
          }}
          onPointerDown={onRotateDown}
          onPointerMove={onRotateMove}
          onPointerUp={onRotateUp}
          onPointerCancel={onRotateUp}
          onKeyDown={onRotateKeyDown}
        >
          {/* Plan 87 Step 10: outer 28x28 transparent hit target,
            inner 20x20 visible pip. Visual footprint unchanged,
            pointer/keyboard target now clears WCAG 2.5.5. */}
          <span
            aria-hidden
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-md transition group-hover:brightness-110 ${
              atAngleBound ? "bg-destructive" : "bg-ca-select"
            }`}
          >
            <RotateCw size={11} className="text-white" />
          </span>
        </div>
      ))}
      {isRotating ? (
        <span
          data-testid="rule-rotate-live-badge"
          aria-live="polite"
          data-at-bound={atAngleBound ? "true" : undefined}
          className={`pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap rounded-sm border bg-popover/95 px-1.5 py-0.5 font-mono text-[13px] leading-none shadow-md tabular-nums backdrop-blur-sm ${
            atAngleBound ? "text-destructive" : "text-foreground"
          }`}
          style={{
            left: primary.hx,
            top: primary.hy - 18,
            borderColor: atAngleBound ? "hsl(var(--destructive))" : ringColor,
          }}
        >
          θ {theta.toFixed(1)}°{atAngleBound ? " · limit" : ""}
        </span>
      ) : theta !== 0 ? (
        /* Plan 79 Step 35: persistent θ badge above the rotate
           handle whenever the ROI is rotated. Same anchor as the
           live drag chip so operators see one authoritative angle
           readout in one place. Hidden at 0°. */
        <span
          data-testid="rule-rotation-badge"
          className="pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap rounded-sm border bg-popover/95 px-1.5 py-0.5 font-mono text-[13px] font-medium leading-none text-foreground shadow-sm tabular-nums backdrop-blur-sm"
          style={{
            left: primary.hx,
            top: primary.hy - 18,
            borderColor: ringColor,
          }}
        >
          θ {theta.toFixed(1)}°
        </span>
      ) : null}
    </>
  );
}
