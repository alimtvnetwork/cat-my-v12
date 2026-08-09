// Compact per-rule distribution readout shown under the pass-threshold
// slider so operators can see the p05..p95 spread, mean/std, and
// separation flag that drove the recommended cutoff. Data source:
// `src/lib/editor/calibration-stats.ts` (derived from
// worker/calibration-report.json).
import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { EditorRuleKind } from "@/lib/editor/types";
import { getCalibrationStats, type DistributionStats } from "@/lib/editor/calibration-stats";

export interface CalibrationStatsProps {
  kind: EditorRuleKind;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function StatRow({ label, s }: { label: string; s: DistributionStats }) {
  return (
    <div className="flex items-center justify-between gap-hmi-2 font-hmi-mono">
      <span className="text-ca-ink-muted">{label}</span>
      <span className="tabular-nums text-ca-ink">
        p05-p95 {fmt(s.p05)}-{fmt(s.p95)} - mean {fmt(s.mean)} +/- {fmt(s.std)}
      </span>
    </div>
  );
}

export function CalibrationStats({ kind }: CalibrationStatsProps) {
  const stats = getCalibrationStats(kind);

  if (!stats) return null;
  const sepLabel = stats.separable ? "Separable" : "Overlap";
  const SepIcon = stats.separable ? ShieldCheck : ShieldAlert;
  const sepTone = stats.separable ? "text-ca-primary" : "text-ca-warn";

  return (
    <div
      className="flex flex-col gap-hmi-1 border-l-2 border-ca-border/60 pl-hmi-2 text-hmi-caption"
      data-testid={`calibration-stats-${kind}`}
      aria-label={`Calibration distribution stats for kind ${kind}`}
    >
      <StatRow label="Pass" s={stats.pass} />
      <StatRow label="Fail" s={stats.fail} />
      <div className={`flex items-center gap-hmi-1 ${sepTone}`}>
        <SepIcon size={12} aria-hidden />
        <span>
          {sepLabel} - margin {fmt(stats.margin)}
        </span>
      </div>
    </div>
  );
}
