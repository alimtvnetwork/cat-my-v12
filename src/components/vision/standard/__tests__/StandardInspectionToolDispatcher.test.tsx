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
    { toolType: "shapetrax3", expectedTitle: "ShapeTrax3" },
    { toolType: "profile-width", expectedTitle: "Profile Width" },
    { toolType: "profile-position", expectedTitle: "Profile Position" },
    { toolType: "edge-pitch", expectedTitle: "Edge Pitch" },
    { toolType: "edge-pair", expectedTitle: "Edge Pairs" },
    { toolType: "edge-width", expectedTitle: "Edge Width" },
    { toolType: "edge-position", expectedTitle: "Edge Position" },
    { toolType: "defect", expectedTitle: "Defect" },
    { toolType: "blob", expectedTitle: "Blob" },
    { toolType: "grayscale-blob", expectedTitle: "Grayscale Blob" },
    { toolType: "intensity", expectedTitle: "Intensity" },
    { toolType: "ocr", expectedTitle: "OCR2" },
    { toolType: "code-reader", expectedTitle: "Code Reader" },
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
});
