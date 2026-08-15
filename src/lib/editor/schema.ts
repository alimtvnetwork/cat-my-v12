import { PresenceModeType } from "@/lib/enums/editor";
// Editor rule schema v2. Introduced in Plan 31 step 6.
//
// v1 stored `params` as an untyped `Record<string,string|number|boolean>` and
// derived the concrete controller kind ad hoc from `params.kind`. v2 promotes
// `controller` to a first-class discriminator and types `params` per controller.
//
// On-disk format stays a plain JSON object; the union below only constrains
// the TypeScript layer. `ruleset-io.ts` validates on import; `migrations.ts`
// upgrades v1 payloads forward-only.

import type { EditorRule, EditorRuleKind } from "@/lib/editor/types";
import { ConditionTypeType, isConditionTypeType } from "@/types/rules/ConditionTypeType";
import { ColorModeType, isColorMode } from "@/types/rules/ColorModeType";
import { isPresenceMode } from "@/types/rules/PresenceModeType";
import {
  ValidationModeType,
  DEFAULT_VALIDATION_MODE,
  isValidationMode,
} from "@/types/rules/ValidationModeType";

// Plan 42 step 7. Bump from 2 to 3 covers both spec 47 (rule conditions) and
// spec 49 (ValidationModeType on the ruleset root). v2 payloads migrate forward
// only; see migrateRuleV2ToV3 in migrations.ts.
export const RULESET_SCHEMA_VERSION = 3 as const;
export const SUPPORTED_RULESET_VERSIONS = [1, 2, 3] as const;
export type SupportedRulesetVersion = (typeof SUPPORTED_RULESET_VERSIONS)[number];

export enum ControllerKindType {
  Presence = "presence",
  Absence = "absence",
  Ocr = "ocr",
  TextMatch = "textMatch",
  Number = "number",
  Math = "math",
  Color = "color",
  Pattern = "pattern",
  PatternEdge = "patternEdge",
  Blob = "blob",
}
export type ControllerKind = ControllerKindType;

export const CONTROLLER_KINDS: readonly ControllerKind[] = [
  ControllerKindType.Presence,
  ControllerKindType.Absence,
  ControllerKindType.Ocr,
  ControllerKindType.TextMatch,
  ControllerKindType.Number,
  ControllerKindType.Math,
  ControllerKindType.Color,
  ControllerKindType.Pattern,
  ControllerKindType.PatternEdge,
  ControllerKindType.Blob,
];

// Per-controller typed params. Field lists match
// spec/24-app-ui-design-system/05-rule-controller.md lines 40-49.
export interface ParamsPresence {
  threshold: number;
  minBlobPx: number;
}

export interface ParamsAbsence {
  threshold: number;
  minBlobPx: number;
}

export interface ParamsOcr {
  expectedText: string;
  caseInsensitive: boolean;
  stripWhitespace: boolean;
}

export interface ParamsTextMatch {
  pattern: string;
  flags: string;
}

export interface ParamsNumber {
  min: number;
  max: number;
  unit: string;
}

export interface ParamsMath {
  expression: string;
}

export interface ParamsColor {
  expectedColor: string;
  deltaE: number;
}

export interface ParamsPattern {
  referenceAsset: string;
  matchThreshold: number;
}
// PatternEdge: SG-31-01 (Plan 32 slice 1). Fields per
// spec/24-app-ui-design-system/05-rule-controller.md matrix row "PatternEdge"
// and Plan 32 step 1.
export const PATTERN_EDGE_KERNELS = ["sobel", "scharr", "prewitt"] as const;
export type PatternEdgeKernel = (typeof PATTERN_EDGE_KERNELS)[number];
export const PATTERN_EDGE_POLARITIES = ["rising", "falling", "either"] as const;
export type PatternEdgePolarity = (typeof PATTERN_EDGE_POLARITIES)[number];
export interface ParamsPatternEdge {
  edgeKernel: PatternEdgeKernel;
  threshold: number;
  polarity: PatternEdgePolarity;
  minLength: number;
}

