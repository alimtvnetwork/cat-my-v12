/**
 * Smart-align guide overlay. Renders the vertical / horizontal snap
 * lines produced by `computeAlignment` in image space, mapped to screen
 * coordinates via the active viewport. Purely presentational so the
 * SelectionOverlay owns the guides state and clears it on pointer-up.
 */
import type { AlignGuide } from "@/lib/editor/align";
import { imageToScreen } from "@/lib/editor/coords";
import type { Viewport } from "@/lib/editor/types";
import { useSnap } from "@/lib/editor/snap-store";

interface Props {
  guides: readonly AlignGuide[];
  viewport: Viewport;
  canvasSize: { width: number; height: number };
}

const KIND_COLOR: Record<AlignGuide["kind"], string> = {
  edge: "var(--ca-select, #8b5cf6)",
  center: "#22d3ee",
  bounds: "#f59e0b",
};

export function AlignmentGuides({ guides, viewport, canvasSize }: Props) {
  const snap = useSnap();
  // Users can hide guides via the snap-threshold HUD; snap behaviour
  // itself stays on, this just declutters the canvas.
  if (snap.showGuides === false) return null;

  if (guides.length === 0) return null;

  return (
    <div
      aria-hidden
      data-testid="alignment-guides"
      className="pointer-events-none absolute inset-0"
      style={{ width: canvasSize.width, height: canvasSize.height }}
    >
      {guides.map((g, i) => {
        if (g.orientation === "v") {
          const p = imageToScreen({ x: g.pos, y: g.from }, viewport);
          const q = imageToScreen({ x: g.pos, y: g.to }, viewport);
          const top = Math.min(p.y, q.y);
          const height = Math.abs(q.y - p.y);

          return (
            <div
              key={`v-${g.pos}-${g.kind}-${i}`}
              data-testid={`align-guide-v-${g.kind}`}
              className="absolute"
              style={{
                left: p.x - 0.5,
                top,
                width: 1,
                height: Math.max(1, height),
                background: KIND_COLOR[g.kind],
                boxShadow: `0 0 0 0.5px ${KIND_COLOR[g.kind]}`,
                opacity: 0.9,
              }}
            />
          );
        }

        const p = imageToScreen({ x: g.from, y: g.pos }, viewport);
        const q = imageToScreen({ x: g.to, y: g.pos }, viewport);
        const left = Math.min(p.x, q.x);
        const width = Math.abs(q.x - p.x);

        return (
          <div
            key={`h-${g.pos}-${g.kind}-${i}`}
            data-testid={`align-guide-h-${g.kind}`}
            className="absolute"
            style={{
              left,
              top: p.y - 0.5,
              width: Math.max(1, width),
              height: 1,
              background: KIND_COLOR[g.kind],
              boxShadow: `0 0 0 0.5px ${KIND_COLOR[g.kind]}`,
              opacity: 0.9,
            }}
          />
        );
      })}
    </div>
  );
}
