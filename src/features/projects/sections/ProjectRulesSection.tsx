import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
// Plan 80 steps 5 + 6. Extracted Rules section for the V4 project editor.
//
// Root cause this file addresses in one sentence:
//   ProjectEditorSections.tsx had grown past 950 lines with the Rules
//   section inlined and no add-time conflict detection, so future refactors
//   were risky and the operator could silently push a project into an
//   ambiguous rule chain.
//
// Two responsibilities, both scoped:
//   1. Render the ordered rulesets attached to a Project with reorder /
//      remove / open-editor actions and the effective chain kind-token
//      badges (unchanged behaviour lifted from ProjectEditorSections.tsx).
//   2. Detect at render time whether the current rulesetIds produce a
//      rule-chain conflict (the same EditorRule id appearing in more than
//      one ruleset attached to the same project). If so, block the
//      "Add ruleset" affordance via aria-disabled + click-guard and
//      capture a structured error through the global error store so it is
//      surfaced in the notice UI and persisted history, not silently swallowed.

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUp, ArrowDown, Trash2, Plus, AlertTriangle, PowerOff } from "lucide-react";
import type { Project, RuleSet } from "@/lib/projects/store";
import { useProjectStore } from "@/lib/projects/store";
import { useErrorStore } from "@/lib/errors/errorStore";
import { showToastError } from "@/lib/errors/notify";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import { useUiPrefsStore } from "@/lib/ui-prefs-store";
import { StatusFilterType } from "@/routes/setup.rules";
import { toIntParam } from "@/lib/ids/int-alias";

export interface ProjectRulesSectionProps {
  project: Project;
  rulesets: readonly RuleSet[];
}

interface RuleConflict {
  /** Rule id shared by two or more rulesets attached to this project. */
  ruleId: string;
  /** Ruleset ids that share this rule id (ordered by project order). */
  rulesetIds: string[];
}

/**
 * Detect add-time rule chain conflicts for a project's attached rulesets.
 *
 * The current V3-shape RuleSet.rules[] uses EditorRule which has no
 * `appliesBefore` field, so classic DAG cycles cannot manifest at this
 * level. What CAN silently break execution order today is the same rule
 * id appearing across multiple rulesets attached to the same project:
 * downstream runners then evaluate it twice with no defined precedence.
 *
 * We treat that as a chain cycle for UX purposes: block the Add button
 * and route the operator to fix the offending rulesets first.
 */
export function detectProjectRuleConflicts(
  project: Project,
  rulesets: readonly RuleSet[],
): RuleConflict[] {
  const byRuleId = new Map<string, string[]>();
  const attached = new Set(project.rulesetIds);
  for (const rs of rulesets) {
    if (attached.has(rs.id) === false) continue;
    for (const rule of rs.rules) {
      const arr = byRuleId.get(rule.id) ?? [];

      if (arr.includes(rs.id) === false) arr.push(rs.id);
      byRuleId.set(rule.id, arr);
    }
  }

  const conflicts: RuleConflict[] = [];
  for (const [ruleId, ids] of byRuleId) {
    if (ids.length > 1) conflicts.push({ ruleId, rulesetIds: ids });
  }

  return conflicts;
}

