import { ToolIdType } from "@/components/rules/tools/toolTooltipMap";
// @vitest-environment jsdom
// Behavior of the extended per-tool guide dialog.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { ToolGuideDialog } from "../ToolGuideDialog";
import { TOOL_GUIDES } from "../toolGuides";

afterEach(() => cleanup());

describe("ToolGuideDialog", () => {
  it("renders nothing when closed", () => {
    render(<ToolGuideDialog toolId={ToolIdType.Select} open={false} onOpenChange={() => {}} />);
    expect(screen.queryByTestId("tool-guide-dialog")).toBeNull();
  });

  it("renders the tool title, hotkey, summary, and every section heading when open", () => {
    render(<ToolGuideDialog toolId={ToolIdType.Rectangle} open={true} onOpenChange={() => {}} />);
    const dialog = screen.getByTestId("tool-guide-dialog");
    expect(dialog.textContent).toMatch(/Rectangle/);
    // Hotkey pill: uppercase letter appears in the header string.
    expect(dialog.textContent).toMatch(/RectangleR/);
    expect(dialog.textContent).toMatch(TOOL_GUIDES.rectangle.summary.slice(0, 30));
    for (const section of TOOL_GUIDES.rectangle.sections) {
      expect(dialog.textContent).toMatch(section.heading);
    }
  });

  it("invokes onOpenChange(false) when the user presses Escape", () => {
    const onOpenChange = vi.fn();
    render(
      <ToolGuideDialog toolId={ToolIdType.Texttools} open={true} onOpenChange={onOpenChange} />,
    );
    act(() => {
      fireEvent.keyDown(document.activeElement || document.body, {
        key: "Escape",
      });
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
