import { ControllerKindType } from "@/lib/editor/schema";
// Forward-only v1 -> v2 rule migration. Plan 31 step 7.
// Pure, deterministic, no I/O. Idempotent for v2 input.
//
// Error taxonomy (see SS-02):
//   E_UI_RULE_MIGRATE_FAIL          - unrecoverable per-rule failure
//   I_UI_RULE_MIGRATE_COERCED       - a field was coerced from unexpected type
//
// Callers translate MigrationError.code into logged/toasted output; this
// module never touches the log stream directly (keeps it pure + testable).

import {
  DEFAULT_PARAMS,
  isControllerKind,
  normalizeGrowthTolerance,
  type ControllerKind,
  type ControllerParamsByKind,
  type EditorRuleParamsV2,
  type EditorRuleV1,
  type EditorRuleV2,
  type EditorRuleV3,
  type RuleCondition,
  makeDefaultCondition,
  isRuleCondition,
} from "@/lib/editor/schema";
import { ConditionTypeType } from "@/types/rules/ConditionTypeType";

export class MigrationError extends Error {
  readonly code = "E_UI_RULE_MIGRATE_FAIL" as const;
  readonly ruleIndex: number;
  constructor(message: string, ruleIndex: number) {
    super(message);
    this.name = "MigrationError";
    this.ruleIndex = ruleIndex;
  }
}

