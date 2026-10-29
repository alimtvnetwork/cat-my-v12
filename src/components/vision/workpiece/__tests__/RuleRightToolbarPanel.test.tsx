// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { RuleRightToolbarPanel } from "../RuleRightToolbarPanel";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";
import { ValidationStatusType } from "@/lib/editor/validation-store";

describe("RuleRightToolbarPanel", () => {
  afterEach(() => {
    cleanup();
  });

  const mockRule: EditorRule = {
    id: "rule-101",
    name: "IC Outline Check",
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: 120,
    y: 80,
    width: 250,
    height: 160,
    params: {
      toolCode: "T102",
      greyscaleLevel: 185,
      tolerancePx: 6,
      marginPx: 10,
      activeBoxCount: 3,
    } as any,
  };

  const mockRuleset = {
    id: "ruleset-1",
    name: "Golden Verification",
    projectId: "proj-1",
    rules: [mockRule],
  };

  const defaultProps = {
    rule: mockRule,
    ruleset: mockRuleset as any,
    onUpdateRule: vi.fn(),
    onToggleHidden: vi.fn(),
    onOpenDeepConfig: vi.fn(),
    onClose: vi.fn(),
    isEvaluating: false,
    onEvaluateSingleRule: vi.fn(),
    onDeleteRule: vi.fn(),
  };

  it("renders rule header with tool code and ruleset name", () => {
    render(<RuleRightToolbarPanel {...defaultProps} />);

    expect(screen.getByText("IC Outline Check")).toBeDefined();
    expect(screen.getByText(/T102 · Golden Verification/i)).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
  });

  it("renders editable ROI inputs and propagates updates", () => {
    const onUpdateRule = vi.fn();
    render(<RuleRightToolbarPanel {...defaultProps} onUpdateRule={onUpdateRule} />);

    const xInput = screen.getByDisplayValue("120") as HTMLInputElement;
    fireEvent.change(xInput, { target: { value: "140" } });

    expect(onUpdateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "rule-101",
        x: 140,
      }),
    );
  });

  it("renders parameter sliders and values", () => {
    render(<RuleRightToolbarPanel {...defaultProps} />);

    expect(screen.getByText("Greyscale Threshold")).toBeDefined();
    expect(screen.getByText("185")).toBeDefined();
    expect(screen.getByText("Tolerance (± px)")).toBeDefined();
    expect(screen.getByText("6 px")).toBeDefined();
    expect(screen.getByText("Search Margin (px)")).toBeDefined();
    expect(screen.getByText("10 px")).toBeDefined();
  });

  it("triggers onToggleHidden when eye toggle button is clicked", () => {
    const onToggleHidden = vi.fn();
    render(<RuleRightToolbarPanel {...defaultProps} onToggleHidden={onToggleHidden} />);

    const toggleBtn = screen.getByTitle("Disable this rule");
    fireEvent.click(toggleBtn);

    expect(onToggleHidden).toHaveBeenCalledWith("rule-101");
  });

  it("triggers onEvaluateSingleRule when Test Rule button is clicked", () => {
    const onEvaluate = vi.fn();
    render(<RuleRightToolbarPanel {...defaultProps} onEvaluateSingleRule={onEvaluate} />);

    const testBtn = screen.getByRole("button", { name: "Test This Rule" });
    fireEvent.click(testBtn);

    expect(onEvaluate).toHaveBeenCalledWith("rule-101");
  });

  it("displays validation score badge when result is provided", () => {
    render(
      <RuleRightToolbarPanel
        {...defaultProps}
        validationResult={{
          status: ValidationStatusType.Pass,
          score: 0.982,
          stub: true,
        }}
      />,
    );

    expect(screen.getByText(/PASS 98%/i)).toBeDefined();
  });

  it("triggers onClose when X button is clicked", () => {
    const onClose = vi.fn();
    render(<RuleRightToolbarPanel {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByTitle("Close toolbar panel");
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
