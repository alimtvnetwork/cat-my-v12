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

    const trigger = document.getElementById("btn-camera-source-dropdown")!;
    fireEvent.pointerDown(trigger);

    expect(screen.getAllByText("Pocket 1 [Filled IC]").length).toBeGreaterThan(0);
    expect(screen.getByText("Pocket 2 [Empty Defect]")).toBeDefined();
    expect(screen.getByText("Pocket 5 [Strip]")).toBeDefined();
  });

  it("triggers onSelectImage when a preset button is clicked", () => {
    const onSelectImage = vi.fn();
    render(<AnalyzeImageToolbar {...defaultProps} onSelectImage={onSelectImage} />);

    const trigger = document.getElementById("btn-camera-source-dropdown")!;
    fireEvent.pointerDown(trigger);

    const pocket2Btn = screen.getByText("Pocket 2 [Empty Defect]");
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

    expect(screen.getByText(/LIVE CAMERA/i)).toBeDefined();
  });

  it("opens upload alias modal when file is selected", () => {
    const { container } = render(<AnalyzeImageToolbar {...defaultProps} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const testFile = new File(["dummy content"], "test-inspection.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    expect(screen.getByText("Register Inspection Image")).toBeDefined();
  });
});
