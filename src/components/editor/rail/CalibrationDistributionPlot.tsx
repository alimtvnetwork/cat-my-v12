// SVG plot of the pass/fail score histograms for a rule kind, with the
// calibration-derived midpoint drawn as a vertical marker and the
// separability margin surfaced as a caption. Rendered inside the
// pass-threshold tooltip so operators can see WHY the recommended cutoff
// sits where it does. Data source: `getCalibrationStats(kind)`.
import type { EditorRuleKind } from "@/lib/editor/types";
import { getCalibrationStats } from "@/lib/editor/calibration-stats";

export interface CalibrationDistributionPlotProps {
  kind: EditorRuleKind;
  /** Recommended threshold to highlight (dashed line). Optional. */
  threshold?: number;
  width?: number;
  height?: number;
}

const PAD = { top: 8, right: 8, bottom: 18, left: 8 };

export function CalibrationDistributionPlot({
  kind,
  threshold,
  width = 220,
  height = 96,
}: CalibrationDistributionPlotProps): React.JSX.Element | null {
  const stats = getCalibrationStats(kind);

  if (!stats) return null;
  const bins = stats.passHistogram.length;
  const maxCount = Math.max(1, ...stats.passHistogram, ...stats.failHistogram);
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const barW = innerW / bins;
  const x = (v: number) => PAD.left + v * innerW;
  const barY = (c: number) => PAD.top + innerH - (c / maxCount) * innerH;

  const bar = (c: number, i: number, fill: string, key: string) => (
    <rect
      key={key}
      x={PAD.left + i * barW + 1}
      y={barY(c)}
      width={Math.max(0, barW - 2)}
      height={PAD.top + innerH - barY(c)}
      fill={fill}
      opacity={0.75}
    />
  );

  const marginPct = Math.round(stats.margin * 100);

  return (
    <div
      className="flex flex-col gap-hmi-1"
      role="figure"
      aria-label={`Score distribution for kind ${kind}: pass and fail histograms with midpoint marker`}
    >
      <svg width={width} height={height} className="text-ca-ink">
        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          stroke="currentColor"
          strokeOpacity={0.15}
        />
        {stats.failHistogram.map((c, i) => bar(c, i, "hsl(var(--destructive))", `f${i}`))}
        {stats.passHistogram.map((c, i) => bar(c, i, "hsl(var(--ca-primary))", `p${i}`))}
        <line
          x1={x(stats.midpoint)}
          x2={x(stats.midpoint)}
          y1={PAD.top}
          y2={PAD.top + innerH}
          stroke="currentColor"
          strokeWidth={1.5}
        />
        <text
          x={x(stats.midpoint)}
          y={PAD.top + innerH + 12}
          textAnchor="middle"
          fontSize={10}
          fill="currentColor"
        >
          mid {stats.midpoint.toFixed(2)}
        </text>
        {typeof threshold === "number" && Number.isFinite(threshold) ? (
          <line
            x1={x(threshold)}
            x2={x(threshold)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeOpacity={0.7}
          />
        ) : null}
      </svg>
      <div className="flex items-center justify-between text-hmi-caption">
        <span className="inline-flex items-center gap-hmi-1">
          <span className="inline-block h-2 w-2 bg-ca-primary" aria-hidden />
          <span className="text-ca-ink-muted">pass</span>
          <span className="inline-block h-2 w-2 bg-destructive ml-hmi-1" aria-hidden />
          <span className="text-ca-ink-muted">fail</span>
        </span>
        <span className={stats.separable ? "text-ca-primary" : "text-ca-warn"}>
          {stats.separable ? "separable" : "overlap"} - margin {marginPct}%
        </span>
      </div>
    </div>
  );
}
