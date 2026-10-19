import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjectStore, selectRulesetsForProject } from "@/lib/projects/store";
import { resolveIdParam, toIntParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";
import type { EditorRule } from "@/lib/editor/types";
import { RuleToolConfigPanel } from "@/components/vision/workpiece/RuleToolConfigPanel";

export const Route = createFileRoute("/projects/$projectId/rulesets/$rulesetId/tune/$ruleId")({
  component: TuneRulePage,
});

function TuneRulePage() {
  const { projectId, rulesetId, ruleId } = Route.useParams();
  const navigate = useNavigate();

  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const resolvedRulesetId = useMemo(
    () => resolveIdParam(IntAliasNamespaceType.Ruleset, rulesetId) || rulesetId,
    [rulesetId],
  );
  const ruleset = useMemo(
    () =>
      rulesets.find(
        (r: any) =>
          r.id === rulesetId ||
          r.id === resolvedRulesetId ||
          resolveIdParam(IntAliasNamespaceType.Ruleset, r.id) === rulesetId,
      ),
    [rulesets, rulesetId, resolvedRulesetId],
  );

  const rule = useMemo(
    () => ruleset?.rules.find((r: any) => r.id === ruleId) as EditorRule | undefined,
    [ruleset, ruleId],
  );

  const navigateBack = async () => {
    if (!ruleset) return;

    await navigate({
      to: "/projects/$projectId/rulesets/$rulesetId",
      params: {
        projectId,
        rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, ruleset.id),
      },
    });
  };

  if (!ruleset || !rule) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#06080d] text-slate-400 font-mono text-xs">
        Rule not found.
      </div>
    );
  }

  return (
    <RuleToolConfigPanel
      key={rule.id}
      ruleset={ruleset}
      rule={rule}
      onExit={() => void navigateBack()}
    />
  );
}
