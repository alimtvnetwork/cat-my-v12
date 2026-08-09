// @vitest-environment jsdom
// Plan 65 step 7: smoke test that PanelChrome renders the professional
// 32px control chrome with tooltips and wires the callbacks. Kept small:
// the fuller integration flow lives in the SS-02 Playwright pass.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanelChrome } from "../PanelChrome";

describe("PanelChrome", () => {
  it("renders title, collapse chevron, minimize, and close controls with tooltips", () => {
    render(
      <PanelChrome
        panelId="layers"
        title="Layers"
        onToggleCollapse={() => {}}
        onMinimize={() => {}}
        onClose={() => {}}
      >
        <div>body</div>
      </PanelChrome>,
    );
    const toggle = screen.getByTestId("panel-layers-toggle");
    expect(toggle.getAttribute("aria-label")).toBe("Collapse Layers");
    expect(toggle.getAttribute("title")).toBe("Collapse Layers");
    expect(screen.getByTestId("panel-layers-minimize").getAttribute("aria-label")).toBe(
      "Minimize Layers",
    );
    expect(screen.getByTestId("panel-layers-close").getAttribute("aria-label")).toBe(
      "Close Layers",
    );
    expect(screen.getByRole("heading", { name: "Layers" })).toBeTruthy();
  });

  it("hides the body when collapsed and keeps chevron labeled 'Expand'", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <PanelChrome
        panelId="tools"
        title="Tools"
        collapsed={false}
        onToggleCollapse={onToggle}
        onClose={onClose}
      >
        <div data-testid="body">visible</div>
      </PanelChrome>,
    );
    expect(screen.getByTestId("panel-tools-body").className).not.toMatch(/(^|\s)hidden(\s|$)/);
    await user.click(screen.getByTestId("panel-tools-toggle"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId("panel-tools-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <PanelChrome
        panelId="tools"
        title="Tools"
        collapsed
        onToggleCollapse={onToggle}
        onClose={onClose}
      >
        <div>hidden</div>
      </PanelChrome>,
    );
    expect(screen.getByTestId("panel-tools-body").className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(screen.getByTestId("panel-tools-toggle").getAttribute("aria-label")).toBe(
      "Expand Tools",
    );
  });
});
