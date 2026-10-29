import { describe, it, expect } from "vitest";
import {
  getTourTooltipPlacement,
  getTourFloatingOptions,
  type TourPlacementStep,
} from "../tour-placement";

// Tour steps are 1-based in the UI. Steps 15 and 18 anchor to the tall
// right config panel, step 19 to the tall left inspection program sidebar.
// A top/bottom tooltip has no room above or below a full-height panel:
// it flips to the top, runs out of the viewport, and on step 15 lands
// under the fixed Stop button at the top-right. These steps must therefore
// keep a side placement, with flipping disabled.
describe("tour tooltip placement for tall targets", () => {
  const step = (overrides: Partial<TourPlacementStep>): TourPlacementStep => ({
    target: "[data-tour='rule-config-controls']",
    ...overrides,
  });

  it("keeps step 15 (PIN1 config) on the left, with no flipping", () => {
    const s = step({ placement: "left", actionKey: "finish-pin1-config" });
    expect(getTourTooltipPlacement(s)).toBe("left");
    expect(getTourFloatingOptions(s)).toEqual({ flipOptions: false });
  });

  it("keeps step 18 (Greyscale config) on the left, with no flipping", () => {
    const s = step({ placement: "left", actionKey: "finish-greyscale-config" });
    expect(getTourTooltipPlacement(s)).toBe("left");
    expect(getTourFloatingOptions(s)).toEqual({ flipOptions: false });
  });

  it("keeps step 19 (configured rules) on the right, with no flipping", () => {
    const s = step({
      target: "[data-tour='project-inspection-program']",
      placement: "right",
      actionKey: "focus-rules",
    });
    expect(getTourTooltipPlacement(s)).toBe("right");
    expect(getTourFloatingOptions(s)).toEqual({ flipOptions: false });
  });

  it("respects explicit step placement or defaults to bottom, and body step on top", () => {
    const defaultStep = step({ actionKey: "go-project-list" });
    expect(getTourTooltipPlacement(defaultStep)).toBe("bottom");
    expect(getTourFloatingOptions(defaultStep)).toBeUndefined();

    const topStep = step({ placement: "top" });
    expect(getTourTooltipPlacement(topStep)).toBe("top");

    const rightStep = step({ placement: "right" });
    expect(getTourTooltipPlacement(rightStep)).toBe("right");

    const body = step({ target: "body" });
    expect(getTourTooltipPlacement(body)).toBe("top");
  });
});