export interface ParamsBlob {
  minArea: number;
  maxArea: number;
  expectedCount: number;
  growthTolerance?: 0.02 | 0.05;
}

export type ControllerParamsByKind = {
  presence: ParamsPresence;
  absence: ParamsAbsence;
  ocr: ParamsOcr;
  textMatch: ParamsTextMatch;
  number: ParamsNumber;
  math: ParamsMath;
  color: ParamsColor;
  pattern: ParamsPattern;
  patternEdge: ParamsPatternEdge;
  blob: ParamsBlob;
};

export type EditorRuleParamsV2 = ControllerParamsByKind[keyof ControllerParamsByKind];

// v2 rule shape. Superset of v1 EditorRule with:
//   - `controller` required (typed)
//   - `params` typed per controller (still a plain object on disk)
//   - optional `lightingRef` linking a rule to a LightingDrawer preset (LC-04)
export interface EditorRuleV2 extends Omit<EditorRule, "params"> {
  controller: ControllerKind;
  params: EditorRuleParamsV2;
  lightingRef?: string;
}

// v1 rule shape kept for the migration surface. Everything the codebase used
// to accept: abstract kind letter + untyped params bag.
export interface EditorRuleV1 {
  id: string;
  name: string;
  kind: EditorRuleKind;
  family?: "rect" | "anchor";
  isHidden: boolean;
  isLocked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  params?: Record<string, string | number | boolean>;
}

export const DEFAULT_PARAMS: {
  [K in ControllerKind]: ControllerParamsByKind[K];
} = {
  presence: { threshold: 0.5, minBlobPx: 10 },
  absence: { threshold: 0.5, minBlobPx: 10 },
  ocr: { expectedText: "", caseInsensitive: true, stripWhitespace: true },
  textMatch: { pattern: "", flags: "" },
  number: { min: 0, max: 0, unit: "" },
  math: { expression: "" },
  color: { expectedColor: "#000000", deltaE: 10 },
  pattern: { referenceAsset: "", matchThreshold: 0.8 },
  patternEdge: { edgeKernel: "sobel", threshold: 0.5, polarity: "rising", minLength: 8 },
  blob: { minArea: 0, maxArea: 0, expectedCount: 1, growthTolerance: 0.05 },
};

// Plan 42 step 8. Rule condition discriminated union per spec/21-app/47 and 48.
// Every rule holds a non-empty `conditions` array; verdicts AND-merge (47 s6).

// SameImage carries no per-instance params; the empty shape is intentional so
// the discriminated union in RuleCondition can key on kind === "sameImage".
export type SameImageConditionParams = Record<string, never>;

export interface PresenceConditionParams {
  Mode: PresenceModeType;
  Threshold: number;
  MinBlobPx: number;
}

export interface ColorConditionParams {
  Mode: ColorModeType;
  ExpectedColor: string;
  DeltaE: number;
}

export interface SameImageCondition {
  id: string;
  type: typeof ConditionTypeType.SameImage;
  params: SameImageConditionParams;
}

export interface PresenceCondition {
  id: string;
  type: typeof ConditionTypeType.Presence;
  params: PresenceConditionParams;
}

export interface ColorCondition {
  id: string;
  type: typeof ConditionTypeType.Color;
  params: ColorConditionParams;
}

export type RuleCondition = SameImageCondition | PresenceCondition | ColorCondition;

export const DEFAULT_CONDITION_PARAMS = {
  [ConditionTypeType.SameImage]: {} as SameImageConditionParams,
  [ConditionTypeType.Presence]: {
    Mode: PresenceModeType.Present,
    Threshold: 0.5,
    MinBlobPx: 10,
  } satisfies PresenceConditionParams,
  [ConditionTypeType.Color]: {
    Mode: ColorModeType.Current,
    ExpectedColor: "#000000",
    DeltaE: 3.0,
  } satisfies ColorConditionParams,
} as const;

