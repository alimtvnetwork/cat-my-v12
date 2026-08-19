// Plan 42 step 18: Rule conditions editor.
// Enforces the spec 47 s5 non-empty invariant: the "Delete" action on the
// last remaining condition is disabled, so the rule always retains at least
// one condition. Per-type param panels land in steps 20-22; here we render a
// minimal read-only summary plus the type badge, and expose Add / Delete.
import { Plus } from "lucide-react";
import {
  ALL_CONDITION_TYPES,
  CONDITION_TYPE_LABEL,
  type ConditionTypeType,
} from "@/types/rules/ConditionTypeType";
import { makeDefaultCondition, type RuleCondition } from "@/lib/editor/schema";
import { nextConditionId } from "@/lib/editor/store/ids";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/editor/errors";
import { ConditionCard } from "./ConditionCard";

export interface RuleConditionsEditorProps {
  ruleId: string;
  conditions: readonly RuleCondition[];
  onChange: (next: RuleCondition[]) => void;
  /** Forwarded to Color condition panels for the eyedropper. */
  onPickColor?: () => Promise<string | null>;
}

export function RuleConditionsEditor({
  ruleId,
  conditions,
  onChange,
  onPickColor,
}: RuleConditionsEditorProps) {
  const isMinimum = conditions.length <= 1;

  function handleAdd(type: ConditionTypeType) {
    const c = makeDefaultCondition(type, nextConditionId());
    onChange([...conditions, c]);
    logger.info("I_UI_CONDITION_ADDED", { ruleId, conditionId: c.id, type });
  }

  function handleDelete(conditionId: string) {
    if (isMinimum) {
      logger.warn("W_UI_CONDITION_DELETE_REFUSED", {
        ruleId,
        conditionId,
        reason: "non-empty-invariant",
      });

      return;
    }

    onChange(conditions.filter((c) => c.id !== conditionId));
    logger.info("I_UI_CONDITION_DELETED", { ruleId, conditionId });
  }

  function handleReplace(next: RuleCondition) {
    onChange(conditions.map((c) => (c.id === next.id ? next : c)));
    logger.info("I_UI_CONDITION_UPDATED", {
      ruleId,
      conditionId: next.id,
      type: next.type,
    });
  }

  return (
    <section aria-label="Rule conditions" className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Conditions</h3>
        <AddConditionMenu onAdd={handleAdd} />
      </header>

      {conditions.length === 0 ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          Rule must have at least one condition.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {conditions.map((c) => (
            <ConditionCard
              key={c.id}
              condition={c}
              canDelete={!isMinimum}
              onChange={handleReplace}
              onDelete={() => handleDelete(c.id)}
              onPickColor={onPickColor}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AddConditionMenu({ onAdd }: { onAdd: (t: ConditionTypeType) => void }) {
  return (
    <Select onValueChange={(v) => onAdd(v as ConditionTypeType)}>
      <SelectTrigger className="h-8 w-[9.5rem]" aria-label="Add condition">
        <Plus className="mr-1 h-3.5 w-3.5" />
        <SelectValue placeholder="Add condition" />
      </SelectTrigger>
      <SelectContent>
        {ALL_CONDITION_TYPES.map((t) => (
          <SelectItem key={t} value={t}>
            {CONDITION_TYPE_LABEL[t]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
