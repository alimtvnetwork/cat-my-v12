// Plan 42 step 19: Controlled select for a condition's `type`.
// Changing the type replaces params via `makeDefaultCondition` so the union
// stays well-typed (spec 47 s4). The parent owns the swap because condition
// ids are stable across a type change.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_CONDITION_TYPES,
  CONDITION_TYPE_LABEL,
  type ConditionType,
} from "@/types/rules/ConditionType";

export interface ConditionTypeSelectProps {
  value: ConditionType;
  onChange: (next: ConditionType) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export function ConditionTypeSelect({
  value,
  onChange,
  disabled,
  ariaLabel = "Condition type",
}: ConditionTypeSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ConditionType)} disabled={disabled}>
      <SelectTrigger className="h-7 w-[9rem] text-xs" aria-label={ariaLabel}>
        <SelectValue />
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
