// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { VisionLayersPanel } from "../VisionLayersPanel";

describe("VisionLayersPanel (Photoshop-Style 4-Tier)", () => {
  afterEach(() => {
    cleanup();
  });

  const dummyRoi = { x: 100, y: 150, width: 300, height: 200 };

  it("renders all 4 layer tiers (Z0, Z1, Z2, Z3)", () => {
    render(<VisionLayersPanel roi={dummyRoi} />);

    expect(screen.getByText("Z3: Masks Layer")).toBeDefined();
    expect(screen.getByText("Z2: Pattern Boxes (1..57)")).toBeDefined();
    expect(screen.getByText("Z1: Search ROI")).toBeDefined();
    expect(screen.getByText("Z0: Base Image")).toBeDefined();
  });

  it("defaults Search ROI to locked and toggles on lock button click", () => {
    const handleToggleLock = vi.fn();
    render(
      <VisionLayersPanel
        roi={dummyRoi}
        isRoiLocked={true}
        onToggleRoiLock={handleToggleLock}
      />,
    );

    const lockBtn = screen.getByRole("button", { name: /locked/i });
    expect(lockBtn).toBeDefined();
    fireEvent.click(lockBtn);
    expect(handleToggleLock).toHaveBeenCalledTimes(1);
  });

  it("toggles Search ROI lock on row double-click", () => {
    const handleToggleLock = vi.fn();
    render(
      <VisionLayersPanel
        roi={dummyRoi}
        isRoiLocked={true}
        onToggleRoiLock={handleToggleLock}
      />,
    );

    const rowContainer = screen.getByText(/Bounds \(X, Y\):/).closest("div");
    expect(rowContainer).not.toBeNull();
    if (rowContainer) {
      fireEvent.doubleClick(rowContainer);
      expect(handleToggleLock).toHaveBeenCalledTimes(1);
    }
  });

  it("renders 57 ICOS pattern boxes in Z2 layer", () => {
    render(<VisionLayersPanel roi={dummyRoi} />);

    expect(screen.getByText("B01")).toBeDefined();
    expect(screen.getByText("B57")).toBeDefined();
  });

  it("calls onToggleBoxExcluded when box eye toggle is clicked", () => {
    const handleToggle = vi.fn();
    render(
      <VisionLayersPanel
        roi={dummyRoi}
        onToggleBoxExcluded={handleToggle}
      />,
    );

    const eyeBtn = document.querySelector("[data-element-id='btn-box-eye-1']");
    expect(eyeBtn).not.toBeNull();
    if (eyeBtn) {
      fireEvent.click(eyeBtn);
      expect(handleToggle).toHaveBeenCalledWith(1);
    }
  });
});
