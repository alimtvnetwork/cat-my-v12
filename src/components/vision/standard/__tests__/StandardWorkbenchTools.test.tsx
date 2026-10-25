// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { createDefaultPatternSearchSettings } from "@/domain/vision/pattern-search";
import { StandardAreaTool } from "../tools/StandardAreaTool";
import { StandardDefectTool } from "../tools/StandardDefectTool";
import { StandardVoidPorosityTool } from "../tools/StandardVoidPorosityTool";
import { StandardBlobTool } from "../tools/StandardBlobTool";
import { StandardEdgeWidthTool } from "../tools/StandardEdgeWidthTool";
import { StandardEdgePitchTool } from "../tools/StandardEdgePitchTool";
import { StandardEdgePositionTool } from "../tools/StandardEdgePositionTool";
import { StandardCodeReaderTool } from "../tools/StandardCodeReaderTool";
import { StandardCircleGaugeTool } from "../tools/StandardCircleGaugeTool";
import { StandardConformalCoatingTool } from "../tools/StandardConformalCoatingTool";
import { StandardShapeTrax3Tool } from "../tools/StandardShapeTrax3Tool";

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe("Standard Workbench Dedicated Vision Tools", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders T101 StandardAreaTool with tailored options and applies settings", () => {
    const settings = createDefaultPatternSearchSettings("rule-t101");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardAreaTool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/Area Gate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/T101/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Area Measurement Mode/i)).toBeDefined();
    expect(screen.getByText(/Target Polarity/i)).toBeDefined();
    expect(screen.getByText(/Intensity Threshold/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    // Toggle polarity (should keep in pending state until process is clicked)
    const darkBtn = screen.getByText(/Dark on Bright/i);
    fireEvent.click(darkBtn);
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    // Click Process Rule
    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    // Click Apply
    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  it("renders T107 StandardDefectTool with tailored scratch & crack options", () => {
    const settings = createDefaultPatternSearchSettings("rule-t107");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardDefectTool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/Scratch & Crack/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/T107/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Target Flaw Type/i)).toBeDefined();
    expect(screen.getByText(/Defect Contrast Sensitivity/i)).toBeDefined();
    expect(screen.getByText(/Max Allowed Defects/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    // Click Process Rule
    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    // Click Apply
    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  it("renders T108 StandardVoidPorosityTool with cavity options", () => {
    const settings = createDefaultPatternSearchSettings("rule-t108");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardVoidPorosityTool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/Void & Porosity/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/T108/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Cavity Contrast Sensitivity/i)).toBeDefined();
    expect(screen.getByText(/Min Void Diameter/i)).toBeDefined();
    expect(screen.getByText(/Max Allowed Porosity Ratio/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  it("renders T109 StandardBlobTool with solder bridge and blob options", () => {
    const settings = createDefaultPatternSearchSettings("rule-t109");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardBlobTool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/Binary Blob/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/T109/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Binarization Threshold/i)).toBeDefined();
    expect(screen.getByText(/Blob Area Limits/i)).toBeDefined();
    expect(screen.getByText(/Component Count Limits/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  it("renders T110 StandardEdgeWidthTool with caliper options", () => {
    const settings = createDefaultPatternSearchSettings("rule-t110");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardEdgeWidthTool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/Caliper/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/T110/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sub-Pixel Caliper/i)).toBeDefined();
    expect(screen.getByText(/Nominal Dimension & Tolerance/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  it("renders T111 StandardEdgePitchTool with comb pitch options", () => {
    const settings = createDefaultPatternSearchSettings("rule-t111");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardEdgePitchTool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/Lead Pitch/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/T111/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sub-Pixel Caliper/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  it("renders T104 StandardEdgePositionTool with scan direction options", () => {
    const settings = createDefaultPatternSearchSettings("rule-t104");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardEdgePositionTool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/Edge Position/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/T104/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Scan Direction/i)).toBeDefined();
    expect(screen.getByText(/Transition Polarity/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  it("renders T103 StandardCodeReaderTool with symbology and payload options", () => {
    const settings = createDefaultPatternSearchSettings("rule-t103");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardCodeReaderTool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/Code Reader/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/T103/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Decoded Payload/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Target Symbology/i)).toBeDefined();
    expect(screen.getByText(/Minimum Required ISO Quality Grade/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    const gradeBBtn = screen.getByRole("button", { name: /Grade B/i });
    fireEvent.click(gradeBBtn);
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  it("renders T111 StandardCircleGaugeTool with Pratt fitting and radial options", () => {
    const settings = createDefaultPatternSearchSettings("rule-t111");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardCircleGaugeTool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/Circle & Via Gauge/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/T111/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Target Feature/i)).toBeDefined();
    expect(screen.getByText(/Radial Edge Polarity/i)).toBeDefined();
    expect(screen.getByText(/Nominal Diameter/i)).toBeDefined();
    expect(screen.getByText(/Diameter Tolerance/i)).toBeDefined();
    expect(screen.getByText(/Min Roundness Score/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    // Toggle target feature
    const viaBtn = screen.getByRole("button", { name: /PTH Via/i });
    fireEvent.click(viaBtn);
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    // Click Process Rule
    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    // Click Apply
    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  it("renders T112 StandardConformalCoatingTool with UV fluorescence and CIE Lab options", () => {
    const settings = createDefaultPatternSearchSettings("rule-t112");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardConformalCoatingTool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/Conformal Coating/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/T112/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Inspection Mode/i)).toBeDefined();
    expect(screen.getByText(/UV Tracer Fluorescent Band/i)).toBeDefined();
    expect(screen.getByText(/Fluorescence Glow Threshold/i)).toBeDefined();
    expect(screen.getByText(/Minimum Coverage/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    // Toggle mode to Keep-Out Zone
    const kozBtn = screen.getByRole("button", { name: /Keep-Out/i });
    fireEvent.click(kozBtn);
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    // Click Process Rule
    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    // Click Apply
    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  it("renders StandardShapeTrax3Tool with contour options and dual buttons", () => {
    const settings = createDefaultPatternSearchSettings("rule-shapetrax");
    const handleChange = vi.fn();
    const handleOk = vi.fn();

    render(
      <StandardShapeTrax3Tool
        settings={settings}
        onChange={handleChange}
        onOk={handleOk}
      />,
    );

    expect(screen.getAllByText(/ShapeTrax3/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Contour Contrast Sensitivity/i)).toBeDefined();
    expect(screen.getByText(/Minimum Match Score/i)).toBeDefined();
    expect(screen.getByText(/Rotation Angle Range/i)).toBeDefined();
    expect(screen.getAllByText(/PENDING PROCESS/i).length).toBeGreaterThan(0);

    const processBtn = screen.getByRole("button", { name: /Process Rule/i });
    fireEvent.click(processBtn);

    const applyBtn = screen.getByRole("button", { name: /Apply to Rule/i });
    fireEvent.click(applyBtn);

    expect(handleOk).toHaveBeenCalledTimes(1);
  });
});
