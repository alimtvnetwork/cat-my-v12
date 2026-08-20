import type { MarqueeRect } from "@/lib/editor/marquee";
import type { Viewport } from "@/lib/editor/types";

interface CanvasViewportMarqueeProps {
  marqueeRect: MarqueeRect | null;
  viewport: Viewport;
}

export function CanvasViewportMarquee({ marqueeRect, viewport }: CanvasViewportMarqueeProps) {
  if (!marqueeRect) return null;

  return (
    <div
      data-testid="canvas-marquee"
      aria-hidden="true"
      className="pointer-events-none absolute rounded-[2px] border border-dashed border-ca-focus bg-ca-focus/10"
      style={{
        left: viewport.panX + marqueeRect.x * viewport.zoom,
        top: viewport.panY + marqueeRect.y * viewport.zoom,
        width: Math.max(1, marqueeRect.width * viewport.zoom),
        height: Math.max(1, marqueeRect.height * viewport.zoom),
      }}
    />
  );
}
