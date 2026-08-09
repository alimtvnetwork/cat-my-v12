// Field-level validation helpers for the rule set editor. Pure functions,
// zod-backed, no store coupling so PropertiesPanel and per-kind editors
// can render inline errors + tooltips without diverging on messages.
import { z } from "zod";
import type { EditorRect, EditorRule } from "@/lib/editor/types";

export const RULE_NAME_MAX = 80;

export const ruleNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name cannot be empty" })
  .max(RULE_NAME_MAX, { message: `Name must be ${RULE_NAME_MAX} characters or fewer` });

export function validateRuleName(value: string): string | null {
  const r = ruleNameSchema.safeParse(value);

  return r.success ? null : (r.error.issues[0]?.message ?? "Invalid name");
}

export interface BoundsErrors {
  x: string | null;
  y: string | null;
  width: string | null;
  height: string | null;
}

export const EMPTY_BOUNDS_ERRORS: BoundsErrors = { x: null, y: null, width: null, height: null };

/**
 * Validate a rule rect against the image it lives on. Each field gets its
 * own message so the UI can highlight and describe the exact broken input.
 */
export function validateRuleBounds(rect: EditorRect, image: EditorRect): BoundsErrors {
  const errors: BoundsErrors = { ...EMPTY_BOUNDS_ERRORS };

  if (Number.isFinite(rect.x) === false) errors.x = "X must be a number";
  else if (rect.x < 0) errors.x = "X cannot be negative";
  else if (rect.x >= image.width) errors.x = `X must be less than ${image.width}`;

  if (Number.isFinite(rect.y) === false) errors.y = "Y must be a number";
  else if (rect.y < 0) errors.y = "Y cannot be negative";
  else if (rect.y >= image.height) errors.y = `Y must be less than ${image.height}`;

  if (Number.isFinite(rect.width) === false || rect.width < 1)
    errors.width = "Width must be at least 1";
  else if (rect.x + rect.width > image.width) {
    errors.width = `Width overflows image by ${rect.x + rect.width - image.width}px`;
  }

  if (Number.isFinite(rect.height) === false || rect.height < 1)
    errors.height = "Height must be at least 1";
  else if (rect.y + rect.height > image.height) {
    errors.height = `Height overflows image by ${rect.y + rect.height - image.height}px`;
  }

  return errors;
}

export function hasBoundsError(errors: BoundsErrors): boolean {
  return !!(errors.x || errors.y || errors.width || errors.height);
}

/** Convenience: run both name + bounds validation for a single rule. */
export function validateRule(rule: EditorRule, image: EditorRect) {
  return {
    name: validateRuleName(rule.name),
    bounds: validateRuleBounds(rule, image),
  };
}
