// Plan 67 step 40 (PR-05): pure category auto-apply resolver.
//
// Given a project + its rulesets + a category name, return the rulesets
// that "auto-apply" to that category. A ruleset applies when its
// `categoryName` matches (case + whitespace insensitive). Rulesets with
// no `categoryName` are treated as "global" and included when
// `includeUncategorized` is true (default: true), so the Run picker can
// show them alongside category-scoped rulesets. Order preserved from
// `project.rulesetIds` so the UI reflects author ordering.
//
// Kept as a pure function (no store subscription, no React) so it can be
// unit-tested in isolation and called from loaders, server functions,
// and validation dialogs.
import type { Project, RuleSet } from "./store";

function norm(name: string | undefined): string {

  return (name ?? "").trim().toLowerCase();
}

export interface ResolveCategoryOptions {
  /** Include rulesets that have no `categoryName` set. Defaults to true. */
  includeUncategorized?: boolean;
}

export interface CategoryResolution {
  /** Rulesets whose categoryName matches (case/whitespace insensitive). */
  matched: RuleSet[];
  /** Rulesets with no categoryName (globals). Empty when option is false. */
  uncategorized: RuleSet[];
  /** matched ++ uncategorized, in project author order. */
  applied: RuleSet[];
}

/**
 * Resolve the rulesets that apply to `categoryName` for `project`.
 *
 * `rulesets` must be the ordered ruleset list for the project (as
 * returned by `selectRulesetsForProject`). Passing an unrelated list
 * yields an empty resolution, not a crash: mismatched projectIds are
 * filtered out.
 */
export function resolveRulesetsForCategory(
  project: Project,
  rulesets: readonly RuleSet[],
  categoryName: string,
  options: ResolveCategoryOptions = {},
): CategoryResolution {
  const includeUncategorized = options.includeUncategorized ?? true;
  const target = norm(categoryName);
  const scoped = rulesets.filter((r) => r.projectId === project.id);
  const matched: RuleSet[] = [];
  const uncategorized: RuleSet[] = [];
  for (const rs of scoped) {
    const rsCategory = norm(rs.categoryName);

    if (rsCategory && rsCategory === target) matched.push(rs);
    else if (!rsCategory) uncategorized.push(rs);
  }

  const applied = includeUncategorized ? [...matched, ...uncategorized] : matched;

  return { matched, uncategorized, applied };
}

/**
 * Resolve every category on a project at once. Returns a map keyed by the
 * *original* category name (not normalized) so callers can round-trip to
 * the UI without losing casing. Rulesets whose category doesn't appear in
 * `project.categoryNames` still show up under their own key so orphaned
 * categoryNames on rulesets are visible in inspectors.
 */
export function resolveAllCategories(
  project: Project,
  rulesets: readonly RuleSet[],
  options: ResolveCategoryOptions = {},
): Record<string, CategoryResolution> {
  const out: Record<string, CategoryResolution> = {};
  const names = new Set<string>();
  for (const name of project.categoryNames ?? []) if (name.trim()) names.add(name);
  for (const rs of rulesets)
    if (rs.projectId === project.id && rs.categoryName?.trim()) names.add(rs.categoryName);
  for (const name of names) {
    out[name] = resolveRulesetsForCategory(project, rulesets, name, options);
  }

  return out;
}
