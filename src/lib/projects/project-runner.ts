import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 79 step 46. Project-level runner over the V4 six-section shell.
//
// Root cause this module fixes, in one sentence: the "Run" button on the
// project editor had no code path to actually iterate the project's
// rulesets and produce per-rule verdicts, so the "Result" section had
// nothing to render.
//
// Scope: a stub verdict, deterministic and cheap, sufficient for the UI to
// surface pass/fail rows and jump-to-rule links. A rule PASSes when it has
// at least one persisted params key and is not hidden; hidden rules are
// SKIPped; rules with no params are FAILed with a `MissingParams` reason.
// Real pixel evaluation lives under `src/lib/editor/runner/` and is wired
// per-controller in later plans.

import type { Project, RuleSet } from "@/lib/projects/store";
import type { EditorRule } from "@/lib/editor/types";

export enum ProjectRunVerdictType {
  Pass = "PASS",
  Fail = "FAIL",
  Skip = "SKIP",
}

export interface ProjectRuleRunResult {
  rulesetId: string;
  rulesetName: string;
  ruleId: string;
  ruleName: string;
  verdict: ProjectRunVerdictType;
  reason: string;
}

export interface ProjectRunSummary {
  verdict: ProjectRunVerdictType;
  pass: number;
  fail: number;
  skip: number;
  total: number;
  rules: ProjectRuleRunResult[];
  ranAt: string;
  durationMs: number;
  /**
   * Plan 83 backlog 12. Rule ids skipped because the domain `Rule.enabled`
   * flag was false at run time. Aligns the project runner with
   * `computeEffectiveChain`'s ChainResult.disabled contract (v3.718) so a
   * disabled rule can never silently emit a PASS/FAIL verdict.
   */
  disabled: string[];
}

function evaluateRule(rule: EditorRule): { verdict: ProjectRunVerdictType; reason: string } {
  if (rule.isHidden) return { verdict: ProjectRunVerdictType.Skip, reason: "hidden" };
  const paramCount = rule.params ? Object.keys(rule.params).length : 0;

  if (paramCount === 0) return { verdict: ProjectRunVerdictType.Fail, reason: "MissingParams" };

  return { verdict: ProjectRunVerdictType.Pass, reason: "OK" };
}

export interface RunProjectOptions {
  /**
   * Predicate returning true when the domain `Rule.enabled` flag is false
   * for the given EditorRule id. Optional so pure-data callers (tests,
   * bundle exporters) can keep the old shape; when omitted no rule is
   * treated as disabled. Wire from `useRulesLibrary().byId(id)?.enabled`.
   */
  isDisabled?: (ruleId: string) => boolean;
}

export function runProject(
  project: Project,
  rulesets: readonly RuleSet[],
  options: RunProjectOptions = {},
): ProjectRunSummary {
  const started = performance.now();
  const byId = new Map(rulesets.map((r) => [r.id, r] as const));
  const rules: ProjectRuleRunResult[] = [];
  const disabled: string[] = [];
  const isDisabled = options.isDisabled ?? (() => false);

  for (const rid of project.rulesetIds) {
    const rs = byId.get(rid);

    if (!rs) {
      rules.push({
        rulesetId: rid,
        rulesetName: "(missing)",
        ruleId: rid,
        ruleName: "(missing ruleset)",
        verdict: ProjectRunVerdictType.Fail,
        reason: "UnknownRuleset",
      });
      continue;
    }

    if (rs.rules.length === 0) {
      rules.push({
        rulesetId: rs.id,
        rulesetName: rs.name,
        ruleId: rs.id,
        ruleName: "(empty ruleset)",
        verdict: ProjectRunVerdictType.Skip,
        reason: "EmptyRuleset",
      });
      continue;
    }

    for (const rule of rs.rules) {
      if (isDisabled(rule.id)) {
        disabled.push(rule.id);
        rules.push({
          rulesetId: rs.id,
          rulesetName: rs.name,
          ruleId: rule.id,
          ruleName: rule.name,
          verdict: ProjectRunVerdictType.Skip,
          reason: "Disabled",
        });
        continue;
      }

      const { verdict, reason } = evaluateRule(rule);
      rules.push({
        rulesetId: rs.id,
        rulesetName: rs.name,
        ruleId: rule.id,
        ruleName: rule.name,
        verdict,
        reason,
      });
    }
  }

  let pass = 0;
  let fail = 0;
  let skip = 0;
  for (const r of rules) {
    if (r.verdict === ProjectRunVerdictType.Pass) pass++;
    else if (r.verdict === ProjectRunVerdictType.Fail) fail++;
    else skip++;
  }

  const verdict: ProjectRunVerdictType =
    fail > 0
      ? ProjectRunVerdictType.Fail
      : pass > 0
        ? ProjectRunVerdictType.Pass
        : ProjectRunVerdictType.Skip;
  const durationMs = Math.round(performance.now() - started);
  const summary: ProjectRunSummary = {
    verdict,
    pass,
    fail,
    skip,
    total: rules.length,
    rules,
    ranAt: new Date().toISOString(),
    durationMs,
    disabled,
  };
  ClientLogger.info("[project-runner] ran", {
    projectId: project.id,
    verdict,
    pass,
    fail,
    skip,
    total: rules.length,
    disabled: disabled.length,
    durationMs,
  });

  return summary;
}
