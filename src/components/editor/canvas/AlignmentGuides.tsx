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

export function AlignmentGuides({ guides, viewport, canvasSize }: Props): React.JSX.Element | null {
  const snap = useSnap();
  // Users can hide guides via the snap-threshold HUD; snap behaviour
  // itself stays on, this just declutters the canvas.
  if (snap.showGuides === false) {
    return null;
  }
  if (guides.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden
      data-testid="alignment-guides"
      className="pointer-events-none absolute inset-0"
      style={{ width: canvasSize.width, height: canvasSize.height }}
    >
      {guides.map((guide, guideIndex) => {
        if (guide.orientation === "v") {
          const fromPoint = imageToScreen({ x: guide.pos, y: guide.from }, viewport);
          const toPoint = imageToScreen({ x: guide.pos, y: guide.to }, viewport);
          const top = Math.min(fromPoint.y, toPoint.y);
          const height = Math.abs(toPoint.y - fromPoint.y);

          return (
            <div
              key={`v-${guide.pos}-${guide.kind}-${guideIndex}`}
              data-testid={`align-guide-v-${guide.kind}`}
              className="absolute"
              style={{
                left: fromPoint.x - 0.5,
                top,
                width: 1,
                height: Math.max(1, height),
                background: KIND_COLOR[guide.kind],
                boxShadow: `0 0 0 0.5px ${KIND_COLOR[guide.kind]}`,
                opacity: 0.9,
              }}
            />
          );
        }

        const fromPoint = imageToScreen({ x: guide.from, y: guide.pos }, viewport);
        const toPoint = imageToScreen({ x: guide.to, y: guide.pos }, viewport);
        const left = Math.min(fromPoint.x, toPoint.x);
        const width = Math.abs(toPoint.x - fromPoint.x);

        return (
          <div
            key={`h-${guide.pos}-${guide.kind}-${guideIndex}`}
            data-testid={`align-guide-h-${guide.kind}`}
            className="absolute"
            style={{
              left,
              top: fromPoint.y - 0.5,
              width: Math.max(1, width),
              height: 1,
              background: KIND_COLOR[guide.kind],
              boxShadow: `0 0 0 0.5px ${KIND_COLOR[guide.kind]}`,
              opacity: 0.9,
            }}
          />
        );
      })}
    </div>
  );
}
