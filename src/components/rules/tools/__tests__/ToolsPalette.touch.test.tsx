import { ToolIdType } from "@/components/rules/tools/toolTooltipMap";
// @vitest-environment jsdom
// Touch behavior for the V4 Tools palette long-press hint.
// Verifies iOS Safari / Android Chrome parity: long-press opens the
// variant flyout without also selecting the tool via the trailing click,
// while a plain tap still selects.

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { ToolsPalette } from "../ToolsPalette";

function renderPalette() {
  const onChange = vi.fn();
  const onVariantChange = vi.fn();
  const utils = render(
    <ToolsPalette
      activeTool={ToolIdType.Select}
      onChange={onChange}
      onVariantChange={onVariantChange}
    />,
  );

  return { ...utils, onChange, onVariantChange };
}

describe("ToolsPalette touch long-press", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("opens the flyout after a touch long-press and suppresses the trailing click", async () => {
    const { onChange } = renderPalette();
    const btn = screen.getByTestId("tools-palette-rectangle");

    act(() => {
      fireEvent.pointerDown(btn, {
        pointerType: "touch",
        button: 0,
        clientX: 10,
        clientY: 10,
      });
    });
    // Advance past the 400 ms long-press threshold.
    act(() => {
      vi.advanceTimersByTime(450);
    });
    // Simulate the natural touch release + synthetic click sequence.
    act(() => {
      fireEvent.pointerUp(btn, { pointerType: "touch", clientX: 10, clientY: 10 });
      fireEvent.click(btn);
    });

    expect(btn.getAttribute("aria-expanded")).toBe("true");
    // The long-press did NOT also select the tool.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects the tool on a short tap without opening the flyout", () => {
    const { onChange } = renderPalette();
    const btn = screen.getByTestId("tools-palette-rectangle");

    act(() => {
      fireEvent.pointerDown(btn, {
        pointerType: "touch",
        button: 0,
        clientX: 10,
        clientY: 10,
      });
      vi.advanceTimersByTime(120);
      fireEvent.pointerUp(btn, { pointerType: "touch", clientX: 10, clientY: 10 });
      fireEvent.click(btn);
    });

    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).toHaveBeenCalledWith("rectangle");
  });

  it("cancels the long-press when the finger drags past the slop threshold", () => {
    const { onChange } = renderPalette();
    const btn = screen.getByTestId("tools-palette-rectangle");

    act(() => {
      fireEvent.pointerDown(btn, {
        pointerType: "touch",
        button: 0,
        clientX: 10,
        clientY: 10,
      });
      // Drag well past 8 px slop before the long-press timer fires.
      fireEvent.pointerMove(btn, {
        pointerType: "touch",
        clientX: 40,
        clientY: 40,
      });
      vi.advanceTimersByTime(500);
      fireEvent.pointerUp(btn, { pointerType: "touch", clientX: 40, clientY: 40 });
      fireEvent.click(btn);
    });

    // Flyout stayed closed; the tap-with-drag still selects the tool
    // (a drag on a button is a normal tap in mobile guidance).
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(onChange).toHaveBeenCalledWith("rectangle");
  });
});
