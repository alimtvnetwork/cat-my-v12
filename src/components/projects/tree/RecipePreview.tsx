// Plan 03 step 4. Recipe preview (§6.2).
// Numbered rule chips (Yeasin pipeline-guide language), per-rule
// "runs X1, X2 first" badges, effective chain length, enable toggle,
// add-rule picker. Actions use the same store actions as the tree.

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { computeEffectiveChain } from "@/lib/projects/chain";
import { useRecipeStore } from "@/lib/recipes/store";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import { ClientLogger } from "@/lib/observability/client-logger";
import type { RecipeId } from "@/lib/recipes/model";
import type { RuleId } from "@/lib/rules/model";

export function RecipePreview({ recipeId }: { recipeId: string }): React.JSX.Element {
  const recipe = useRecipeStore((s) => s.recipes[recipeId]);
  const { addRuleToRecipe, setRecipeEnabled } = useRecipeStore((s) => ({
    addRuleToRecipe: s.addRuleToRecipe,
    setRecipeEnabled: s.setRecipeEnabled,
  }));
  const { rules, byId } = useRulesLibrary();
  const [pickedRuleId, setPickedRuleId] = useState("");

  if (!recipe) return <p className="text-xs text-ca-ink-muted">Recipe not found.</p>;

  const chain = computeEffectiveChain(recipe.ruleIds, (id) => byId(id) ?? null);
  const ruleNameOf = (id: RuleId): string => byId(id)?.name ?? id;
  const availableRules = rules.filter(
    (r) => r.isCategory === false && recipe.ruleIds.includes(r.id) === false,
  );

  const handleAddRule = (): void => {
    if (pickedRuleId.length === 0) return;

    try {
      addRuleToRecipe(recipe.id as RecipeId, pickedRuleId as RuleId);
      setPickedRuleId("");
      toast.success("Rule added to recipe");
    } catch (err) {
      ClientLogger.error("[recipe-preview] addRuleToRecipe failed", { recipeId, pickedRuleId, err });
      toast.error(err instanceof Error ? err.message : "Failed to add rule");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ca-ink-muted">
          {recipe.ruleIds.length} rules · chain {chain.chain.length}
        </p>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ca-ink">
          <input
            type="checkbox"
            checked={recipe.isEnabled !== false}
            onChange={(event) => setRecipeEnabled(recipe.id as RecipeId, event.target.checked)}
            className="h-3.5 w-3.5 accent-ca-select"
          />
          Enabled
        </label>
      </div>

      <ol className="space-y-1.5">
        {recipe.ruleIds.map((ruleId, index) => {
          const rule = byId(ruleId);
          const preNames = (rule?.appliesBefore ?? []).map(ruleNameOf);

          return (
            <li
              key={ruleId}
              className="rounded-sm border border-ca-border bg-ca-panel-2 p-2"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ca-bg font-mono text-[10px] font-bold text-ca-ink">
                  {index}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ca-ink">
                  {ruleNameOf(ruleId)}
                </span>
                <span className="rounded border border-ca-border px-1 font-mono text-[10px] text-ca-ink-muted">
                  —
                </span>
              </div>
              {preNames.length > 0 ? (
                <p className="mt-1 pl-7 text-[10px] text-ca-ink-muted">
                  runs {preNames.join(", ")} first
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      {recipe.ruleIds.length === 0 ? (
        <p className="text-xs text-ca-ink-muted">No rules yet. Add one below.</p>
      ) : null}
      <p className="text-[10px] leading-relaxed text-ca-ink-muted">
        Downstream rules short-circuit on failure — failed rules skip the rest of the chain.
      </p>

      <div className="flex gap-1.5">
        <select
          aria-label="Rule to add"
          value={pickedRuleId}
          onChange={(event) => setPickedRuleId(event.target.value)}
          className="h-7 min-w-0 flex-1 rounded-sm border border-ca-border bg-ca-bg px-1.5 text-xs text-ca-ink"
        >
          <option value="">Add rule…</option>
          {availableRules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAddRule}
          disabled={pickedRuleId.length === 0}
          aria-label="Add selected rule to recipe"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-ca-border bg-ca-panel text-ca-ink hover:border-ca-select disabled:opacity-50"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