function inferController(rule: EditorRuleV1): ControllerKind | null {
  const declared = rule.params && typeof rule.params.kind === "string" ? rule.params.kind : null;

  if (declared && isControllerKind(declared)) return declared;

  if (declared) return null;

  const p = rule.params ?? {};

  if ("expectedText" in p) return ControllerKindType.Ocr;

  if ("pattern" in p && "flags" in p) return ControllerKindType.TextMatch;

  if ("expression" in p) return ControllerKindType.Math;

  if ("expectedColor" in p) return ControllerKindType.Color;

  if ("referenceAsset" in p) return ControllerKindType.Pattern;

  if ("minArea" in p || "maxArea" in p || "expectedCount" in p) return ControllerKindType.Blob;

  if ("min" in p && "max" in p && "unit" in p) return ControllerKindType.Number;

  if ("threshold" in p) return ControllerKindType.Presence;

  return ControllerKindType.Presence;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function pickParams<K extends ControllerKind>(
  controller: K,
  raw: Record<string, unknown>,
): ControllerParamsByKind[K] {
  const d = DEFAULT_PARAMS[controller];
  switch (controller) {
    case ControllerKindType.Presence:
    case ControllerKindType.Absence:
      return {
        threshold: num(raw.threshold, (d as ControllerParamsByKind["presence"]).threshold),
        minBlobPx: num(raw.minBlobPx, (d as ControllerParamsByKind["presence"]).minBlobPx),
      } as ControllerParamsByKind[K];
    case ControllerKindType.Ocr:
      return {
        expectedText: str(raw.expectedText, ""),
        caseInsensitive: bool(raw.caseInsensitive, true),
        stripWhitespace: bool(raw.stripWhitespace, true),
      } as ControllerParamsByKind[K];
    case ControllerKindType.TextMatch:
      return {
        pattern: str(raw.pattern, ""),
        flags: str(raw.flags, ""),
      } as ControllerParamsByKind[K];
    case ControllerKindType.Number:
      return {
        min: num(raw.min, 0),
        max: num(raw.max, 0),
        unit: str(raw.unit, ""),
      } as ControllerParamsByKind[K];
    case ControllerKindType.Math:
      return { expression: str(raw.expression, "") } as ControllerParamsByKind[K];
    case ControllerKindType.Color:
      return {
        expectedColor: str(raw.expectedColor, "#000000"),
        deltaE: num(raw.deltaE, 10),
      } as ControllerParamsByKind[K];
    case ControllerKindType.Pattern:
      return {
        referenceAsset: str(raw.referenceAsset, ""),
        matchThreshold: num(raw.matchThreshold, 0.8),
      } as ControllerParamsByKind[K];
    case ControllerKindType.PatternEdge: {
      const dp = DEFAULT_PARAMS.patternEdge;
      const kernelRaw = raw.edgeKernel;
      const polarityRaw = raw.polarity;
      const kernel =
        kernelRaw === "sobel" || kernelRaw === "scharr" || kernelRaw === "prewitt"
          ? kernelRaw
          : dp.edgeKernel;
      const polarity =
        polarityRaw === "rising" || polarityRaw === "falling" || polarityRaw === "either"
          ? polarityRaw
          : dp.polarity;

      return {
        edgeKernel: kernel,
        threshold: num(raw.threshold, dp.threshold),
        polarity,
        minLength: num(raw.minLength, dp.minLength),
      } as ControllerParamsByKind[K];
    }
    case ControllerKindType.Blob:
      return {
        minArea: num(raw.minArea, 0),
        maxArea: num(raw.maxArea, 0),
        expectedCount: num(raw.expectedCount, 1),
        growthTolerance: normalizeGrowthTolerance(raw.growthTolerance),
      } as ControllerParamsByKind[K];
    default: {
      const _exhaustive: never = controller;

      return _exhaustive;
    }
  }
}

function isAlreadyV2(rule: EditorRuleV1 | EditorRuleV2): rule is EditorRuleV2 {
  const c = (rule as EditorRuleV2).controller;

  return (
    typeof c === "string" &&
    isControllerKind(c) &&
    rule.params != null &&
    typeof rule.params === "object"
  );
}

export function migrateRuleV1ToV2(rule: EditorRuleV1 | EditorRuleV2, index = 0): EditorRuleV2 {
  if (isAlreadyV2(rule)) {
    // Idempotent shallow clone; never rewrite v2 -> v2.
    return { ...rule, params: { ...(rule.params as EditorRuleParamsV2) } };
  }

  const controller = inferController(rule);

  if (!controller) {
    throw new MigrationError(`rule[${index}] "${rule.name}": cannot infer controller`, index);
  }

  const params = pickParams(controller, (rule.params ?? {}) as Record<string, unknown>);
  const v2: EditorRuleV2 = {
    id: rule.id,
    name: rule.name,
    kind: rule.kind,
    family: rule.family as EditorRuleV2["family"],
    isHidden: rule.isHidden,
    isLocked: rule.isLocked,
    x: rule.x,
    y: rule.y,
    width: rule.width,
    height: rule.height,
    controller,
    params,
  };
  // `lightingRef` may already be present on either shape as an extra field.
  const maybeLighting = (rule as unknown as { lightingRef?: unknown }).lightingRef;

  if (typeof maybeLighting === "string" && maybeLighting.length > 0) {
    v2.lightingRef = maybeLighting;
  }

  return v2;
}

export function migrateRuleSetV1ToV2(
  rules: readonly (EditorRuleV1 | EditorRuleV2)[],
): EditorRuleV2[] {
  return rules.map((r, i) => migrateRuleV1ToV2(r, i));
}

// Store-boundary hydration adapter. Runs migrateRuleV1ToV2 on each rule and
// returns them typed as EditorRule so zustand's action signature is preserved.
// EditorRuleV2.params (booleans/strings/numbers) structurally satisfies the
// legacy Record<string,string|number|boolean> bag, so the cast is safe.
export function hydrateRuleSetForStore(
  rules: readonly (EditorRuleV1 | EditorRuleV2)[],
): import("@/lib/editor/types").EditorRule[] {
  // Chained v1 -> v2 -> v3 migration. Callers keep the `EditorRule[]` type
  // (which lacks `conditions`); the extra field is carried at runtime and
  // round-tripped by `buildRuleSetFile`'s shallow spread. Idempotent on v3.
  const v2 = migrateRuleSetV1ToV2(rules);
  const v3 = migrateRuleSetV2ToV3(v2);

  return v3 as unknown as import("@/lib/editor/types").EditorRule[];
}

// Plan 42 step 11. Forward-only v2 -> v3 rule migration. Attaches a single
// default `SameImage` condition (spec 47 s5 non-empty invariant) when the
// rule has no valid `conditions` array. Idempotent on rules that already
// carry a well-formed `conditions` array.
//
// Deterministic condition id: `${rule.id}:c1` so re-migrating the same rule
// produces the same id (needed for the SS-08 round-trip tests in step 13).
export function migrateRuleV2ToV3(rule: EditorRuleV2 | EditorRuleV3, index = 0): EditorRuleV3 {
  void index; // reserved for future per-rule migration errors; keep signature symmetric with v1->v2.
  const existing = (rule as EditorRuleV3).conditions;

  if (Array.isArray(existing) && existing.length > 0 && existing.every(isRuleCondition)) {
    return {
      ...rule,
      conditions: existing.map((c) => ({ ...c, params: { ...c.params } }) as RuleCondition),
    };
  }

  const seed = makeDefaultCondition(ConditionTypeType.SameImage, `${rule.id}:c1`);

  return { ...(rule as EditorRuleV2), conditions: [seed] };
}

export function migrateRuleSetV2ToV3(
  rules: readonly (EditorRuleV2 | EditorRuleV3)[],
): EditorRuleV3[] {
  return rules.map((r, i) => migrateRuleV2ToV3(r, i));
}