export function ProjectRulesSection({ project, rulesets }: ProjectRulesSectionProps) {
  const reorder = useProjectStore((s) => s.reorderProjectRulesets);
  const deleteRuleset = useProjectStore((s) => s.deleteRuleset);
  const captureError = useErrorStore((s) => s.captureError);
  const [error, setError] = useState<string | null>(null);

  const orderedIds = project.rulesetIds;
  const byId = useMemo(() => new Map(rulesets.map((r) => [r.id, r] as const)), [rulesets]);

  // Plan 83 backlog 11f. Cross-reference EditorRule ids against the domain
  // Rule library so we can surface the `enabled === false` count from the
  // effective chain (see `computeEffectiveChain` -> ChainResult.disabled)
  // without threading a new selector through the V3 project store.
  const rulesLib = useRulesLibrary();
  const isRuleDisabled = useMemo(() => {
    return (ruleId: string): boolean => {
      // EditorRule.id and Rule.id share their string identity; the RuleId
      // brand is a compile-time nominal type, so cast at the boundary.
      const r = rulesLib.byId(ruleId as unknown as import("@/lib/rules/model").RuleId);

      return r ? r.enabled === false : false;
    };
  }, [rulesLib]);

  const conflicts = useMemo(
    () => detectProjectRuleConflicts(project, rulesets),
    [project, rulesets],
  );
  const hasConflict = conflicts.length > 0;

  // Plan 83 backlog 11h. Project-level aggregate of fully-disabled rulesets
  // (all rules in the ruleset have `enabled === false`). Reuses the same
  // `isRuleDisabled` seam so the summary and the per-row banner cannot drift.
  const rulesetSummary = useMemo(() => {
    let fullyDisabled = 0;
    let partiallyDisabled = 0;
    for (const rid of orderedIds) {
      const rs = byId.get(rid);

      if (!rs || rs.rules.length === 0) continue;
      const off = rs.rules.filter((r) => isRuleDisabled(r.id)).length;

      if (off === 0) continue;

      if (off === rs.rules.length) fullyDisabled += 1;
      else partiallyDisabled += 1;
    }

    return { fullyDisabled, partiallyDisabled, total: orderedIds.length };
  }, [orderedIds, byId, isRuleDisabled]);

  // Surface conflicts through the global error store exactly once per
  // distinct fingerprint so the notice UI + persisted history reflects
  // the state, not on every render.
  const isNonHasConflict = !hasConflict;

  useEffect(() => {
    if (isNonHasConflict) return;
    const fingerprint = conflicts
      .map((c) => `${c.ruleId}:${c.rulesetIds.join(",")}`)
      .sort()
      .join("|");
    console.warn("[project-editor/rules] chain conflict detected", {
      projectId: project.id,
      fingerprint,
      conflicts,
    });
    captureError(
      new Error(
        `Rule chain conflict: ${conflicts.length} rule id(s) shared across rulesets in project ${project.name}.`,
      ),
      {
        source: "ProjectRulesSection",
        context: { projectId: project.id, fingerprint, conflicts },
      },
      "E_RULE_CHAIN_CYCLE",
    );
    // Also surface a sonner toast (with View Details action) so the
    // operator sees add-time cycle detection immediately, not only in
    // the persisted history.
    showToastError(
      `Rule chain conflict in "${project.name}": ${conflicts.length} shared rule id(s)`,
      new Error(`fingerprint=${fingerprint}`),
      { source: "ProjectRulesSection", method: "detect-cycle" },
    );
    // Fingerprint change is the only signal that must retrigger.
  }, [hasConflict, project.id, project.name, conflicts, captureError]);

  function move(idx: number, dir: -1 | 1): void {
    const target = idx + dir;

    if (target < 0 || target >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    try {
      reorder(project.id, next);
      console.info("[project-editor/rules] moved", {
        projectId: project.id,
        from: idx,
        to: target,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/rules] reorder failed", e);
      setError(msg);
    }
  }

  function remove(id: string): void {
    if (
      window.confirm("Remove this ruleset from the project? The ruleset will be deleted.") === false
    )

      return;
    try {
      deleteRuleset(id);
      console.info("[project-editor/rules] removed", { projectId: project.id, rulesetId: id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/rules] delete failed", e);
      setError(msg);
    }
  }

  return (
    <section
      aria-label="Rules"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
      data-testid="project-editor-rules"
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <div>
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Rules
          </h2>
          <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
            {orderedIds.length} {orderedIds.length === 1 ? "ruleset" : "rulesets"} in evaluation
            order. Use up / down to reorder, trash to remove.
          </p>
        </div>
        {hasConflict ? (
          <span
            role="button"
            aria-disabled="true"
            aria-label="Add ruleset disabled: fix rule chain conflict first"
            title="Fix the rule chain conflict below before adding another ruleset"
            className="inline-flex cursor-not-allowed items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink opacity-50"
            data-testid="project-editor-add-ruleset-disabled"
          >
            <Plus aria-hidden size={16} />
            Add ruleset
          </span>
        ) : (
          <Link
            to="/projects/$projectId/rulesets"
            params={{ projectId: toIntParam(IntAliasNamespaceType.Project, project.id) }}
            className="inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink transition hover:border-ca-select"
            aria-label="Add ruleset"
          >
            <Plus aria-hidden size={16} />
            Add ruleset
          </Link>
        )}
      </div>
      {hasConflict ? (
        <div
          role="alert"
          data-testid="project-editor-rule-chain-conflict"
          className="mt-hmi-2 flex items-start gap-hmi-2 rounded-md border border-ca-ng bg-ca-panel-2 p-hmi-2 text-hmi-caption text-ca-ink"
        >
          <AlertTriangle aria-hidden size={16} className="mt-0.5 text-ca-ng" />
          <div className="min-w-0">
            <p className="font-semibold text-ca-ng">Rule chain conflict</p>
            <ul className="mt-hmi-1 space-y-0.5">
              {conflicts.slice(0, 5).map((c) => (
                <li key={c.ruleId} className="truncate font-mono">
                  {c.ruleId} shared by{" "}
                  {c.rulesetIds.map((rid) => byId.get(rid)?.name ?? rid).join(", ")}
                </li>
              ))}
              {conflicts.length > 5 ? (
                <li className="text-ca-ink-muted">+{conflicts.length - 5} more</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
      {rulesetSummary.fullyDisabled > 0 || rulesetSummary.partiallyDisabled > 0 ? (
        <div
          data-testid="project-editor-ruleset-summary"
          className={
            "mt-hmi-2 flex items-center justify-between gap-hmi-2 rounded-md border bg-ca-panel-2 px-hmi-3 py-hmi-1 text-hmi-caption " +
            (rulesetSummary.fullyDisabled > 0
              ? "border-ca-warn text-ca-ink"
              : "border-ca-border text-ca-ink-muted")
          }
        >
          <span>
            {rulesetSummary.fullyDisabled > 0 ? (
              <>
                <span className="font-semibold text-ca-warn">
                  {rulesetSummary.fullyDisabled} of {rulesetSummary.total}
                </span>{" "}
                ruleset{rulesetSummary.fullyDisabled === 1 ? "" : "s"} fully disabled
                {rulesetSummary.partiallyDisabled > 0
                  ? `, ${rulesetSummary.partiallyDisabled} partially disabled`
                  : ""}
                .
              </>
            ) : (
              <>
                {rulesetSummary.partiallyDisabled} of {rulesetSummary.total} ruleset
                {rulesetSummary.partiallyDisabled === 1 ? "" : "s"} partially disabled.
              </>
            )}
          </span>
          <Link
            to="/setup/rules"
            search={{ status: StatusFilterType.Disabled }}
            className="shrink-0 rounded-md border border-ca-border bg-ca-panel px-hmi-2 py-0.5 font-mono text-[12px] text-ca-ink hover:border-ca-select"
          >
            Review disabled
          </Link>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-hmi-2 text-hmi-caption text-ca-ng">
          {error}
        </p>
      ) : null}
      {orderedIds.length === 0 ? (
        <p className="mt-hmi-3 rounded-md border border-dashed border-ca-border bg-ca-panel-2 p-hmi-3 text-hmi-body text-ca-ink-muted">
          No rulesets yet. Add one to start building the chain.
        </p>
      ) : (
        <ol className="mt-hmi-3 space-y-hmi-1">
          {orderedIds.map((rid, idx) => {
            const rs = byId.get(rid);
            const ruleCount = rs?.rules.length ?? 0;
            const disabledCount = rs ? rs.rules.filter((r) => isRuleDisabled(r.id)).length : 0;
            const activeCount = ruleCount - disabledCount;
            const fullyDisabled = ruleCount > 0 && disabledCount === ruleCount;
            const disabledUp = idx === 0;
            const disabledDown = idx === orderedIds.length - 1;

            return (
              <li
                key={rid}
                className={
                  "flex flex-wrap items-center gap-hmi-2 rounded-md border bg-ca-panel-2 px-hmi-3 py-hmi-2 " +
                  (fullyDisabled ? "border-ca-warn" : "border-ca-border")
                }
                data-testid="project-editor-rule-row"
              >
                <span
                  aria-hidden
                  className="w-6 text-right font-mono text-hmi-caption text-ca-ink-muted"
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/setup/rules/$id"
                    params={{ id: rid }}
                    className="truncate font-display text-hmi-body font-semibold text-ca-ink hover:text-ca-select"
                  >
                    {rs?.name ?? "(missing)"}
                  </Link>
                  <p className="truncate text-hmi-caption text-ca-ink-muted">
                    {ruleCount} {ruleCount === 1 ? "rule" : "rules"} in chain
                    {disabledCount > 0 ? ` · ${activeCount} active` : ""}
                    {rs?.categoryName ? ` · ${rs.categoryName}` : ""}
                  </p>
                  {ruleCount > 0 && rs ? (
                    <ol
                      aria-label={`Effective chain: ${rs.rules.map((r) => r.name).join(", ")}`}
                      className="mt-hmi-1 flex flex-wrap items-center gap-1 font-mono text-[12px] tabular-nums text-ca-ink-muted"
                      data-testid="project-editor-rule-chain"
                    >
                      {rs.rules.slice(0, 4).map((r, i) => {
                        const off = isRuleDisabled(r.id);

                        return (
                          <li key={r.id} className="inline-flex items-center gap-1">
                            {i > 0 ? <span aria-hidden>›</span> : null}
                            <span
                              title={off ? `${r.name} (disabled)` : r.name}
                              className={
                                "inline-flex min-w-[1.25rem] justify-center rounded border border-ca-border bg-ca-panel px-1" +
                                (off ? " line-through opacity-50" : "")
                              }
                            >
                              {r.kind}
                            </span>
                          </li>
                        );
                      })}
                      {ruleCount > 4 ? (
                        <li className="inline-flex items-center gap-1">
                          <span aria-hidden>›</span>
                          <span className="rounded border border-dashed border-ca-border px-1">
                            +{ruleCount - 4}
                          </span>
                        </li>
                      ) : null}
                    </ol>
                  ) : null}
                </div>
                {disabledCount > 0 ? (
                  <Link
                    to="/setup/rules"
                    search={{ status: StatusFilterType.Disabled }}
                    aria-label={`${disabledCount} disabled rule(s) in chain. Open filtered list.`}
                    title={`${disabledCount} disabled in chain, click to review`}
                    data-testid="project-editor-rule-disabled-chip"
                    className="inline-flex items-center gap-1 rounded-md border border-ca-border bg-ca-panel px-hmi-2 py-0.5 font-mono text-[13px] tabular-nums text-ca-ink-muted hover:border-ca-select hover:text-ca-ink"
                  >
                    <PowerOff aria-hidden size={12} />
                    {disabledCount}
                  </Link>
                ) : null}
                <span
                  aria-label={`${ruleCount} rules in chain`}
                  className="inline-flex min-w-[2rem] justify-center rounded-md border border-ca-border bg-ca-panel px-hmi-2 py-0.5 font-mono text-[13px] tabular-nums text-ca-ink"
                >
                  {ruleCount}
                </span>
                <IconBtn
                  Icon={ArrowUp}
                  label="Move up"
                  disabled={disabledUp}
                  onClick={() => move(idx, -1)}
                />
                <IconBtn
                  Icon={ArrowDown}
                  label="Move down"
                  disabled={disabledDown}
                  onClick={() => move(idx, 1)}
                />
                <IconBtn Icon={Trash2} label="Remove" tone="danger" onClick={() => remove(rid)} />
                {fullyDisabled ? (
                  <div
                    role="alert"
                    data-testid="project-editor-ruleset-all-disabled"
                    className="mt-hmi-1 flex w-full items-start gap-hmi-2 rounded-md border border-ca-warn bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ink"
                  >
                    <AlertTriangle aria-hidden size={14} className="mt-0.5 text-ca-warn" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-ca-warn">All rules disabled.</span>{" "}
                      <span className="text-ca-ink-muted">
                        This ruleset contributes nothing to the effective chain until at least one
                        rule is re-enabled.
                      </span>
                    </div>
                    <Link
                      to="/setup/rules"
                      search={{ status: StatusFilterType.Disabled }}
                      className="shrink-0 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 font-mono text-[12px] text-ca-ink hover:border-ca-select"
                    >
                      Review disabled
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function IconBtn({
  Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  Icon: typeof ArrowUp;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
}) {
  const cls =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-ca-border bg-ca-panel text-ca-ink transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus disabled:cursor-not-allowed disabled:opacity-40" +
    (tone === "danger" ? " text-ca-ng hover:text-ca-ng" : "");

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cls}
    >
      <Icon aria-hidden size={16} />
    </button>
  );
}