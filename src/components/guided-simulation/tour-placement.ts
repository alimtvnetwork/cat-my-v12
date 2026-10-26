import type { Step } from "react-joyride";

/**
 * Tooltip placement policy for the guided simulation tour.
 *
 * Steps whose targets are full-height panels (the right config panel for
 * steps 15 and 18, the left inspection program sidebar for step 19) must
 * never use a top/bottom tooltip: there is no room above or below a
 * full-height panel, so a bottom tooltip flips to the top, runs out of
 * the viewport, and on step 15 lands under the fixed Stop button at the
 * top-right. Those steps keep a side placement, with flipping disabled.
 */
export interface TourPlacementStep {
  target: Step["target"];
  placement?: Step["placement"];
  actionKey?: string;
}

export const TOUR_TALL_TARGET_ACTION_KEYS: readonly string[] = [
  "finish-pin1-config",
  "finish-greyscale-config",
  "focus-rules",
];

export function getTourTooltipPlacement(step: TourPlacementStep): Step["placement"] {
  if (step.target === "body") {
    return "top";
  }

  if (step.actionKey && TOUR_TALL_TARGET_ACTION_KEYS.includes(step.actionKey)) {
    return step.placement;
  }

  return "bottom";
}

export function getTourFloatingOptions(
  step: TourPlacementStep,
): { flipOptions: false } | undefined {
  if (step.actionKey && TOUR_TALL_TARGET_ACTION_KEYS.includes(step.actionKey)) {
    return { flipOptions: false };
  }

  return undefined;
}
