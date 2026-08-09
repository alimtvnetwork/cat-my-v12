// Plan 42 step 19: ConditionCard renders one row of the conditions editor.
// Owns: type-select (via ConditionTypeSelect), delete button (with non-empty
// invariant enforcement handled by parent), and a per-type params slot.
// Changing the type swaps params via `makeDefaultCondition` to keep the
// discriminated union well-typed (spec 47 s4).
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { makeDefaultCondition, type RuleCondition } from "@/lib/editor/schema";
import {
  ConditionTypeType,
  type ConditionTypeType as ConditionTypeT,
} from "@/types/rules/ConditionTypeType";
import { ConditionTypeSelect } from "./ConditionTypeSelect";
import { SameImageParamsPanel } from "./SameImageParamsPanel";
import { PresenceParamsPanel } from "./PresenceParamsPanel";
import { ColorParamsPanel } from "./ColorParamsPanel";

export interface ConditionCardProps {
  condition: RuleCondition;
  canDelete: boolean;
  onChange: (next: RuleCondition) => void;
  onDelete: () => void;
  /** Optional eyedropper hook, forwarded to the Color params panel. */
  onPickColor?: () => Promise<string | null>;
}

export function ConditionCard({
  condition,
  canDelete,
  onChange,
  onDelete,
  onPickColor,
}: ConditionCardProps) {
  function handleTypeChange(next: ConditionTypeT) {
    if (next === condition.type) return;
    onChange(makeDefaultCondition(next, condition.id));
  }

  return (
    <li
      data-condition-id={condition.id}
      className="flex flex-col gap-2 rounded-md border bg-card px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <ConditionTypeSelect
          value={condition.type}
          onChange={handleTypeChange}
          ariaLabel={`Condition ${condition.id} type`}
        />
        <span className="flex-1 truncate text-xs text-muted-foreground">{condition.id}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Delete condition ${condition.id}`}
          onClick={onDelete}
          disabled={!canDelete}
          title={canDelete ? "Delete condition" : "Rules must keep at least one condition"}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <ParamsSlot condition={condition} onChange={onChange} onPickColor={onPickColor} />
    </li>
  );
}

interface ParamsSlotProps {
  condition: RuleCondition;
  onChange: (next: RuleCondition) => void;
  onPickColor?: () => Promise<string | null>;
}

function ParamsSlot({ condition, onChange, onPickColor }: ParamsSlotProps) {
  switch (condition.type) {
    case ConditionTypeType.SameImage:
      return <SameImageParamsPanel condition={condition} />;
    case ConditionTypeType.Presence:
      return <PresenceParamsPanel condition={condition} onChange={onChange} />;
    case ConditionTypeType.Color:
      return (
        <ColorParamsPanel condition={condition} onChange={onChange} onPickColor={onPickColor} />
      );
    default: {
      const _exhaustive: never = condition;

      return _exhaustive;
    }
  }
}
