export enum TriggerTimingDiagramPropsEdgeType {
  Rising = "rising",
  Falling = "falling",
}
// Plan 81 step 9: pure-SVG timing chart for the trigger settings page.
// Renders a stylized digital signal with an edge marker (rising/falling)
// and a shaded debounce window scaled to the configured milliseconds.
// No side effects; safe to render on SSR.

export interface TriggerTimingDiagramProps {
  edge: TriggerTimingDiagramPropsEdgeType;
  debounceMs: number;
  source: string;
}

export function TriggerTimingDiagram({ edge, debounceMs, source }: TriggerTimingDiagramProps): React.JSX.Element | null {
  const width = 640;
  const height = 180;
  const midY = height / 2;
  const highY = 40;
  const lowY = height - 40;
  const edgeX = 200;
  // 100 ms window maps to 200 px so the diagram never overflows.
  const debounceW = Math.max(2, Math.min(300, debounceMs * 2));
  const isRising = edge === "rising";
  const startY = isRising ? lowY : highY;
  const endY = isRising ? highY : lowY;
  const path = `M0 ${startY} L${edgeX} ${startY} L${edgeX} ${endY} L${width} ${endY}`;

  return (
    <figure
      className="w-full overflow-hidden rounded-md border border-ca-border bg-ca-panel-2"
      aria-label={`Timing diagram for ${source} trigger, ${edge} edge, ${debounceMs} millisecond debounce`}
    >
      <svg role="img" viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full">
        <defs>
          <pattern id="ttd-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeOpacity="0.08" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#ttd-grid)" className="text-ca-ink" />
        {/* Debounce window */}
        <rect
          x={edgeX}
          y={20}
          width={debounceW}
          height={height - 40}
          className="fill-ca-select"
          opacity="0.15"
        />
        <line
          x1={edgeX + debounceW}
          y1={20}
          x2={edgeX + debounceW}
          y2={height - 20}
          className="stroke-ca-select"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
        {/* Signal */}
        <path d={path} className="stroke-ca-select" strokeWidth="2.5" fill="none" />
        {/* Edge marker */}
        <circle cx={edgeX} cy={midY} r={5} className="fill-ca-ok" />
        {/* Labels */}
        <text x={edgeX + 8} y={16} className="fill-ca-ink" fontSize="12">
          {edge === "rising" ? "Rising edge" : "Falling edge"}
        </text>
        <text
          x={edgeX + debounceW / 2}
          y={height - 6}
          textAnchor="middle"
          className="fill-ca-ink-muted"
          fontSize="11"
        >
          Debounce {debounceMs} ms
        </text>
        <text x={8} y={16} className="fill-ca-ink-muted" fontSize="11">
          Source: {source}
        </text>
      </svg>
    </figure>
  );
}
