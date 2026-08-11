// Plan 79 step 11. V4 Rule domain model + Zod schema + type guards.
//
// Sources of truth:
//   .lovable/memory/features/rule-category-project-model.md
//   .lovable/plans/subtasks/79-ui-improvements-v4/SS-04-domain-model.md
//   spec/21-app/53-ui-improvements-v4.md sections 1, 4, 5
//
// This file is data-only: no imports of components, no persistence, no
// side effects. Persistence lives behind `src/lib/rules/facade.ts` (step 13).
// Rotation lives per-ROI inside RuleCondition.rois[n].rotation (SS-03);
// this file does not redefine RuleCondition, it only references it by shape.

import { z } from "zod";

// --- Branded ids ----------------------------------------------------------

export type RuleId = string & { readonly __brand: "RuleId" };
export type CameraSettingId = string & { readonly __brand: "CameraSettingId" };

export const RuleIdSchema = z
  .string()
  .min(1)
  .max(64)
  .transform((v) => v as RuleId);
export const CameraSettingIdSchema = z
  .string()
  .min(1)
  .max(64)
  .transform((v) => v as CameraSettingId);

// --- Pocket size ----------------------------------------------------------

export const PocketSize = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  P5: 5,
  P6: 6,
  P7: 7,
  P8: 8,
} as const;
export type PocketSize = (typeof PocketSize)[keyof typeof PocketSize];
export const ALL_POCKET_SIZES: readonly PocketSize[] = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
export const PocketSizeSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
]);

// --- Rule condition (opaque here; owned by spec/21-app/47) ---------------

// The condition shape is defined elsewhere. From this model's perspective the
// only guarantee we need is that a condition is a plain object. Facades and
// the editor must validate condition contents against their own schemas.
export const RuleConditionShape = z.object({}).passthrough();
export type RuleCondition = z.infer<typeof RuleConditionShape>;

// --- Rule -----------------------------------------------------------------

export const UNCATEGORIZED_RULE_ID = "cat-uncategorized" as RuleId;

const IsoDate = z.string().datetime({ offset: true });

export const RuleSchema = z
  .object({
    id: RuleIdSchema,
    name: z.string().trim().min(1).max(64),
    isCategory: z.boolean(),
    notes: z.string().max(500).optional(),
    pocketSize: PocketSizeSchema.optional(),
    categoryId: RuleIdSchema.optional(),
    appliesBefore: z.array(RuleIdSchema).default([]),
    conditions: z.array(RuleConditionShape).default([]),
    cameraSettingId: CameraSettingIdSchema.optional(),
    // Plan 83 backlog 11c. Inline enable toggle for rules.
    // Optional in the schema so persisted rows written before this field
    // still validate on read. Callers MUST treat `undefined` as enabled:
    // `row.enabled !== false`. Chain expansion + runners follow the same
    // convention. Categories are structural, so the flag is only
    // meaningful when isCategory === false; the shape stays flat.
    enabled: z.boolean().optional(),
    createdAt: IsoDate,
    updatedAt: IsoDate,
  })
  .superRefine((rule, ctx) => {
    // Invariant 1: no self-ref in appliesBefore.
    if (rule.appliesBefore.includes(rule.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appliesBefore"],
        message: "A rule cannot list itself in appliesBefore",
      });
    }
    // Invariant 2: appliesBefore entries are unique.
    const seen = new Set<string>();
    for (const dep of rule.appliesBefore) {
      if (seen.has(dep)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["appliesBefore"],
          message: `Duplicate appliesBefore entry: ${dep}`,
        });
      }

      seen.add(dep);
    }
    // Invariant 5: Uncategorized cannot change name or become non-category.
    if (rule.id === UNCATEGORIZED_RULE_ID) {
      if (!rule.isCategory) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["isCategory"],
          message: "Uncategorized must remain a category",
        });
      }

      if (rule.name !== "Uncategorized") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["name"],
          message: "Uncategorized cannot be renamed",
        });
      }
    }
  });

export type Rule = z.output<typeof RuleSchema>;
export type RuleDraft = Omit<Rule, "id" | "createdAt" | "updatedAt"> & {
  id?: RuleId;
};

// --- Type guards ---------------------------------------------------------

export function isRule(value: unknown): value is Rule {
  return RuleSchema.safeParse(value).success;
}

export function isCategoryRule(value: unknown): value is Rule {
  return isRule(value) && value.isCategory === true;
}

export function isBuiltinCategory(id: RuleId): boolean {
  return id === UNCATEGORIZED_RULE_ID;
}

// --- Typed errors (raised by facade + chain expander) --------------------

export enum RuleErrorCodeType {
  E_RULE_CYCLE = "E_RULE_CYCLE",
  E_RULE_REFERENCED = "E_RULE_REFERENCED",
  E_BUILTIN_CATEGORY = "E_BUILTIN_CATEGORY",
  E_RULE_SCHEMA = "E_RULE_SCHEMA",
}
export type RuleErrorCode = RuleErrorCodeType;

export class RuleCycleError extends Error {
  readonly code = "E_RULE_CYCLE" as const;
  constructor(
    readonly path: RuleId[],
    readonly correlationId: string,
  ) {
    super(`Rule cycle detected: ${path.join(" -> ")}`);
    this.name = "RuleCycleError";
  }
}

export class RuleReferencedError extends Error {
  readonly code = "E_RULE_REFERENCED" as const;
  constructor(
    readonly referrers: { rules: RuleId[]; projects: string[] },
    readonly correlationId: string,
  ) {
    super(
      `Rule is referenced by ${referrers.rules.length} rule(s) and ${referrers.projects.length} project(s)`,
    );
    this.name = "RuleReferencedError";
  }
}

export class BuiltinCategoryError extends Error {
  readonly code = "E_BUILTIN_CATEGORY" as const;
  constructor(
    readonly ruleId: RuleId,
    readonly correlationId: string,
  ) {
    super(`Built-in category cannot be mutated: ${ruleId}`);
    this.name = "BuiltinCategoryError";
  }
}

export class RuleValidationError extends Error {
  readonly code = "E_RULE_SCHEMA" as const;
  constructor(
    readonly issues: z.ZodIssue[],
    readonly correlationId: string,
  ) {
    super(`Rule failed schema validation (${issues.length} issue(s))`);
    this.name = "RuleValidationError";
  }
}