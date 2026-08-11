// Rule-kind parameter presets. Applied from the floating properties HUD
// so operators can flip a region between common tunings (strict / balanced
// / loose) in one click. Pure data + one merge helper: no store access, no
// side effects, safe to import from anywhere.
//
// Merge policy: preset values overwrite matching keys, all other params
// (e.g. user-picked `color`) are preserved. `updateParams` in the store
// coalesces the resulting write into a single history entry so undo
// reverts a preset application in one step.

import type { EditorRuleKind, EditorRuleParams } from "./types";

export interface RulePreset {
  id: string;
  label: string;
  description: string;
  params: EditorRuleParams;
}

const COMMON_STRICT: EditorRuleParams = {
  threshold: 90,
  similarity: 95,
  tolerance: 5,
  blur: 0,
};

const COMMON_BALANCED: EditorRuleParams = {
  threshold: 70,
  similarity: 80,
  tolerance: 15,
  blur: 1,
};

const COMMON_LOOSE: EditorRuleParams = {
  threshold: 45,
  similarity: 60,
  tolerance: 30,
  blur: 2.5,
};

// Only params that already exist in the HUD (`HUD_PARAMS`) are covered so
// the operator sees the effect immediately. Add more keys here as new HUD
// rows land.
export const RULE_PRESETS: Record<EditorRuleKind, RulePreset[]> = {
  // C = ROI (circle blob). Radius + minArea dominate.
  C: [
    {
      id: "roi-strict",
      label: "Strict",
      description: "Small, tight blob. High similarity, low tolerance.",
      params: { ...COMMON_STRICT, radius: 20, minArea: 200 },
    },
    {
      id: "roi-balanced",
      label: "Balanced",
      description: "Everyday inspection. Moderate radius and tolerance.",
      params: { ...COMMON_BALANCED, radius: 40, minArea: 500 },
    },
    {
      id: "roi-loose",
      label: "Loose",
      description: "Large or variable blob. Higher blur, lower threshold.",
      params: { ...COMMON_LOOSE, radius: 80, minArea: 1500 },
    },
  ],
  // R = Rect (bounded region). No radius, use tolerance-driven presets.
  R: [
    {
      id: "rect-strict",
      label: "Strict",
      description: "Sharp edges, minimal blur.",
      params: { ...COMMON_STRICT, minArea: 300 },
    },
    {
      id: "rect-balanced",
      label: "Balanced",
      description: "Everyday inspection defaults.",
      params: { ...COMMON_BALANCED, minArea: 800 },
    },
    {
      id: "rect-loose",
      label: "Loose",
      description: "Rough surfaces or lighting drift.",
      params: { ...COMMON_LOOSE, minArea: 2000 },
    },
  ],
  // K = OCR Anchor. Similarity weight is the key knob.
  K: [
    {
      id: "ocr-anchor-strict",
      label: "Strict",
      description: "High-contrast prints. Tight similarity.",
      params: { threshold: 88, similarity: 92, tolerance: 4, blur: 0 },
    },
    {
      id: "ocr-anchor-balanced",
      label: "Balanced",
      description: "Everyday marking anchors.",
      params: { threshold: 72, similarity: 82, tolerance: 12, blur: 0.5 },
    },
    {
      id: "ocr-anchor-loose",
      label: "Loose",
      description: "Worn or laser-etched marks.",
      params: { threshold: 55, similarity: 68, tolerance: 25, blur: 1.5 },
    },
  ],
  // S = Text.
  S: [
    {
      id: "text-strict",
      label: "Strict",
      description: "Exact text match, no fuzzy allowance.",
      params: { threshold: 92, similarity: 96, tolerance: 2, blur: 0 },
    },
    {
      id: "text-balanced",
      label: "Balanced",
      description: "Everyday OCR read.",
      params: { threshold: 75, similarity: 85, tolerance: 10, blur: 0.5 },
    },
    {
      id: "text-loose",
      label: "Loose",
      description: "Faded or partial text.",
      params: { threshold: 55, similarity: 65, tolerance: 22, blur: 1.5 },
    },
  ],
  // E = Math. Tolerance-only.
  E: [
    {
      id: "math-strict",
      label: "Strict",
      description: "Exact result. Zero tolerance band.",
      params: { tolerance: 1 },
    },
    {
      id: "math-balanced",
      label: "Balanced",
      description: "Small allowance for measurement noise.",
      params: { tolerance: 10 },
    },
    {
      id: "math-loose",
      label: "Loose",
      description: "Wide acceptance band.",
      params: { tolerance: 25 },
    },
  ],
};

export function getPresetsForKind(kind: EditorRuleKind): readonly RulePreset[] {
  return RULE_PRESETS[kind] ?? [];
}

/**
 * Merge a preset's params into an existing param bag. Preset keys win,
 * non-preset keys (e.g. `color`, tool-specific metadata) are preserved.
 * Pure: does not touch the store.
 */
export function applyPresetParams(
  current: EditorRuleParams | undefined,
  preset: RulePreset,
): EditorRuleParams {
  return { ...(current ?? {}), ...preset.params };
}