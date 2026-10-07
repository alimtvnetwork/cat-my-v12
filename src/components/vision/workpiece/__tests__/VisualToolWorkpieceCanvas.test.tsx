// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { VisualToolWorkpieceCanvas } from "../VisualToolWorkpieceCanvas";

afterEach(() => {
  cleanup();
});

describe("VisualToolWorkpieceCanvas", () => {
  it("renders with default props and shows auto-inspection readout without ROI", () => {
    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 120, width: 200, height: 180 }}
        toolCode="T102"
        toolName="Greyscale Pattern Matching"
        toolParams={{ greyscaleLevel: 170, activeBoxCount: 24 }}
      />,
    );

    expect(screen.getByText(/Auto-Inspection:/)).toBeTruthy();
    expect(screen.queryByText(/Visual ROI:/)).toBeNull();
    expect(screen.getByText(/24 Pattern Elements/)).toBeTruthy();
    expect(screen.getAllByText(/Greyscale Pattern Matching/).length).toBeGreaterThanOrEqual(1);
  });

  it("does not render 2-bit binarized button (option removed)", () => {
    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 50, y: 50, width: 100, height: 100 }}
        toolCode="T102"
        toolName="Greyscale Pattern Matching"
        toolParams={{ greyscaleLevel: 180 }}
      />,
    );

    expect(screen.queryByText(/2-Bit Binarized/i)).toBeNull();
  });

  it("renders visible analysis results for all overlay rules", () => {
    const mockRules = [
      {
        id: "r-1",
        name: "Greyscale Pattern Match",
        kind: "R" as any,
        isHidden: false,
        isLocked: false,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
      },
      {
        id: "r-2",
        name: "Pin 1 Orientation Config",
        kind: "C" as any,
        isHidden: false,
        isLocked: false,
        x: 350,
        y: 100,
        width: 150,
        height: 150,
      },
    ];

    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 100, width: 200, height: 200 }}
        toolCode="T102"
        toolName="Greyscale Pattern Match"
        overlayRules={mockRules}
        selectedRuleId="r-1"
        validationResultsMap={{
          "r-1": { status: "pass", score: 1.0, message: "Golden reference calibrated" },
          "r-2": { status: "pass", score: 0.99, message: "Pin 1 matched" },
        }}
      />,
    );

    expect(screen.getByText(/VISUAL ANALYSIS \(2\/2 PASS\)/i)).toBeTruthy();
    expect(screen.getByText(/\[1\] Greyscale Pattern Match:/i)).toBeTruthy();
    expect(screen.getByText(/\[2\] Pin 1 Orientation Config:/i)).toBeTruthy();
    expect(screen.getByText(/PASS 100%/i)).toBeTruthy();
    expect(screen.getByText(/PASS 99%/i)).toBeTruthy();
  });

  it("renders visual analysis HUD and verdict when validationStatus is provided", () => {
    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 100, width: 200, height: 200 }}
        toolCode="T102"
        toolName="Greyscale Pattern Matching"
        validationStatus="pass"
        validationScore={0.985}
      />,
    );

    expect(screen.getByText(/VISUAL ANALYSIS/)).toBeTruthy();
    expect(screen.getByText(/PASS 98.5%/)).toBeTruthy();
  });

  it("renders Analyze Inspection button and handles click", () => {
    let clicked = false;
    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 100, width: 200, height: 200 }}
        toolCode="T102"
        toolName="Greyscale Pattern Matching"
        onRunAnalysis={() => {
          clicked = true;
        }}
      />,
    );

    const btn = screen.getByRole("button", { name: /Analyze Inspection/i });
    expect(btn).toBeTruthy();
    btn.click();
    expect(clicked).toBe(true);
  });

  it("renders Pattern Elements matched text with percentage in visual analysis HUD", () => {
    const boxes = Array.from({ length: 24 }, (_, i) => ({
      boxNumber: i + 1,
      x: 10 + i * 5,
      y: 20,
      width: 10,
      height: 10,
    }));

    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 100, width: 200, height: 200 }}
        toolCode="T102"
        toolName="Greyscale Pattern Matching"
        validationStatus="pass"
        validationScore={1.0}
        toolParams={{
          constellationJson: JSON.stringify(boxes),
          activeBoxCount: 24,
        }}
      />,
    );

    expect(screen.getByText(/24 \/ 24 matched \(100%\)/)).toBeTruthy();
  });

  it("renders 24 / 24 matched (100%) when 100% matched even without explicit box array", () => {
    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 100, width: 200, height: 200 }}
        toolCode="T102"
        toolName="Rule 1: Greyscale Pattern Matching"
        validationStatus="pass"
        validationScore={1.0}
        toolParams={{
          activeBoxCount: 24,
        }}
      />,
    );

    expect(screen.getByText(/24 \/ 24 matched \(100%\)/)).toBeTruthy();
  });

  it("renders visual analysis results in a dedicated region separate from canvas", () => {
    const { container } = render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 100, width: 200, height: 200 }}
        toolCode="T102"
        toolName="Greyscale Pattern Matching"
        validationStatus="pass"
        validationScore={0.985}
      />,
    );

    const resultsRegion = screen.getByRole("region", { name: /Visual Analysis Results/i });
    expect(resultsRegion).toBeTruthy();

    const canvasElement = container.querySelector("canvas");
    expect(canvasElement).toBeTruthy();
    expect(resultsRegion.contains(canvasElement)).toBe(false);
    expect(canvasElement?.parentElement?.contains(resultsRegion)).toBe(false);
  });

  it("does not render manual ROI coordinates or numeric inputs in editable mode", () => {
    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 120, width: 200, height: 180 }}
        isEditable={true}
        toolCode="T102"
        toolName="Greyscale Pattern Matching"
      />,
    );

    expect(screen.queryByText(/Visual ROI:/)).toBeNull();
    expect(screen.queryByLabelText("ROI X")).toBeNull();
    expect(screen.queryByLabelText("ROI Y")).toBeNull();
    expect(screen.queryByLabelText("ROI Width")).toBeNull();
    expect(screen.queryByLabelText("ROI Height")).toBeNull();
    expect(screen.queryByRole("button", { name: "Nudge Left" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Center ROI" })).toBeNull();
  });

  it("displays autonomous tool inspection indicator and pattern counts", () => {
    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 120, width: 200, height: 180 }}
        toolCode="T102"
        toolName="Greyscale Pattern Matching"
        toolParams={{ activeBoxCount: 24 }}
      />,
    );

    expect(screen.getByText(/Auto-Inspection:/)).toBeTruthy();
    expect(screen.getAllByText(/Greyscale Pattern Matching/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/24 Pattern Elements/)).toBeTruthy();
  });

  it("renders auto-analysis mode without ROI controls or HUD inputs", () => {
    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 100, width: 200, height: 200 }}
        toolCode="T102"
        toolName="Greyscale Pattern Matching"
        isAnalyzeMode={true}
        validationStatus="pass"
        validationScore={1.0}
      />,
    );

    // Auto-analysis banner displayed
    expect(screen.getByText(/Auto-Analysis:/i)).toBeTruthy();
    expect(screen.getByText(/Full Picture Auto-Analyzed/i)).toBeTruthy();

    // Manual ROI HUD controls are hidden
    expect(screen.queryByText(/Visual ROI:/i)).toBeNull();
    expect(screen.queryByLabelText("ROI X")).toBeNull();
    expect(screen.queryByLabelText("ROI Y")).toBeNull();
    expect(screen.queryByLabelText("ROI Width")).toBeNull();
    expect(screen.queryByLabelText("ROI Height")).toBeNull();

    // Dedicated results area shows NO ROI or Inspection Scope in analyze mode
    expect(screen.queryByText(/Region of Interest/i)).toBeNull();
    expect(screen.queryByText(/Inspection Scope/i)).toBeNull();

    // Footer describes auto-analyzed full workpiece picture
    expect(screen.getByText(/Full workpiece picture auto-analyzed sequentially/i)).toBeTruthy();
  });

  it("renders visual analysis floating HUD overlay and allows switching rules in analyze mode", () => {
    let selectedRuleId = "r-1";
    const mockRules = [
      {
        id: "r-1",
        name: "Pattern Match Rule",
        kind: "R" as any,
        isHidden: false,
        isLocked: false,
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        params: { toolCode: "T116" },
      },
      {
        id: "r-2",
        name: "Pin 1 Orientation Rule",
        kind: "C" as any,
        isHidden: false,
        isLocked: false,
        x: 350,
        y: 100,
        width: 120,
        height: 120,
        params: { toolCode: "T117" },
      },
    ];

    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 100, width: 150, height: 150 }}
        toolCode="T116"
        toolName="Pattern Match Rule"
        isAnalyzeMode={true}
        overlayRules={mockRules}
        selectedRuleId={selectedRuleId}
        onSelectRule={(id) => {
          selectedRuleId = id;
        }}
        validationResultsMap={{
          "r-1": { status: "pass", score: 1.0 },
          "r-2": { status: "pass", score: 0.99 },
        }}
      />,
    );

    expect(screen.getByText(/Visual Analysis Overlay/i)).toBeTruthy();
    expect(screen.getByText("T116")).toBeTruthy();
    const t117Button = screen.getByRole("button", { name: "Select T117" });
    fireEvent.click(t117Button);

    expect(selectedRuleId).toBe("r-2");
  });

  it("handles canvas pointer click to select overlay rule in analyze mode", () => {
    let selectedRuleId = "r-1";
    const mockRules = [
      {
        id: "r-1",
        name: "Pattern Match Rule",
        kind: "R" as any,
        isHidden: false,
        isLocked: false,
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        params: { toolCode: "T116" },
      },
      {
        id: "r-2",
        name: "Pin 1 Orientation Rule",
        kind: "C" as any,
        isHidden: false,
        isLocked: false,
        x: 350,
        y: 100,
        width: 120,
        height: 120,
        params: { toolCode: "T117" },
      },
    ];

    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 100, width: 150, height: 150 }}
        toolCode="T116"
        toolName="Pattern Match Rule"
        isAnalyzeMode={true}
        overlayRules={mockRules}
        selectedRuleId={selectedRuleId}
        onSelectRule={(id) => {
          selectedRuleId = id;
        }}
        validationResultsMap={{
          "r-1": { status: "pass", score: 1.0 },
          "r-2": { status: "pass", score: 0.99 },
        }}
      />,
    );

    const canvas = screen.getByRole("img", { name: /Workpiece Inspection Canvas/i });

    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 960,
      height: 540,
      right: 960,
      bottom: 540,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Click inside r-2 (x: 350..470, y: 100..220)
    fireEvent.pointerDown(canvas, { clientX: 380, clientY: 130, pointerId: 1 });

    expect(selectedRuleId).toBe("r-2");
  });

  it("renders accurate greyscale pattern matching overlay with tolerance zones and badges", () => {
    const mockPatternRule = {
      id: "r-pattern",
      name: "Greyscale Pattern Match",
      kind: "C" as any,
      isHidden: false,
      isLocked: false,
      x: 100,
      y: 70,
      width: 760,
      height: 400,
      params: {
        toolCode: "T116",
        activeBoxCount: 24,
        totalBoxCount: 24,
        threshold: 170,
        tolerancePx: 8,
      },
    };

    render(
      <VisualToolWorkpieceCanvas
        roi={{ x: 100, y: 70, width: 760, height: 400 }}
        toolCode="T116"
        toolName="Greyscale Pattern Match"
        isAnalyzeMode={true}
        overlayRules={[mockPatternRule]}
        selectedRuleId="r-pattern"
        validationResultsMap={{
          "r-pattern": {
            status: "pass",
            score: 1.0,
            message: "24/24 elements matched reference. PASS (100%).",
          },
        }}
      />,
    );

    expect(screen.getByText(/24 \/ 24 matched \(100%\)/i)).toBeTruthy();
    expect(
      screen.getAllByText(/Greyscale Pattern Match/i).length,
    ).toBeGreaterThanOrEqual(1);
  });
});


