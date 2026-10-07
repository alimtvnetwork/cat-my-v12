// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { VisualToolTuningModal } from "../VisualToolTuningModal";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
});

const samplePatternRule: EditorRule = {
  id: "rule-pattern-test",
  name: "Greyscale Pattern Match",
  kind: EditorRuleKindType.R,
  family: EditorToolFamilyType.Rect,
  isHidden: false,
  isLocked: false,
  x: 100,
  y: 100,
  width: 200,
  height: 200,
  params: {
    toolCode: "T102",
    category: "Presence / Absence",
    threshold: 170,
    tolerancePx: 8,
  },
};

const sampleAreaRule: EditorRule = {
  id: "rule-area-test",
  name: "Area Inspection",
  kind: EditorRuleKindType.R,
  family: EditorToolFamilyType.Rect,
  isHidden: false,
  isLocked: false,
  x: 50,
  y: 50,
  width: 150,
  height: 150,
  params: {
    toolCode: "T101",
    category: "Presence / Absence",
    minAreaPx: 500,
  },
};

describe("VisualToolTuningModal", () => {
  it("renders pattern matching tuning workbench when pattern rule provided", () => {
    render(
      <VisualToolTuningModal
        isOpen={true}
        onClose={vi.fn()}
        rule={samplePatternRule}
        onApplyRule={vi.fn()}
      />,
    );

    expect(screen.getByText(/Visual Tool Tuning Workbench:/)).toBeTruthy();
    expect(screen.getAllByText(/Greyscale Pattern Match/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\[T102\]/)).toBeTruthy();
  });

  it("renders standard inspection tool dispatcher and apply button for area rule", () => {
    const handleApply = vi.fn();
    render(
      <VisualToolTuningModal
        isOpen={true}
        onClose={vi.fn()}
        rule={sampleAreaRule}
        onApplyRule={handleApply}
      />,
    );

    expect(screen.getByText(/Apply to Rule/)).toBeTruthy();
    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledTimes(1);
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <VisualToolTuningModal
        isOpen={false}
        onClose={vi.fn()}
        rule={samplePatternRule}
        onApplyRule={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders Pin 1 visual calibrator when Pin 1 rule is tuned", () => {
    const pin1Rule: EditorRule = {
      id: "rule-pin1-test",
      name: "Pin 1 Orientation Config",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 200,
      y: 150,
      width: 100,
      height: 100,
      params: {
        toolCode: "T105",
        category: "Presence / Absence",
        thresholdLuma: 80,
      },
    };

    render(
      <VisualToolTuningModal
        isOpen={true}
        onClose={vi.fn()}
        rule={pin1Rule}
        onApplyRule={vi.fn()}
      />,
    );

    expect(screen.getByText(/Pin 1 Orientation Config/)).toBeTruthy();
    expect(screen.getByText(/\[T105\]/)).toBeTruthy();
  });
});
