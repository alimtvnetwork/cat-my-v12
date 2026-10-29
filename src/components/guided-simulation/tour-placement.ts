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
 *
 * All steps with explicit placement (e.g. "top" for modals, "left" for drawers,
 * "right" for sidebars) are respected to prevent overlaps with the floating
 * HUD bar at the bottom.
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
  "create-ruleset",
];

export const TOUR_SIDE_PANEL_TARGETS: readonly string[] = [
  "[data-tour='simulation-ruleset-create-panel']",
  "[data-tour='simulation-ruleset-create-submit']",
];

export function getTourTooltipPlacement(step: TourPlacementStep): Step["placement"] {
  if (step.target === "body") {
    return "top";
  }

  if (step.placement) {
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

  if (typeof step.target === "string" && TOUR_SIDE_PANEL_TARGETS.includes(step.target)) {
    return { flipOptions: false };
  }

  return undefined;
}
