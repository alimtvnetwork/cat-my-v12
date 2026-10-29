// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AnalyzeImageToolbar, PRESET_INSPECTION_IMAGES } from "../AnalyzeImageToolbar";

describe("AnalyzeImageToolbar", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    currentImageRef: PRESET_INSPECTION_IMAGES[0].imageRef,
    isLiveCameraMode: false,
    isLiveCameraReady: false,
    onSelectLiveCamera: vi.fn(),
    onSelectImage: vi.fn(),
    onUploadImage: vi.fn(),
    recents: [],
    calibratedWidth: 960,
    calibratedHeight: 540,
  };

  it("renders standard preset buttons and active label", () => {
    render(<AnalyzeImageToolbar {...defaultProps} />);

    expect(screen.getByText("Pocket 1")).toBeDefined();
    expect(screen.getByText("Pocket 2")).toBeDefined();
    expect(screen.getByText("Pocket 5")).toBeDefined();
    expect(screen.getByText("Pocket 1 [Filled IC]")).toBeDefined();
  });

  it("triggers onSelectImage when a preset button is clicked", () => {
    const onSelectImage = vi.fn();
    render(<AnalyzeImageToolbar {...defaultProps} onSelectImage={onSelectImage} />);

    const pocket2Btn = screen.getByText("Pocket 2");
    fireEvent.click(pocket2Btn);

    expect(onSelectImage).toHaveBeenCalledWith(
      PRESET_INSPECTION_IMAGES[1].imageRef,
      PRESET_INSPECTION_IMAGES[1].alias,
    );
  });

  it("renders live camera mode indicator when active", () => {
    render(
      <AnalyzeImageToolbar {...defaultProps} isLiveCameraMode={true} isLiveCameraReady={true} />,
    );

    expect(screen.getByText("Live Camera")).toBeDefined();
    expect(screen.getByText(/Live Stream \(Auto-Calibrated\)/i)).toBeDefined();
  });

  it("opens upload alias modal when file is selected", () => {
    const onUploadImage = vi.fn();
    const { container } = render(
      <AnalyzeImageToolbar {...defaultProps} onUploadImage={onUploadImage} />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDefined();

    const file = new File(["test image data"], "sample-test-ic.png", {
      type: "image/png",
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("Register Inspection Image")).toBeDefined();
    expect(screen.getByDisplayValue("sample-test-ic")).toBeDefined();

    const registerBtn = screen.getByRole("button", { name: "Register Image" });
    fireEvent.click(registerBtn);

    expect(onUploadImage).toHaveBeenCalledWith(file, "sample-test-ic");
  });
});