// v3 rule extends v2 with a non-empty conditions array.
export interface EditorRuleV3 extends EditorRuleV2 {
  conditions: RuleCondition[];
}

// Ruleset root envelope (spec 49 s3). Persisted alongside the rules array.
export interface Ruleset {
  version: typeof RULESET_SCHEMA_VERSION;
  validationMode: ValidationModeType;
  rules: EditorRuleV3[];
}

export function makeDefaultCondition(type: RuleCondition["type"], id: string): RuleCondition {
  switch (type) {
    case ConditionTypeType.SameImage:
      return {
        id,
        type,
        params: { ...DEFAULT_CONDITION_PARAMS[ConditionTypeType.SameImage] },
      } as SameImageCondition;
    case ConditionTypeType.Presence:
      return {
        id,
        type,
        params: { ...DEFAULT_CONDITION_PARAMS[ConditionTypeType.Presence] },
      } as PresenceCondition;
    case ConditionTypeType.Color:
      return {
        id,
        type,
        params: { ...DEFAULT_CONDITION_PARAMS[ConditionTypeType.Color] },
      } as ColorCondition;
    default: {
      const _exhaustive: never = type;

      return _exhaustive;
    }
  }
}

export function isRuleCondition(v: unknown): v is RuleCondition {
  if (!v || typeof v !== "object") return false;
  const c = v as { id?: unknown; type?: unknown; params?: unknown };

  if (typeof c.id !== "string" || c.id.length === 0) return false;

  if (isConditionTypeType(c.type) === false) return false;

  if (!c.params || typeof c.params !== "object") return false;
  const p = c.params as Record<string, unknown>;
  switch (c.type) {
    case ConditionTypeType.SameImage:
      return true;
    case ConditionTypeType.Presence:
      return (
        isPresenceMode(p.Mode) &&
        typeof p.Threshold === "number" &&
        Number.isFinite(p.Threshold) &&
        typeof p.MinBlobPx === "number" &&
        Number.isFinite(p.MinBlobPx)
      );
    case ConditionTypeType.Color:
      return (
        isColorMode(p.Mode) &&
        typeof p.ExpectedColor === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(p.ExpectedColor) &&
        typeof p.DeltaE === "number" &&
        Number.isFinite(p.DeltaE) &&
        p.DeltaE >= 0
      );
    default:
      return false;
  }
}

export function isValidationModeValue(v: unknown): v is ValidationModeType {
  return isValidationMode(v);
}

export { DEFAULT_VALIDATION_MODE };

export function normalizePatternEdgeKernel(v: unknown): PatternEdgeKernel {
  return (PATTERN_EDGE_KERNELS as readonly string[]).includes(v as string)
    ? (v as PatternEdgeKernel)
    : "sobel";
}

export function normalizePatternEdgePolarity(v: unknown): PatternEdgePolarity {
  return (PATTERN_EDGE_POLARITIES as readonly string[]).includes(v as string)
    ? (v as PatternEdgePolarity)
    : "rising";
}

export function isControllerKind(v: unknown): v is ControllerKind {
  return typeof v === "string" && (CONTROLLER_KINDS as readonly string[]).includes(v);
}

// Allowed growth tolerance values for blob detection. Anything outside this
// set falls back to the sensible default so persisted rules stay in sync
// with the UI radio group.
export const BLOB_GROWTH_TOLERANCES = [0.02, 0.05] as const;
export type BlobGrowthTolerance = (typeof BLOB_GROWTH_TOLERANCES)[number];
export const DEFAULT_BLOB_GROWTH_TOLERANCE: BlobGrowthTolerance = 0.05;

export function normalizeGrowthTolerance(v: unknown): BlobGrowthTolerance {
  return (BLOB_GROWTH_TOLERANCES as readonly number[]).includes(v as number)
    ? (v as BlobGrowthTolerance)
    : DEFAULT_BLOB_GROWTH_TOLERANCE;
}
