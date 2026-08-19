/**
 * Snap debug HUD.
 *
 * Purely presentational overlay that renders the numeric telemetry from
 * `computeAlignment`'s `debug` block: which edge was chosen on each
 * axis, the snap distance in both image and screen pixels, and the
 * merged guide count. Rendered by SelectionOverlay while a drag is
 * active AND `snap.debug` is on; hidden otherwise. Not a control: no
 * pointer events, no focus surface.
 */
import type { AlignResult, AlignGuide } from "@/lib/editor/align";

interface Props {
  debug: NonNullable<AlignResult["debug"]> | null;
  guides: readonly AlignGuide[];
  /** Current zoom, used to convert image-space distances to screen px. */
  zoom: number;
  /** Screen-space tolerance so the user can compare to the actual band. */
  tolerancePx: number;
}

const EDGE_LABEL: Record<string, string> = {
  l: "west",
  r: "east",
  cx: "center-x",
  t: "north",
  b: "south",
  cy: "center-y",
};

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

export function SnapDebugHud({
  debug,
  guides,
  zoom,
  tolerancePx,
}: Props): React.JSX.Element | null {
  const kindCounts = { edge: 0, center: 0, bounds: 0 } as Record<AlignGuide["kind"], number>;
  for (const g of guides) kindCounts[g.kind] += 1;

  return (
    <div
      aria-hidden
      data-testid="snap-debug-hud"
      className="pointer-events-none absolute right-2 top-2 z-40 select-none rounded-md border border-ca-border/10 bg-ca-bg/80 px-2 py-1.5 text-[11px] leading-tight text-ca-ink shadow-lg backdrop-blur-sm"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-ca-ink/60">snap debug</span>
        <span className="text-ca-ink/40">z {fmt(zoom)}×</span>
        <span className="text-ca-ink/40">tol {tolerancePx}px</span>
      </div>
      <div className="mt-1 grid grid-cols-[auto_auto_auto_auto] gap-x-2 gap-y-0.5">
        <span className="text-ca-ink/50">axis</span>
        <span className="text-ca-ink/50">edge</span>
        <span className="text-ca-ink/50">dist(img)</span>
        <span className="text-ca-ink/50">dist(scr)</span>
        <span className="text-ca-ink/70">X</span>
        {debug?.x ? (
          <>
            <span data-testid="snap-debug-x-edge">{EDGE_LABEL[debug.x.edge] ?? debug.x.edge}</span>
            <span data-testid="snap-debug-x-dist-img">{fmt(debug.x.dist)}</span>
            <span data-testid="snap-debug-x-dist-scr">{fmt(debug.x.dist * zoom)}</span>
          </>
        ) : (
          <>
            <span className="text-ca-ink/40">-</span>
            <span className="text-ca-ink/40">-</span>
            <span className="text-ca-ink/40">-</span>
          </>
        )}
        <span className="text-ca-ink/70">Y</span>
        {debug?.y ? (
          <>
            <span data-testid="snap-debug-y-edge">{EDGE_LABEL[debug.y.edge] ?? debug.y.edge}</span>
            <span data-testid="snap-debug-y-dist-img">{fmt(debug.y.dist)}</span>
            <span data-testid="snap-debug-y-dist-scr">{fmt(debug.y.dist * zoom)}</span>
          </>
        ) : (
          <>
            <span className="text-ca-ink/40">-</span>
            <span className="text-ca-ink/40">-</span>
            <span className="text-ca-ink/40">-</span>
          </>
        )}
      </div>
      <div className="mt-1 flex gap-2 text-ca-ink/60">
        <span data-testid="snap-debug-guides-edge">edge {kindCounts.edge}</span>
        <span data-testid="snap-debug-guides-center">center {kindCounts.center}</span>
        <span data-testid="snap-debug-guides-bounds">bounds {kindCounts.bounds}</span>
      </div>
      {debug?.x?.target !== undefined && (
        <div className="mt-1 text-ca-ink/50">
          <span data-testid="snap-debug-x-target">
            x: {fmt(debug.x.from)} → {fmt(debug.x.target)}
          </span>
        </div>
      )}
      {debug?.y?.target !== undefined && (
        <div className="text-ca-ink/50">
          <span data-testid="snap-debug-y-target">
            y: {fmt(debug.y.from)} → {fmt(debug.y.target)}
          </span>
        </div>
      )}
    </div>
  );
}
