import { ToolIdType } from "@/components/rules/tools/toolTooltipMap";
// @vitest-environment jsdom
// Accessibility invariants for the V4 Tools palette.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { ToolsPalette } from "../ToolsPalette";
import { TOOL_ORDER, TOOL_TOOLTIPS } from "../toolTooltipMap";

function renderPalette(active: (typeof TOOL_ORDER)[number] = ToolIdType.Select) {
  const onChange = vi.fn();
  const onVariantChange = vi.fn();
  const utils = render(
    <ToolsPalette activeTool={active} onChange={onChange} onVariantChange={onVariantChange} />,
  );

  return { ...utils, onChange, onVariantChange };
}

describe("ToolsPalette accessibility", () => {
  afterEach(() => cleanup());

  it("exposes a radiogroup with an accessible name and radio children", () => {
    renderPalette();
    const group = screen.getByRole("radiogroup", { name: /editor tools/i });
    expect(group).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios.length).toBe(TOOL_ORDER.length);
  });

  it("labels each tool, advertises its hotkey, and applies roving tabindex", () => {
    renderPalette(ToolIdType.Select);
    for (const id of TOOL_ORDER) {
      const tip = TOOL_TOOLTIPS[id];
      const btn = screen.getByTestId(`tools-palette-${id}`);
      expect(btn.getAttribute("aria-label")).toContain(tip.title);
      expect(btn.getAttribute("aria-keyshortcuts")).toBe(tip.hotkey.toUpperCase());
      expect(btn.getAttribute("aria-describedby")).toBeTruthy();
      const expectedTab = id === "select" ? "0" : "-1";
      expect(btn.getAttribute("tabindex")).toBe(expectedTab);

      if (tip.hasFlyout) {
        expect(btn.getAttribute("aria-haspopup")).toBe("menu");
        expect(btn.getAttribute("aria-expanded")).toBe("false");
      } else {
        expect(btn.hasAttribute("aria-haspopup")).toBe(false);
      }
    }
  });

  it("moves selection with ArrowDown/ArrowUp and wraps at the ends", () => {
    const { onChange } = renderPalette(ToolIdType.Select);
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith(TOOL_ORDER[1]);
    fireEvent.keyDown(group, { key: "ArrowUp" });
    // Wraps from index 0 to the last tool.
    expect(onChange).toHaveBeenLastCalledWith(TOOL_ORDER[TOOL_ORDER.length - 1]);
    fireEvent.keyDown(group, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(TOOL_ORDER[TOOL_ORDER.length - 1]);
    fireEvent.keyDown(group, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith(TOOL_ORDER[0]);
  });

  it("opens the variant flyout with Alt+ArrowDown on a shape tool and flips aria-expanded", async () => {
    renderPalette(ToolIdType.Rectangle);
    const btn = screen.getByTestId("tools-palette-rectangle");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    act(() => {
      fireEvent.keyDown(btn, { key: "ArrowDown", altKey: true });
    });
    // Radix Popover mounts asynchronously; wait a tick.
    await act(async () => {
      await Promise.resolve();
    });
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    const menu = await screen.findByRole("menu", { name: /rectangle variants/i });
    expect(menu).toBeTruthy();
    const items = screen.getAllByRole("menuitemradio");
    expect(items.length).toBeGreaterThanOrEqual(2);
  });
});
