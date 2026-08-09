// Plan 42 step 14. Controlled ValidationMode toggle used by RulesetHeader.
// Purely presentational: parent owns state (ruleset root, spec 49 s3).

import * as React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ValidationMode,
  VALIDATION_MODE_LABEL,
  VALIDATION_MODE_DESCRIPTION,
  ALL_VALIDATION_MODES,
} from "@/types/rules/ValidationMode";

export interface ValidationModeToggleProps {
  value: ValidationMode;
  onChange: (next: ValidationMode) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const ValidationModeToggle = React.memo(function ValidationModeToggle(
  props: ValidationModeToggleProps,
) {
  const { value, onChange, disabled, className, ariaLabel = "Validation mode" } = props;

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        // Radix emits "" when the user clicks the active item; ignore so the
        // ruleset root always has a valid ValidationMode (spec 49 s3).
        if (!next) return;
        onChange(next as ValidationMode);
      }}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    >
      {ALL_VALIDATION_MODES.map((m) => (
        <ToggleGroupItem
          key={m}
          value={m}
          aria-label={VALIDATION_MODE_LABEL[m]}
          title={VALIDATION_MODE_DESCRIPTION[m]}
          size="sm"
        >
          {VALIDATION_MODE_LABEL[m]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
});
