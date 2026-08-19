// Plan 42 step 17: Rule editor drawer scaffold.
// Presents a side sheet bound to a single rule id. Hosts the conditions
// editor (step 18) and reserves slots for the per-type param panels
// (steps 20-22) and the live-preview badge (step 23). Consumer owns open
// state so the drawer can be driven from RulesList row activation or from
// keyboard shortcuts without coupling here.
import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import type { EditorRule } from "@/lib/editor/types";
import type { RuleCondition, Ruleset, EditorRuleV3 } from "@/lib/editor/schema";
import { RULESET_SCHEMA_VERSION } from "@/lib/editor/schema";
import {
  ValidationModeType,
  type ValidationModeType as ValidationModeT,
} from "@/types/rules/ValidationModeType";
import type { ConditionEvaluator } from "@/lib/editor/runner/types";
import { useLivePreview } from "@/features/rules/preview/useLivePreview";
import { LivePreviewBadge } from "@/features/rules/preview/LivePreviewBadge";
import { RuleConditionsEditor } from "./RuleConditionsEditor";
import { RuleTemplateHints } from "./RuleTemplateHints";
import type { CatSeedRuleKind } from "@/lib/seed/types";

export interface RuleEditorDrawerProps {
  ruleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConditionsChange?: (ruleId: string, next: RuleCondition[]) => void;
  /** Eyedropper hook, forwarded to Color condition panels. */
  onPickColor?: () => Promise<string | null>;
  /**
   * Plan 42 step 23. Injected condition evaluator used to drive the
   * debounced live-preview badge. Callers on setup screens without a live
   * frame pass nothing; the hook then stays idle and the badge hides.
   */
  evaluator?: ConditionEvaluator;
  /** Overrides the default 250 ms live-preview debounce. */
  livePreviewDebounceMs?: number;
  /** ValidationModeType used to build the single-rule preview ruleset. */
  validationModeType?: ValidationModeT;
}

// Runtime shape of a v3 rule as it lives in the store. The store types are
// still v2 for backwards-compat, but hydration attaches `conditions` per
// spec 47 s5. See migrateRuleV2ToV3 in `src/lib/editor/migrations.ts`.
type EditorRuleWithConditions = EditorRule & { conditions?: RuleCondition[] };

export function RuleEditorDrawer({
  ruleId,
  open,
  onOpenChange,
  onConditionsChange,
  onPickColor,
  evaluator,
  livePreviewDebounceMs,
  validationModeType = ValidationModeType.Parallel,
}: RuleEditorDrawerProps) {
  const rule = useRulesStore((s) =>
    ruleId
      ? (s.rules.find((r) => r.id === ruleId) as EditorRuleWithConditions | undefined)
      : undefined,
  );

  const conditions = useMemo<readonly RuleCondition[]>(
    () => rule?.conditions ?? [],
    [rule?.conditions],
  );

  // Build a single-rule Ruleset envelope so the preview scope matches
  // exactly what the editor drawer is showing. Rebuilt on rule/condition
  // edits; the hook's own 250 ms trailing-edge debounce keeps it cheap.
  const previewRuleset = useMemo<Ruleset | null>(() => {
    if (!rule) return null;
    // The runner only reads `conditions` + `ValidationModeType`; the store rule
    // is still v2-ish and may lack `controller`. Cast via unknown so the
    // preview envelope stays typed as `Ruleset` without demanding fields
    // the evaluator does not consume.
    const previewRule = {
      ...(rule as EditorRule),
      conditions: [...conditions],
    } as unknown as EditorRuleV3;

    return {
      version: RULESET_SCHEMA_VERSION,
      validationMode: validationModeType,
      rules: [previewRule],
    };
  }, [rule, conditions, validationModeType]);

  const preview = useLivePreview(previewRuleset, {
    evaluator,
    debounceMs: livePreviewDebounceMs,
    enabled: open && Boolean(rule) && Boolean(evaluator),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-4 overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="truncate">
              {rule ? rule.name || rule.id : "No rule selected"}
            </SheetTitle>
            {rule ? <LivePreviewBadge state={preview} /> : null}
          </div>
          <SheetDescription>
            {rule
              ? "Edit rule conditions and parameters. Changes commit immediately."
              : "Select a rule from the list to begin editing."}
          </SheetDescription>
        </SheetHeader>

        {rule ? (
          <div className="flex flex-col gap-6">
            <RuleTemplateHints
              ruleKind={rule.kind as unknown as CatSeedRuleKind}
              onApply={(t) => {
                // Plan 72 step 17: apply-template action. Renames the
                // current rule to the template's default name. Geometry
                // hints stay descriptive (in the template card body) until
                // the drawer receives canvas image-bounds so we can call
                // setRuleBounds safely. Renaming alone is honest and
                // observable via the store commit log.
                const nextName = t.defaults?.name ?? t.label;

                if (nextName) {
                  useRulesStore.getState().setRuleName(rule.id, nextName);
                  console.info(
                    `[seed] rule-template applied id=${t.id} rule=${rule.id} name="${nextName}"`,
                  );
                }
              }}
            />
            <RuleConditionsEditor
              ruleId={rule.id}
              conditions={conditions}
              onChange={(next) => onConditionsChange?.(rule.id, next)}
              onPickColor={onPickColor}
            />

            <section
              aria-label="Live preview"
              data-slot="live-preview"
              className="flex items-center justify-between gap-3 rounded-md border p-3 text-xs text-muted-foreground"
            >
              <span>
                {evaluator
                  ? "Verdict recomputes as you edit conditions (debounced)."
                  : "Attach a condition evaluator to preview verdicts live."}
              </span>
              <LivePreviewBadge state={preview} />
            </section>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
