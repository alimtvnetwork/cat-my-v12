// Plan 42 step 20: Params panel for the `SameImage` condition.
// Per spec 47 s4.1, `SameImage` has no user-facing params (empty object). This
// panel exists so the ConditionCard param-slot always renders a real component
// per condition type, and future spec additions land here without touching
// callers.
import type { SameImageCondition } from "@/lib/editor/schema";

export interface SameImageParamsPanelProps {
  condition: SameImageCondition;
}

export function SameImageParamsPanel(_props: SameImageParamsPanelProps) {
  return (
    <p className="text-xs text-muted-foreground">
      Compares the run image to the ruleset&apos;s reference image. No parameters.
    </p>
  );
}