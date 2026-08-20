/**
 * Plan 64 step 92: route-token map for the header breadcrumb.
 *
 * Root cause: each route sets `staticData.crumb` ad hoc, so parametric
 * segments (`$projectId`, `$ruleSetId`, `$rulesetId`) render as raw ids.
 * The Breadcrumb component needs one place to resolve segment -> label,
 * with two modes:
 *   1. Static token map for literal path segments (`setup` -> "Setup").
 *   2. Param resolver hook per dynamic segment so the caller can look up
 *      a name from a store (project name, rule-set name, rule name).
 *
 * Pure data + functions. No React import so it can be consumed by tests
 * and server code as well.
 */
import { formatLabel } from "@/lib/format-label";

/** Static path-segment labels. Missing keys fall back to formatLabel(). */
const STATIC_TOKENS: Readonly<Record<string, string>> = {
  "": "Home",
  setup: "Setup",
  rules: "Rules",
  reference: "Reference",
  roi: "ROI",
  projects: "Projects",
  rulesets: "Rule Sets",
  categories: "Categories",
  camera: "Camera",
  runs: "Runs",
  settings: "Settings",
  license: "License",
  lighting: "Lighting",
  "trial-run": "Trial Run",
  "ai-testing": "AI Testing",
  "ai-testing-history": "AI Testing History",
  run: "Run",
  new: "New",
};

/** Registered dynamic-segment resolvers. Keyed by param name (`projectId`, `rulesetId`, ...). */
type ParamResolver = (id: string) => string | undefined;
const PARAM_RESOLVERS = new Map<string, ParamResolver>();

export function registerParamResolver(paramName: string, resolver: ParamResolver): void {
  PARAM_RESOLVERS.set(paramName, resolver);
}

/**
 * Resolve one breadcrumb segment to a human label.
 * `segment` is the URL path segment. `paramName` is the TanStack param
 * name (e.g. "projectId") when this segment is dynamic; undefined for
 * literal segments.
 */
export function resolveCrumb(segment: string, paramName?: string): string {
  if (paramName) {
    const resolver = PARAM_RESOLVERS.get(paramName);
    const resolved = resolver?.(segment);

    if (resolved && resolved.trim().length > 0) return resolved;

    // Explicit fallback so users see the raw id, not a blank crumb.
    return segment;
  }

  const known = STATIC_TOKENS[segment];

  if (known) return known;

  return formatLabel(segment);
}

/** Read-only view for tests / debug surfaces. */
export function listStaticTokens(): Readonly<Record<string, string>> {
  return STATIC_TOKENS;
}
