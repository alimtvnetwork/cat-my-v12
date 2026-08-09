// Plan 80 step 45: canonical projection of the projects store used to
// prove full-reset -> reseed replay determinism.
//
// Store IDs and timestamps are non-deterministic by design (uuid + Date.now
// at mutation time), so raw `JSON.stringify` equality is meaningless. This
// module rebuilds a stable projection keyed by human names + declared
// ordering, stripping every volatile field. Two runs of the same seed
// bundle into an empty store MUST produce byte-identical JSON of the
// projection; any drift is a determinism bug in the seed pipeline.
import type { Project, ProjectStoreState, RuleSet } from "./store";
import type { EditorRule } from "@/lib/editor/types";

interface CanonicalRule {
  name: string;
  kind: EditorRule["kind"];
  family?: EditorRule["family"];
  isHidden: boolean;
  isLocked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  params?: EditorRule["params"];
  rotationDeg?: number;
  /** Reference remapped to source rule *name* (or null if dangling). */
  sourceRuleName?: string | null;
}

interface CanonicalRuleset {
  name: string;
  categoryName?: string;
  overrideMode?: RuleSet["overrideMode"];
  parentRulesetName?: string | null;
  imageRef?: string;
  rules: CanonicalRule[];
}

interface CanonicalProject {
  name: string;
  cameraName?: string;
  categoryNames?: string[];
  rulesets: CanonicalRuleset[];
}

export interface CanonicalStoreSnapshot {
  projects: CanonicalProject[];
}

function canonicaliseRule(rule: EditorRule, ruleNamesById: Map<string, string>): CanonicalRule {
  const out: CanonicalRule = {
    name: rule.name,
    kind: rule.kind,
    isHidden: rule.isHidden,
    isLocked: rule.isLocked,
    x: rule.x,
    y: rule.y,
    width: rule.width,
    height: rule.height,
  };

  if (rule.family !== undefined) out.family = rule.family;

  if (rule.params !== undefined) out.params = rule.params;
  const rotationDeg = (rule as { rotationDeg?: number }).rotationDeg;

  if (rotationDeg !== undefined) out.rotationDeg = rotationDeg;

  if (rule.sourceRuleId !== undefined) {
    out.sourceRuleName = ruleNamesById.get(rule.sourceRuleId) ?? null;
  }

  return out;
}

function canonicaliseRuleset(rs: RuleSet, rulesetNamesById: Map<string, string>): CanonicalRuleset {
  const ruleNamesById = new Map<string, string>();
  for (const r of rs.rules) ruleNamesById.set(r.id, r.name);
  const out: CanonicalRuleset = {
    name: rs.name,
    rules: rs.rules.map((r) => canonicaliseRule(r, ruleNamesById)),
  };

  if (rs.categoryName !== undefined) out.categoryName = rs.categoryName;

  if (rs.overrideMode !== undefined) out.overrideMode = rs.overrideMode;

  if (rs.imageRef !== undefined) out.imageRef = rs.imageRef;

  if (rs.parentRulesetId !== undefined) {
    out.parentRulesetName = rulesetNamesById.get(rs.parentRulesetId) ?? null;
  }

  return out;
}

function canonicaliseProject(
  p: Project,
  rulesets: Record<string, RuleSet>,
  rulesetNamesById: Map<string, string>,
): CanonicalProject {
  const out: CanonicalProject = {
    name: p.name,
    rulesets: p.rulesetIds
      .map((rid) => rulesets[rid])
      .filter((rs): rs is RuleSet => Boolean(rs))
      .map((rs) => canonicaliseRuleset(rs, rulesetNamesById)),
  };

  if (p.cameraName !== undefined) out.cameraName = p.cameraName;

  if (p.categoryNames !== undefined) out.categoryNames = [...p.categoryNames];

  return out;
}

/**
 * Build the volatile-free projection of the projects store. Order matches
 * the store's insertion order: `Object.values(projects)` and each
 * project's `rulesetIds` array. Seed determinism is asserted by comparing
 * the JSON of this projection across two isolated seed runs.
 */
export function canonicalSeedSnapshot(
  state: Pick<ProjectStoreState, "projects" | "rulesets">,
): CanonicalStoreSnapshot {
  const rulesetNamesById = new Map<string, string>();
  for (const rs of Object.values(state.rulesets)) {
    rulesetNamesById.set(rs.id, rs.name);
  }

  return {
    projects: Object.values(state.projects).map((p) =>
      canonicaliseProject(p, state.rulesets, rulesetNamesById),
    ),
  };
}

/** Convenience: stable-key JSON string, useful for equality assertions. */
export function canonicalSeedSnapshotJson(
  state: Pick<ProjectStoreState, "projects" | "rulesets">,
): string {
  return JSON.stringify(canonicalSeedSnapshot(state));
}
