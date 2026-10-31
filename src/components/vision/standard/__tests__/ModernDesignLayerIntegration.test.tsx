/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { RegionOverlay } from "../RegionOverlay";
import { RoiToolbar } from "@/components/vision/white-box/RoiToolbar";
import { StandardToolPanel } from "../StandardToolPanel";
import { createDefaultPatternSearchSettings } from "@/domain/vision/pattern-search";
import type { Viewport } from "@/lib/editor/types";

describe("Modern Design Layer Integration (Spec 83)", () => {
  afterEach(() => {
    cleanup();
  });

  const mockViewport: Viewport = { panX: 0, panY: 0, zoom: 1 };

  it("RegionOverlay renders 20px header grip bar with GripHorizontal icon and label", () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();

    render(
      <RegionOverlay
        color="#00e5ff"
        geometry={{ x: 50, y: 50, width: 200, height: 150 }}
        onChange={onChange}
        viewport={mockViewport}
        active={true}
        label="SEARCH REGION"
        onSelect={onSelect}
      />,
    );

    const headerGrip = screen.getByTestId("roi-header-grip");
    expect(headerGrip).toBeTruthy();
    expect(headerGrip.textContent).toContain("SEARCH REGION");
    expect(headerGrip.textContent).toContain("200×150");

    // 8 White/Slate CAD handles rendered
    expect(screen.getByTestId("handle-nw")).toBeTruthy();
    expect(screen.getByTestId("handle-ne")).toBeTruthy();
    expect(screen.getByTestId("handle-se")).toBeTruthy();
    expect(screen.getByTestId("handle-sw")).toBeTruthy();
    expect(screen.getByTestId("handle-n")).toBeTruthy();
    expect(screen.getByTestId("handle-s")).toBeTruthy();
    expect(screen.getByTestId("handle-e")).toBeTruthy();
    expect(screen.getByTestId("handle-w")).toBeTruthy();
  });

  it("RegionOverlay does not render handles when inactive", () => {
    const onChange = vi.fn();

    render(
      <RegionOverlay
        color="#10b981"
        geometry={{ x: 50, y: 50, width: 200, height: 150 }}
        onChange={onChange}
        viewport={mockViewport}
        active={false}
      />,
    );

    expect(screen.queryByTestId("roi-header-grip")).toBeNull();
    expect(screen.queryByTestId("handle-nw")).toBeNull();
  });

  it("RegionOverlay respects isLocked state by suppressing resize handles", () => {
    const onChange = vi.fn();

    render(
      <RegionOverlay
        color="#00e5ff"
        geometry={{ x: 50, y: 50, width: 200, height: 150 }}
        onChange={onChange}
        viewport={mockViewport}
        active={true}
        isLocked={true}
      />,
    );

    expect(screen.getByTestId("roi-header-grip")).toBeTruthy();
    expect(screen.queryByTestId("handle-nw")).toBeNull();
  });

  it("RoiToolbar renders all floating action buttons and handles interactions", () => {
    const onToggleLock = vi.fn();
    const onShapeChange = vi.fn();
    const onToggleMask = vi.fn();
    const onToggleInvert = vi.fn();
    const onCrop = vi.fn();
    const onOpacityChange = vi.fn();

    render(
      <RoiToolbar
        region={{ x: 100, y: 100, width: 200, height: 120 }}
        canvasWidth={960}
        canvasHeight={540}
        label="SEARCH REGION"
        isLocked={false}
        onToggleLock={onToggleLock}
        shape="rectangle"
        onShapeChange={onShapeChange}
        isMaskEnabled={false}
        onToggleMask={onToggleMask}
        isInverted={false}
        onToggleInvert={onToggleInvert}
        onCrop={onCrop}
        opacity={100}
        onOpacityChange={onOpacityChange}
      />,
    );

    const toolbar = screen.getByTestId("roi-toolbar");
    expect(toolbar).toBeTruthy();
    expect(toolbar.textContent).toContain("SEARCH REGION • 200×120");

    // Click lock
    const lockBtn = screen.getByTestId("btn-toggle-lock");
    fireEvent.click(lockBtn);
    expect(onToggleLock).toHaveBeenCalledTimes(1);

    // Cycle shape
    const shapeBtn = screen.getByTestId("btn-shape-selector");
    fireEvent.click(shapeBtn);
    expect(onShapeChange).toHaveBeenCalledWith("square");

    // Toggle mask
    const maskBtn = screen.getByTestId("btn-toggle-mask");
    fireEvent.click(maskBtn);
    expect(onToggleMask).toHaveBeenCalledTimes(1);

    // Toggle invert
    const invertBtn = screen.getByTestId("btn-toggle-invert");
    fireEvent.click(invertBtn);
    expect(onToggleInvert).toHaveBeenCalledTimes(1);

    // Crop template
    const cropBtn = screen.getByTestId("btn-crop-template");
    fireEvent.click(cropBtn);
    expect(onCrop).toHaveBeenCalledTimes(1);
  });

  it("StandardToolPanel renders Layers tab and mounts PhotoshopLayersPanel", () => {
    const settings = createDefaultPatternSearchSettings("T106");
    const setSettings = vi.fn();

    render(<StandardToolPanel settings={settings} setSettings={setSettings} />);

    // Click on Layers tab
    const layersTab = screen.getByTestId("tab-layers");
    expect(layersTab).toBeTruthy();
    fireEvent.click(layersTab);

    // PhotoshopLayersPanel rendered
    expect(screen.getAllByText("Reference Image").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Search ROI")).toBeTruthy();
    expect(screen.getByText("Pattern Template")).toBeTruthy();
  });
});
