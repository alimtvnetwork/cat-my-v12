// @vitest-environment jsdom
// Plan 75 step 9 (Issue 11): smoke test that InspectorPanel renders the
// empty state when no rule is selected and does NOT render any layer-row
// affordance (which lives in LayersPanel). This locks the split.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InspectorPanel } from "../InspectorPanel";

describe("InspectorPanel", () => {
  it("renders inspector region without layer rows", () => {
    render(<InspectorPanel />);
    const region = screen.getByRole("region", { name: /inspector/i });
    expect(region).toBeTruthy();
    // No selection => properties panel shows empty state; there must be
    // no reorder / visibility toggle affordances (those belong to LayersPanel).
    expect(screen.queryByRole("button", { name: /toggle visibility/i })).toBeNull();
  });
});
