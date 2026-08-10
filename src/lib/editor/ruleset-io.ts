import { EditorRuleKindType } from "@/lib/editor/types";
import { EditorToolFamilyType } from "@/lib/editor/types";
import type { EditorRule, EditorRuleKind } from "@/lib/editor/types";
import type { RuleGroup } from "@/lib/editor/store/rules-slice";
import {
  RULESET_SCHEMA_VERSION as SCHEMA_V3,
  SUPPORTED_RULESET_VERSIONS,
  type SupportedRulesetVersion,
  DEFAULT_VALIDATION_MODE,
} from "@/lib/editor/schema";
import { ValidationModeType, isValidationMode } from "@/types/rules/ValidationModeType";
import { migrateRuleV1ToV2, migrateRuleV2ToV3, MigrationError } from "@/lib/editor/migrations";

// Re-exported so existing callers keep the same import surface but track the
// current version (bumped to 3 in Plan 42 step 7; see spec 47 + 49).
export const RULESET_SCHEMA_VERSION = SCHEMA_V3;

export interface RuleSetFile {
  schema: "control-automation.ruleset";
  version: typeof RULESET_SCHEMA_VERSION;
  exportedAt: string;
  rules: EditorRule[];
  // Plan 35 step 22: persisted groups. Optional for back-compat with
  // pre-v2.1 files; parseRuleSet always returns an array (empty if absent).
  groups?: RuleGroup[];
  // Plan 42 step 9 (spec 49 s3). Optional in v1/v2 files (defaulted on parse);
  // written on every v3 export by `buildRuleSetFile`.
  ValidationModeType?: ValidationModeType;
}

export interface ParsedRuleSet {
  rules: EditorRule[];
  groups: RuleGroup[];
  ValidationModeType: ValidationModeType;
}

const VALID_KINDS: readonly EditorRuleKind[] = [
  EditorRuleKindType.C,
  EditorRuleKindType.R,
  EditorRuleKindType.K,
  EditorRuleKindType.S,
  EditorRuleKindType.E,
];

export function buildRuleSetFile(
  rules: readonly EditorRule[],
  groups: readonly RuleGroup[] = [],
  ValidationModeType: ValidationModeType = DEFAULT_VALIDATION_MODE,
): RuleSetFile {
  return {
    schema: "control-automation.ruleset",
    version: RULESET_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    rules: rules.map((r) => ({ ...r, params: r.params ? { ...r.params } : undefined })),
    groups: groups.map((g) => ({ ...g, ruleIds: g.ruleIds.slice() })),
    ValidationModeType,
  };
}

export function serializeRuleSet(
  rules: readonly EditorRule[],
  groups: readonly RuleGroup[] = [],
  ValidationModeType: ValidationModeType = DEFAULT_VALIDATION_MODE,
): string {
  return JSON.stringify(buildRuleSetFile(rules, groups, ValidationModeType), null, 2);
}

export class RuleSetImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleSetImportError";
  }
}

