import { EditorRuleKindType } from "@/lib/editor/types";
// Per-rule distribution stats sourced directly from
// worker/calibration-report.json. Exposed so the rule editor can show
// operators why a threshold was recommended: p05..p95, mean/std, the
// separation midpoint, and 10-bin histograms of the pass/fail scores.
import type { EditorRuleKind } from "@/lib/editor/types";
import report from "../../../worker/calibration-report.json";

export interface DistributionStats {
  mean: number;
  std: number;
  p05: number;
  p95: number;
}

export interface CalibrationStats {
  pass: DistributionStats;
  fail: DistributionStats;
  /** True when pass_min > fail_max on the fixture set. */
  separable: boolean;
  /** pass_min - fail_max; larger is a cleaner split. */
  margin: number;
  /** Midpoint between fail_max and pass_min, i.e. the safest cutoff. */
  midpoint: number;
  /** 10-bin histogram of pass scores across [0, 1]. */
  passHistogram: readonly number[];
  /** 10-bin histogram of fail scores across [0, 1]. */
  failHistogram: readonly number[];
}

interface DistBlock {
  mean: number;
  std: number;
  p05: number;
  p95: number;
  histogram: number[];
}

interface ReportEntry {
  distributions: { pass: DistBlock; fail: DistBlock };
  separation: { midpoint: number; margin: number; separable: boolean };
}

const perKind = (report as { per_kind: Record<string, ReportEntry> }).per_kind;

function toStats(entry: ReportEntry): CalibrationStats {
  const { pass, fail } = entry.distributions;
  const { midpoint, margin, separable } = entry.separation;

  return {
    pass: { mean: pass.mean, std: pass.std, p05: pass.p05, p95: pass.p95 },
    fail: { mean: fail.mean, std: fail.std, p05: fail.p05, p95: fail.p95 },
    separable,
    margin,
    midpoint,
    passHistogram: pass.histogram,
    failHistogram: fail.histogram,
  };
}

const KINDS: readonly EditorRuleKind[] = [
  EditorRuleKindType.C,
  EditorRuleKindType.R,
  EditorRuleKindType.K,
  EditorRuleKindType.S,
  EditorRuleKindType.E,
];

const STATS: Partial<Record<EditorRuleKind, CalibrationStats>> = Object.fromEntries(
  KINDS.filter((k) => perKind[k]).map((k) => [k, toStats(perKind[k])]),
);

export function getCalibrationStats(kind: EditorRuleKind): CalibrationStats | null {

  return STATS[kind] ?? null;
}
