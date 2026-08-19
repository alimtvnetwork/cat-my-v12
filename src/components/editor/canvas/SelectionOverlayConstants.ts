import { EditorRuleKindType } from "@/lib/editor/types";
import { type EditorRuleKind } from "@/lib/editor/types";
import { type HudParamSpec } from "./SelectionOverlayUtils";

export enum RuleActionKindType {
  Duplicate = "duplicate",
  Delete = "delete",
  Togglelock = "toggleLock",
  Togglehidden = "toggleHidden",
  Moveup = "moveUp",
  Movedown = "moveDown",
  Bringtofront = "bringToFront",
  Sendtoback = "sendToBack",
  Movetoindex = "moveToIndex",
  Rename = "rename",
}
export type RuleActionKind = RuleActionKindType;

export const KIND_ORDER: readonly EditorRuleKind[] = [
  EditorRuleKindType.C,
  EditorRuleKindType.R,
  EditorRuleKindType.K,
  EditorRuleKindType.S,
  EditorRuleKindType.E,
];

// Two-tier focus blur radii. Applied as backdrop-filter through an SVG
// mask so the shape interior stays perfectly clear (no tint, no blur),
// the bounding-rect band around the shape gets a light blur, and
// everything else on the canvas gets a stronger blur. This gives the
// operator an unmistakable "spotlight" on the selected ROI.
export const OUTER_BLUR_PX = 6;
export const INNER_BAND_BLUR_PX = 2;



export const HUD_PARAMS: HudParamSpec[] = [
  { key: "threshold", label: "Threshold", min: 0, max: 100, step: 1, suffix: "%" },
  { key: "similarity", label: "Similarity", min: 0, max: 100, step: 1, suffix: "%" },
  { key: "radius", label: "Radius", min: 0, max: 200, step: 1, suffix: "px" },
  { key: "minArea", label: "Min area", min: 0, max: 100000, step: 10, suffix: "px²" },
  { key: "blur", label: "Blur", min: 0, max: 20, step: 0.5, suffix: "px" },
  { key: "tolerance", label: "Tolerance", min: 0, max: 100, step: 1 },
  // Plan 100 Phase I: rotation acceptance zone. Operators tune the
  // min/max angle the rule will accept after slide/rotate; e.g. a
  // component with keep-out orientation may accept [-2°, +2°] while a
  // free-rotation ROI accepts [-45°, +45°]. Persisted as rule params
  // so downstream evaluators can enforce them.
  { key: "angleMin", label: "Angle min", min: -180, max: 180, step: 0.5, suffix: "°" },
  { key: "angleMax", label: "Angle max", min: -180, max: 180, step: 0.5, suffix: "°" },
];

export const HANDLES: Array<{ id: string; cursor: string; sx: number; sy: number }> = [
  { id: "nw", cursor: "nwse-resize", sx: 0, sy: 0 },
  { id: "n", cursor: "ns-resize", sx: 0.5, sy: 0 },
  { id: "ne", cursor: "nesw-resize", sx: 1, sy: 0 },
  { id: "e", cursor: "ew-resize", sx: 1, sy: 0.5 },
  { id: "se", cursor: "nwse-resize", sx: 1, sy: 1 },
  { id: "s", cursor: "ns-resize", sx: 0.5, sy: 1 },
  { id: "sw", cursor: "nesw-resize", sx: 0, sy: 1 },
  { id: "w", cursor: "ew-resize", sx: 0, sy: 0.5 },
];
