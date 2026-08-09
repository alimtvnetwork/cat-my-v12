// Plan 100 Phase E step 41: canonical shape/geometry bridge for the
// single-selection case in the rule editor.
//
// Root cause the hook fixes, in one sentence: HUD-follow, "Reveal in
// canvas", and rotation-aware overlays each recomputed the ROI rect +
// centre + normalised rotation inline, drifting apart over time and
// making it impossible to unit-test the geometry contract in one place.
//
// Returns `null` for none/multi selection so callers can render nothing
// (or an aggregate) instead of guessing. Observability: any consumer that
// still sees `null` when it expected a shape should log with correlation
// context (V4 §21) - the hook itself stays pure.
import { useMemo } from "react";
import { useSelectedRules } from "./useSelectedRules";
import { normalizeAngle } from "@/lib/editor/rotation";
import type { EditorRect, EditorPoint } from "@/lib/editor/types";

export interface SelectedRuleShape {
  id: string;
  rect: EditorRect;
  center: EditorPoint;
  /** Rotation in degrees, normalised to (-180, 180]. 0 when unset. */
  rotation: number;
  kind: "C" | "R" | "K" | "S" | "E";
}

export function useSelectedRuleShape(): SelectedRuleShape | null {
  const { single } = useSelectedRules();

  return useMemo<SelectedRuleShape | null>(() => {
    if (!single) return null;
    const rect: EditorRect = {
      x: single.x,
      y: single.y,
      width: single.width,
      height: single.height,
    };

    return {
      id: single.id,
      rect,
      center: {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      },
      rotation: normalizeAngle(single.rotation ?? 0),
      kind: single.kind,
    };
  }, [single]);
}
