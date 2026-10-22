// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RuleToolConfigPanel } from "../RuleToolConfigPanel";
import type { EditorRule } from "@/lib/editor/types";
import { EditorRuleKindType, EditorToolFamilyType } from "@/lib/editor/types";

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe("RuleToolConfigPanel tool routing", () => {
  afterEach(() => {
    cleanup();
  });

  const mockRuleset = {
    id: "ruleset-1",
    name: "Test Ruleset",
    projectId: "proj-1",
    rules: [],
  };

  const createRule = (code: string, name: string): EditorRule => ({
    id: `rule-${code}`,
    name,
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    params: {
      toolCode: code,
    } as any,
  });

  it("renders Defect tool configuration for T107 Scratch & Crack Detector", () => {
    const rule = createRule("T107", "Rule 2: Scratch & Crack Detector");
    render(
      <RuleToolConfigPanel
        ruleset={mockRuleset as any}
        rule={rule}
        onExit={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Pattern Configuration/i)).toBeNull();
    expect(screen.getAllByText(/Flaw|Defect|Scratch/i).length).toBeGreaterThan(0);
  });

  it("renders Area tool configuration for T101 Area Gate", () => {
    const rule = createRule("T101", "Rule 1: Area Gate");
    render(
      <RuleToolConfigPanel
        ruleset={mockRuleset as any}
        rule={rule}
        onExit={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Pattern Configuration/i)).toBeNull();
    expect(screen.getAllByText(/Area/i).length).toBeGreaterThan(0);
  });

  it("renders Blob tool configuration for T109 Binary Blob", () => {
    const rule = createRule("T109", "Rule 3: Binary Blob Solder Bridge");
    render(
      <RuleToolConfigPanel
        ruleset={mockRuleset as any}
        rule={rule}
        onExit={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Pattern Configuration/i)).toBeNull();
    expect(screen.getAllByText(/Blob/i).length).toBeGreaterThan(0);
  });

  it("renders Edge Width tool configuration for T110 Caliper", () => {
    const rule = createRule("T110", "Rule 4: Caliper & Edge Width");
    render(
      <RuleToolConfigPanel
        ruleset={mockRuleset as any}
        rule={rule}
        onExit={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Pattern Configuration/i)).toBeNull();
    expect(screen.getAllByText(/Edge Width|Caliper/i).length).toBeGreaterThan(0);
  });

  it("renders Edge Position tool configuration for T104 Lead Presence", () => {
    const rule = createRule("T104", "Rule 5: Lead Presence");
    render(
      <RuleToolConfigPanel
        ruleset={mockRuleset as any}
        rule={rule}
        onExit={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Pattern Configuration/i)).toBeNull();
    expect(screen.getAllByText(/Edge Position|Single Line/i).length).toBeGreaterThan(0);
  });

  it("renders Code Reader configuration for T103 2D DataMatrix", () => {
    const rule = createRule("T103", "Rule 6: 2D DataMatrix Reader");
    render(
      <RuleToolConfigPanel
        ruleset={mockRuleset as any}
        rule={rule}
        onExit={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Pattern Configuration/i)).toBeNull();
    expect(screen.getAllByText(/Code Reader/i).length).toBeGreaterThan(0);
  });

  it("renders primary configuration options by default without manual tab switching", () => {
    const areaRule = createRule("T101", "Area Detection");
    const { unmount } = render(
      <RuleToolConfigPanel
        ruleset={mockRuleset as any}
        rule={areaRule}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText(/Area Measurement Mode/i)).toBeDefined();
    unmount();

    const defectRule = createRule("T107", "Scratch Check");
    render(
      <RuleToolConfigPanel
        ruleset={mockRuleset as any}
        rule={defectRule}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByText(/Defect Contrast Sensitivity/i)).toBeDefined();
  });
});
