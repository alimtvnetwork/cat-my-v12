// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { ToolAlgorithmConfigPanel } from "../ToolAlgorithmConfigPanel";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";

describe("ToolAlgorithmConfigPanel", () => {
  afterEach(() => {
    cleanup();
  });
  const baseRule: EditorRule = {
    id: "r1",
    name: "Pattern Check",
    kind: EditorRuleKindType.C,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: 10,
    y: 10,
    width: 100,
    height: 100,
    categoryName: "Presence / Absence",
    params: {
      toolCode: "T102",
      matchThresholdPct: 80,
      angleRangeDeg: 15,
      scoreMetric: "ncc",
    },
  };

  it("renders tool code badge and category name", () => {
    render(<ToolAlgorithmConfigPanel rule={baseRule} />);
    expect(screen.getByText("[T102]")).toBeDefined();
    expect(screen.getByText("Presence / Absence")).toBeDefined();
    expect(screen.getByText(/Greyscale Level/i)).toBeDefined();
    expect(screen.getByText(/Calibrate Pattern Visually/i)).toBeDefined();
  });

  it("calls onUpdateParams when slider value changes", () => {
    const onUpdateParams = vi.fn();
    render(<ToolAlgorithmConfigPanel rule={baseRule} onUpdateParams={onUpdateParams} />);

    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBeGreaterThan(0);
    fireEvent.change(sliders[0], { target: { value: "88" } });

    expect(onUpdateParams).toHaveBeenCalledTimes(1);
    expect(onUpdateParams).toHaveBeenCalledWith("r1", expect.objectContaining({
      greyscaleLevel: 88,
    }));
  });

  it("renders fallback message when rule has no bound tool code", () => {
    const plainRule: EditorRule = {
      ...baseRule,
      params: undefined,
    };
    render(<ToolAlgorithmConfigPanel rule={plainRule} />);
    expect(screen.getByText(/No predefined vision tool bound/i)).toBeDefined();
  });
});
