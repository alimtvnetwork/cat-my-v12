import { z } from "zod";

// Human-friendly copy is centralised here so future error-label registry
// integration (see spec/21-app) has one call site to swap.
const MSG = {
  nameRequired: "Name is required.",
  nameTooLong: "Keep it under 64 characters.",
  nameTaken: "A rule set with that name already exists in this project.",
  projectNameTaken: "A project with that name already exists.",
  categoryRequired: "Pick or create at least one category.",
  categoryTooLong: "Category names must be under 48 characters.",
  tooManyCategories: "You can attach at most 32 categories.",
  ruleModeInvalid: "Choose Direct, Category, or Task.",
  categoryModeNeedsPick: "Category mode needs a category selected.",
} as const;

export const ruleModeSchema = z.enum(["direct", "category", "task"], {
  errorMap: () => ({ message: MSG.ruleModeInvalid }),
});
export type RuleMode = z.infer<typeof ruleModeSchema>;

const trimmedName = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, MSG.nameRequired).max(64, MSG.nameTooLong));

const categoryNameSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, MSG.nameRequired).max(48, MSG.categoryTooLong));

/**
 * Rule Set create schema. `existingNames` and `availableCategories` are
 * captured by the factory so consumers can rebuild the schema whenever the
 * source data changes (react-hook-form re-uses the resolver reference).
 */
export function makeRuleSetSchema(options: {
  existingNames: readonly string[];
  availableCategories: readonly string[];
}) {
  const takenNames = new Set(options.existingNames.map((n) => n.toLowerCase()));
  const known = new Set(options.availableCategories.map((n) => n.toLowerCase()));

  return z
    .object({
      name: trimmedName,
      mode: ruleModeSchema,
      categoryName: z
        .string()
        .transform((s) => s.trim())
        .optional(),
    })
    .superRefine((value, ctx) => {
      if (takenNames.has(value.name.toLowerCase())) {
        ctx.addIssue({ code: "custom", path: ["name"], message: MSG.nameTaken });
      }

      if (value.mode === "category") {
        const picked = value.categoryName ?? "";

        if (!picked) {
          ctx.addIssue({
            code: "custom",
            path: ["categoryName"],
            message: MSG.categoryModeNeedsPick,
          });

          return;
        }

        if (picked.length > 48) {
          ctx.addIssue({
            code: "custom",
            path: ["categoryName"],
            message: MSG.categoryTooLong,
          });
        }
        // Unknown categories are allowed: the picker's "Create '<value>'"
        // affordance persists them. `known` is retained for future soft warnings.
        void known;
      }
    });
}

/**
 * New Project schema. Categories arrive from the CategoryCombobox as an array
 * (workspace-wide options). We trim and dedupe defensively before persistence.
 */
export function makeNewProjectSchema(options: { existingProjectNames: readonly string[] }) {
  const taken = new Set(options.existingProjectNames.map((n) => n.toLowerCase()));

  return z
    .object({
      name: trimmedName,
      categories: z
        .array(categoryNameSchema)
        .max(32, MSG.tooManyCategories)
        .transform((arr) => {
          const seen = new Set<string>();
          const out: string[] = [];
          for (const c of arr) {
            const key = c.toLowerCase();

            if (seen.has(key)) continue;
            seen.add(key);
            out.push(c);
          }

          return out;
        }),
    })
    .superRefine((value, ctx) => {
      if (taken.has(value.name.toLowerCase())) {
        ctx.addIssue({ code: "custom", path: ["name"], message: MSG.projectNameTaken });
      }
    });
}

export type RuleSetFormValues = z.infer<ReturnType<typeof makeRuleSetSchema>>;
export type NewProjectFormValues = z.infer<ReturnType<typeof makeNewProjectSchema>>;

export const SETUP_FORM_MESSAGES = MSG;

/**
 * Extract the first human-readable message from a react-hook-form error node,
 * transparently handling array-shaped errors (e.g. `errors.categories[3]`).
 * Centralised so form UIs never fall back to raw zod codes.
 */
export function firstMessage(
  err: { message?: string } | ReadonlyArray<{ message?: string } | undefined> | undefined,
): string | undefined {
  if (!err) return undefined;

  if (Array.isArray(err)) {
    for (const item of err) {
      if (item?.message) return item.message;
    }

    return undefined;
  }

  return (err as { message?: string }).message;
}
