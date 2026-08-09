// Plan 42 step 14. Ruleset-level header. Presentational shell that surfaces
// the ruleset name and the ValidationModeType toggle (spec 50 s2). Deliberately
// stateless: the editor page owns the ruleset root and passes controlled
// props. Wiring to the persistence facade lands in a later step.

import * as React from "react";
import { cn } from "@/lib/utils";
import { ValidationModeToggle } from "@/features/rules/editor/ValidationModeToggle";
import { VALIDATION_MODE_DESCRIPTION, type ValidationModeType } from "@/types/rules/ValidationModeType";

export interface RulesetHeaderProps {
  name: string;
  ruleCount: number;
  ValidationModeType: ValidationModeType;
  onValidationModeChange: (next: ValidationModeType) => void;
  disabled?: boolean;
  className?: string;
  actionsSlot?: React.ReactNode;
}

export const RulesetHeader = React.memo(function RulesetHeader(props: RulesetHeaderProps) {
  const {
    name,
    ruleCount,
    ValidationModeType,
    onValidationModeChange,
    disabled,
    className,
    actionsSlot,
  } = props;

  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-2",
        className,
      )}
      aria-label="Ruleset header"
    >
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {name || "Untitled ruleset"}
        </h2>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {ruleCount} {ruleCount === 1 ? "rule" : "rules"}
          <span className="mx-1.5 text-border" aria-hidden="true">
            •
          </span>
          <span title={VALIDATION_MODE_DESCRIPTION[ValidationModeType]}>
            {VALIDATION_MODE_DESCRIPTION[ValidationModeType]}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <ValidationModeToggle
          value={ValidationModeType}
          onChange={onValidationModeChange}
          disabled={disabled}
        />
        {actionsSlot ? <div className="flex items-center gap-1">{actionsSlot}</div> : null}
      </div>
    </header>
  );
});
