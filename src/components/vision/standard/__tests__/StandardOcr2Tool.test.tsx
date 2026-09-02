/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { StandardOcr2Tool } from "../tools/StandardOcr2Tool";
import {
  OcrFontFamilyType,
  StandardActionLabel,
  OCR_DEFAULT_CHARACTER_COUNT,
  OCR_DEFAULT_EXPECTED_FORMAT,
  OCR_DEFAULT_MIN_CONFIDENCE,
} from "../constants";
import { createDefaultPatternSearchSettings } from "@/domain/vision/pattern-search";

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe("StandardOcr2Tool", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders with default settings and OCR parameters", () => {
    const settings = createDefaultPatternSearchSettings("T114");
    const onChange = vi.fn();

    render(<StandardOcr2Tool settings={settings} onChange={onChange} />);

    expect(screen.getByText("OCR2 Optical Character Recognition Tool")).toBeDefined();
    expect(screen.getByText("T13-OCR2")).toBeDefined();
  });

  it("switches to detection tab and updates font family, char count, regex filter", () => {
    const settings = createDefaultPatternSearchSettings("T114");
    const onChange = vi.fn();

    render(<StandardOcr2Tool settings={settings} onChange={onChange} />);

    // Click Detection tab button
    const detectionTabBtn = screen.getByRole("button", {
      name: "Character Segmentation & Recognition",
    });
    fireEvent.click(detectionTabBtn);

    // Verify default values
    const select = screen.getByLabelText("Font Model Library") as HTMLSelectElement;
    expect(select.value).toBe(OcrFontFamilyType.StandardSans);

    // Change font family to dot-matrix
    fireEvent.change(select, {
      target: { value: OcrFontFamilyType.DotMatrix },
    });
    expect(select.value).toBe(OcrFontFamilyType.DotMatrix);

    // Change character count
    const charCountInput = screen.getByDisplayValue(
      String(OCR_DEFAULT_CHARACTER_COUNT),
    ) as HTMLInputElement;
    fireEvent.change(charCountInput, { target: { value: "12" } });
    expect(charCountInput.value).toBe("12");

    // Change regex filter
    const regexInput = screen.getByDisplayValue(OCR_DEFAULT_EXPECTED_FORMAT) as HTMLInputElement;
    fireEvent.change(regexInput, { target: { value: "^[0-9]{12}$" } });
    expect(regexInput.value).toBe("^[0-9]{12}$");
  });

  it("switches to judgment tab and updates min confidence threshold", () => {
    const settings = createDefaultPatternSearchSettings("T114");
    const onChange = vi.fn();

    render(<StandardOcr2Tool settings={settings} onChange={onChange} />);

    // Click Judgment tab button
    const judgmentTabBtn = screen.getByRole("button", {
      name: "OCR Judgment Limits",
    });
    fireEvent.click(judgmentTabBtn);

    // Check confidence input
    const confidenceInput = screen.getByDisplayValue(
      String(OCR_DEFAULT_MIN_CONFIDENCE),
    ) as HTMLInputElement;
    fireEvent.change(confidenceInput, { target: { value: "95" } });
    expect(confidenceInput.value).toBe("95");
  });

  it("triggers action callbacks when action buttons are clicked", () => {
    const settings = createDefaultPatternSearchSettings("T114");
    const onChange = vi.fn();
    const onEvaluate = vi.fn();
    const onOk = vi.fn();
    const onCancel = vi.fn();

    render(
      <StandardOcr2Tool
        settings={settings}
        onChange={onChange}
        onEvaluate={onEvaluate}
        onOk={onOk}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.EvaluateRule }));
    expect(onEvaluate).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.Ok }));
    expect(onOk).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.Cancel }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
