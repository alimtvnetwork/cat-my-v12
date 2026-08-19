import { EditorRuleKindType } from "@/lib/editor/types";
// Calibration-derived pass-threshold suggestions for the rule editor.
//
// Values are sourced directly from worker/calibration-report.json so
// re-running worker/calibrate.py updates the UI defaults. The Python
// scorer returns a score in [0, 1] per rule; the suggested threshold
// is the separation midpoint between the pass and fail populations,
// which gives operators equal headroom on both sides.
import type { EditorRuleKind } from "@/lib/editor/types";
import report from "../../../worker/calibration-report.json";

export interface CalibrationSuggestion {
  kind: EditorRuleKind;
  /** Recommended UI default pass threshold in [0, 1]. */
  threshold: number;
  /** F1 achieved on the fixtures at the calibrated cutoff. */
  f1: number;
  /** Number of labeled fixtures used to derive the cutoff. */
  samples: number;
  /** Short one-line rationale shown in tooltips. */
  rationale: string;
}

interface ReportEntry {
  n: number;
  threshold: number;
  f1: number;
  separation: {
    midpoint: number;
    margin: number;
    separable: boolean;
    pass_min: number;
    fail_max: number;
  };
}

const perKind = (report as { per_kind: Record<string, ReportEntry> }).per_kind;

const RATIONALES: Record<EditorRuleKind, string> = {
  C: "Colour scorer: midpoint between fixture pass/fail populations.",
  R: "Reference match: midpoint between fixture pass/fail populations.",
  K: "OCR/edge scorer: midpoint between fixture pass/fail populations.",
  S: "Shape/text pattern: midpoint between fixture pass/fail populations.",
  E: "Emptiness/expression: midpoint between fixture pass/fail populations.",
};

function round2(n: number): number {

  return Math.round(n * 100) / 100;
}

function buildSuggestion(kind: EditorRuleKind): CalibrationSuggestion | null {
  const entry = perKind[kind];

  if (!entry) return null;
  const { midpoint, margin, separable } = entry.separation;
  const rationale = separable
    ? `${RATIONALES[kind]} Margin ${round2(margin)}.`
    : `${RATIONALES[kind]} Populations overlap (margin ${round2(margin)}), review fixtures.`;

  return {
    kind,
    threshold: round2(midpoint),
    f1: entry.f1,
    samples: entry.n,
    rationale,
  };
}

const KINDS: readonly EditorRuleKind[] = [
  EditorRuleKindType.C,
  EditorRuleKindType.R,
  EditorRuleKindType.K,
  EditorRuleKindType.S,
  EditorRuleKindType.E,
];

const SUGGESTIONS: Partial<Record<EditorRuleKind, CalibrationSuggestion>> = Object.fromEntries(
  KINDS.map((k) => [k, buildSuggestion(k)]).filter(([, v]) => v !== null),
) as Partial<Record<EditorRuleKind, CalibrationSuggestion>>;

export function getCalibrationSuggestion(kind: EditorRuleKind): CalibrationSuggestion | null {

  return SUGGESTIONS[kind] ?? null;
}

export function getAllCalibrationSuggestions(): CalibrationSuggestion[] {

  return Object.values(SUGGESTIONS).filter((s): s is CalibrationSuggestion => s !== undefined);
}
