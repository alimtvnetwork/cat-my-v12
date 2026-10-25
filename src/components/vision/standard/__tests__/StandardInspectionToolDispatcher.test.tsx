// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StandardInspectionToolDispatcher } from "../tools/StandardInspectionToolDispatcher";
import { createDefaultPatternSearchSettings } from "@/domain/vision/pattern-search";

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe("StandardInspectionToolDispatcher", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultSettings = createDefaultPatternSearchSettings("T101");
  const onChange = vi.fn();

  const toolCases = [
    { toolType: "area", expectedTitle: "Area" },
    { toolType: "T101", expectedTitle: "Area" },
    { toolType: "shapetrax3", expectedTitle: "ShapeTrax3" },
    { toolType: "profile-width", expectedTitle: "Profile Width" },
    { toolType: "profile-position", expectedTitle: "Profile Position" },
    { toolType: "edge-pitch", expectedTitle: "Edge Pitch" },
    { toolType: "edge-pair", expectedTitle: "Edge Pairs" },
    { toolType: "edge-width", expectedTitle: "Edge Width" },
    { toolType: "edge-position", expectedTitle: "Edge Position" },
    { toolType: "T104", expectedTitle: "Edge Position" },
    { toolType: "defect", expectedTitle: "Defect" },
    { toolType: "T107", expectedTitle: "Defect" },
    { toolType: "T108", expectedTitle: "Defect" },
    { toolType: "blob", expectedTitle: "Blob" },
    { toolType: "T109", expectedTitle: "Blob" },
    { toolType: "T110", expectedTitle: "Edge Width" },
    { toolType: "T111", expectedTitle: "Circle" },
    { toolType: "circle", expectedTitle: "Circle" },
    { toolType: "via", expectedTitle: "Circle" },
    { toolType: "grayscale-blob", expectedTitle: "Grayscale Blob" },
    { toolType: "intensity", expectedTitle: "Intensity" },
    { toolType: "ocr", expectedTitle: "OCR2" },
    { toolType: "T106", expectedTitle: "OCR2" },
    { toolType: "T114", expectedTitle: "OCR2" },
    { toolType: "code-reader", expectedTitle: "Code Reader" },
    { toolType: "T103", expectedTitle: "Code Reader" },
    { toolType: "pattern-search", expectedTitle: "Pattern Search" },
  ];

  toolCases.forEach(({ toolType, expectedTitle }) => {
    it(`dispatches and renders tool type: ${toolType}`, () => {
      render(
        <StandardInspectionToolDispatcher
          toolType={toolType}
          settings={defaultSettings}
          onChange={onChange}
        />,
      );

      // Verify tool rendered
      expect(screen.getAllByText(new RegExp(expectedTitle, "i")).length).toBeGreaterThan(0);
    });
  });

  it("dispatches T110 to Edge Pitch when ruleName specifies pitch", () => {
    render(
      <StandardInspectionToolDispatcher
        toolType="T110"
        ruleName="Lead Pitch Inspection"
        settings={defaultSettings}
        onChange={onChange}
      />,
    );

    expect(screen.getAllByText(/Edge Pitch/i).length).toBeGreaterThan(0);
  });

  it("dispatches to Area Tool via settings.params.toolCode", () => {
    const areaSettings = {
      ...defaultSettings,
      params: { toolCode: "T101" },
    };

    render(
      <StandardInspectionToolDispatcher
        settings={areaSettings}
        onChange={onChange}
      />,
    );

    expect(screen.getAllByText(/Area/i).length).toBeGreaterThan(0);
  });

  it("dispatches to Defect Tool via ruleName keyword without toolType", () => {
    render(
      <StandardInspectionToolDispatcher
        ruleName="Surface Scratch Detector"
        settings={defaultSettings}
        onChange={onChange}
      />,
    );

    expect(screen.getAllByText(/Defect/i).length).toBeGreaterThan(0);
  });

  it("dispatches Scratch & Crack Detector with constellation settings to Defect Tool, never Pattern Matching", () => {
    const settingsWithConstellation = {
      ...defaultSettings,
      constellation: [{ number: 1, x: 10, y: 10, width: 20, height: 20 }],
      referenceBoxes: [{ number: 1, x: 10, y: 10, width: 20, height: 20 }],
    };

    render(
      <StandardInspectionToolDispatcher
        toolType="T107"
        ruleName="Rule 2: Scratch & Crack Detector"
        settings={settingsWithConstellation}
        onChange={onChange}
      />,
    );

    expect(screen.getAllByText(/Defect/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Pattern Configuration/i)).toBeNull();
  });
});