// Distinct subclass so the UI can emit E_UI_RULE_MIGRATE_FAIL with structured
// context (ruleIndex) instead of a generic import-failed line.
export class RuleSetMigrationError extends RuleSetImportError {
  readonly code = "E_UI_RULE_MIGRATE_FAIL" as const;
  readonly ruleIndex: number;
  constructor(message: string, ruleIndex: number) {
    super(message);
    this.name = "RuleSetMigrationError";
    this.ruleIndex = ruleIndex;
  }
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parseRule(input: unknown, index: number): EditorRule {
  if (!input || typeof input !== "object") {
    throw new RuleSetImportError(`rule[${index}] is not an object`);
  }

  const r = input as Record<string, unknown>;

  if (typeof r.id !== "string" || r.id.length === 0)

    throw new RuleSetImportError(`rule[${index}].id missing`);

  if (typeof r.name !== "string") throw new RuleSetImportError(`rule[${index}].name missing`);

  if (typeof r.kind !== "string" || (VALID_KINDS as readonly string[]).includes(r.kind) === false) {
    throw new RuleSetImportError(`rule[${index}].kind invalid: ${String(r.kind)}`);
  }

  for (const k of ["x", "y", "width", "height"] as const) {
    if (isFiniteNumber(r[k]) === false)

      throw new RuleSetImportError(`rule[${index}].${k} must be a number`);
  }

  return {
    id: r.id,
    name: r.name,
    kind: r.kind as EditorRuleKind,
    family:
      r.family === EditorToolFamilyType.Rect || r.family === EditorToolFamilyType.Anchor
        ? r.family
        : undefined,
    isHidden: Boolean(r.isHidden),
    isLocked: Boolean(r.isLocked),
    x: r.x as number,
    y: r.y as number,
    width: r.width as number,
    height: r.height as number,
    params:
      r.params && typeof r.params === "object"
        ? { ...(r.params as Record<string, string | number | boolean>) }
        : undefined,
  };
}

function parseGroups(input: unknown, ruleIds: ReadonlySet<string>): RuleGroup[] {
  if (input === undefined || input === null) return [];

  if (Array.isArray(input) === false) throw new RuleSetImportError("groups must be an array");

  return input.map((raw, i) => {
    if (!raw || typeof raw !== "object")

      throw new RuleSetImportError(`group[${i}] is not an object`);
    const g = raw as Record<string, unknown>;

    if (typeof g.id !== "string" || g.id.length === 0)

      throw new RuleSetImportError(`group[${i}].id missing`);

    if (typeof g.name !== "string") throw new RuleSetImportError(`group[${i}].name missing`);

    if (Array.isArray(g.ruleIds) === false)

      throw new RuleSetImportError(`group[${i}].ruleIds must be an array`);
    const memberIds: string[] = [];
    for (const rid of g.ruleIds) {
      if (typeof rid !== "string" || ruleIds.has(rid) === false) {
        // Drop references to unknown rules rather than fail the whole import;
        // log via caller-side W_UI_RULESET_IMPORT_FAILED is misleading here
        // because the file is still structurally valid. Warn inline instead.
        console.warn("[ruleset-io] dropping unknown group member", { groupIndex: i, ruleId: rid });
        continue;
      }

      memberIds.push(rid);
    }

    return {
      id: g.id,
      name: g.name,
      ruleIds: memberIds,
      collapsed: g.collapsed === true ? true : undefined,
    };
  });
}

export function parseRuleSet(text: string): ParsedRuleSet {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new RuleSetImportError(`invalid JSON: ${(err as Error).message}`);
  }

  if (!raw || typeof raw !== "object") throw new RuleSetImportError("file root must be an object");
  const obj = raw as Record<string, unknown>;

  if (obj.schema !== "control-automation.ruleset") {
    throw new RuleSetImportError(`unexpected schema: ${String(obj.schema)}`);
  }

  const version = obj.version;

  if ((SUPPORTED_RULESET_VERSIONS as readonly number[]).includes(version as number) === false) {
    throw new RuleSetImportError(`unsupported version: ${String(version)}`);
  }

  const parsedVersion = version as SupportedRulesetVersion;

  if (Array.isArray(obj.rules) === false) throw new RuleSetImportError("rules must be an array");
  const parsed = obj.rules.map((r, i) => parseRule(r, i));

  if (parsedVersion === 2 || parsedVersion === 3) {
    // Plan 42 step 12. v2 payloads get a default `SameImage` condition per
    // rule (spec 47 s5 non-empty invariant); v3 payloads with a well-formed
    // `conditions` array pass through unchanged (idempotent on v3). Raw
    // per-rule `conditions` from the JSON payload are threaded onto the
    // parsed rule so `migrateRuleV2ToV3` can validate them.
    const rawRules = obj.rules as ReadonlyArray<Record<string, unknown>>;
    const withConds = parsed.map((r, i) => ({
      ...r,
      conditions: (rawRules[i]?.conditions ?? undefined) as unknown,
    })) as unknown as import("@/lib/editor/schema").EditorRuleV3[];
    try {
      const migrated = withConds.map((r, i) => migrateRuleV2ToV3(r, i) as unknown as EditorRule);
      const groups = parseGroups(obj.groups, new Set(migrated.map((r) => r.id)));
      const vm = isValidationMode(obj.ValidationModeType)
        ? (obj.ValidationModeType as ValidationModeType)
        : DEFAULT_VALIDATION_MODE;

      return { rules: migrated, groups, ValidationModeType: vm };
    } catch (err) {
      if (err instanceof MigrationError) {
        throw new RuleSetMigrationError(err.message, err.ruleIndex);
      }

      throw err;
    }
  }
  // v1 -> v2 forward-only migration. Rethrows as RuleSetImportError so the
  // existing UI toast path handles it uniformly.
  try {
    const migrated = parsed.map((r, i) => {
      const v2 = migrateRuleV1ToV2(r as never, i);

      return migrateRuleV2ToV3(v2, i) as unknown as EditorRule;
    });

    // v1 files pre-date grouping.
    return { rules: migrated, groups: [], ValidationModeType: DEFAULT_VALIDATION_MODE };
  } catch (err) {
    if (err instanceof MigrationError) {
      throw new RuleSetMigrationError(err.message, err.ruleIndex);
    }

    throw err;
  }
}
