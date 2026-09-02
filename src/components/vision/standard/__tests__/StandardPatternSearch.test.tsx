/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { StandardPatternSearch } from "../StandardPatternSearch";
import { createDefaultPatternSearchSettings } from "@/domain/vision/pattern-search";
import { StandardActionLabel } from "../constants";

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe("StandardPatternSearch Component Verification (Plan 91 Steps 81-85)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all core controls and resizable layout correctly", () => {
    const settings = createDefaultPatternSearchSettings("T106");
    const onChange = vi.fn();

    render(<StandardPatternSearch settings={settings} onChange={onChange} />);

    // 1. Resizable panels
    expect(screen.getByLabelText("Resize panels")).toBeTruthy();

    // 2. Action Bar buttons
    expect(screen.getByRole("button", { name: StandardActionLabel.OriginPoint })).toBeTruthy();
    expect(screen.getByRole("button", { name: StandardActionLabel.Display })).toBeTruthy();
    expect(screen.getByRole("button", { name: StandardActionLabel.RegisterImage })).toBeTruthy();
    expect(screen.getByRole("button", { name: StandardActionLabel.EvaluateRule })).toBeTruthy();
    expect(screen.getByRole("button", { name: StandardActionLabel.Settings })).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: StandardActionLabel.Cancel }).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: StandardActionLabel.Ok }).length,
    ).toBeGreaterThanOrEqual(1);

    // 3. Toolbar Refresh button
    expect(screen.getByTitle("Refresh")).toBeTruthy();

    // 4. Pattern Region active tab
    expect(screen.getByRole("heading", { name: "Edit Pattern Region" })).toBeTruthy();
  });

  it("fires Action Bar callbacks when clicked", () => {
    const settings = createDefaultPatternSearchSettings("T106");
    const onChange = vi.fn();
    const onOriginPoint = vi.fn();
    const onDisplay = vi.fn();
    const onRegisterImage = vi.fn();
    const onEvaluate = vi.fn();
    const onSettings = vi.fn();
    const onCancel = vi.fn();
    const onOk = vi.fn();

    render(
      <StandardPatternSearch
        settings={settings}
        onChange={onChange}
        onOriginPoint={onOriginPoint}
        onDisplay={onDisplay}
        onRegisterImage={onRegisterImage}
        onEvaluate={onEvaluate}
        onSettings={onSettings}
        onCancel={onCancel}
        onOk={onOk}
      />,
    );

    // Origin Point
    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.OriginPoint }));
    expect(onOriginPoint).toHaveBeenCalledTimes(1);

    // Display
    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.Display }));
    expect(onDisplay).toHaveBeenCalledTimes(1);

    // Register Image
    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.RegisterImage }));
    expect(onRegisterImage).toHaveBeenCalledTimes(1);

    // Evaluate Rule
    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.EvaluateRule }));
    expect(onEvaluate).toHaveBeenCalledTimes(1);

    // Settings
    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.Settings }));
    expect(onSettings).toHaveBeenCalledTimes(1);

    // Cancel (ActionBar Cancel button is the last one in the DOM)
    const cancelBtns = screen.getAllByRole("button", { name: StandardActionLabel.Cancel });
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);
    expect(onCancel).toHaveBeenCalledTimes(1);

    // OK (ActionBar OK button is the last one in the DOM)
    const okBtns = screen.getAllByRole("button", { name: StandardActionLabel.Ok });
    fireEvent.click(okBtns[okBtns.length - 1]);
    expect(onOk).toHaveBeenCalledTimes(1);
  });

  it("fires Image Toolbar Refresh callback when clicked", () => {
    const settings = createDefaultPatternSearchSettings("T106");
    const onChange = vi.fn();
    const onRefresh = vi.fn();

    render(<StandardPatternSearch settings={settings} onChange={onChange} onRefresh={onRefresh} />);

    const refreshBtn = screen.getByTitle("Refresh");
    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("tests Pattern Region tab Cancel and OK buttons and state toggle", () => {
    const settings = createDefaultPatternSearchSettings("T106");
    const onChange = vi.fn();
    const onCancel = vi.fn();
    const onOk = vi.fn();

    render(
      <StandardPatternSearch
        settings={settings}
        onChange={onChange}
        onCancel={onCancel}
        onOk={onOk}
      />,
    );

    // Pattern Region tab starts in isEditingRegion = true
    const okBtn = screen.getAllByRole("button", { name: "OK" })[0]; // Tab OK button
    fireEvent.click(okBtn);

    // Transitions to Detection Conditions view, showing "Edit Pattern Region" button
    const editBtn = screen.getByRole("button", { name: "Edit Pattern Region" });
    expect(editBtn).toBeTruthy();
    fireEvent.click(editBtn);

    // Back to isEditingRegion = true
    expect(screen.getByRole("heading", { name: "Edit Pattern Region" })).toBeTruthy();
    const cancelBtn = screen.getAllByRole("button", { name: "Cancel" })[0]; // Tab Cancel button
    fireEvent.click(cancelBtn);

    // Action Bar OK / Cancel test
    const actionOkBtn = screen.getAllByRole("button", { name: "OK" })[0];
    fireEvent.click(actionOkBtn);
    expect(onOk).toHaveBeenCalledTimes(1);

    const actionCancelBtn = screen.getAllByRole("button", { name: "Cancel" })[0];
    fireEvent.click(actionCancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("tests Search Region tab Preview, Cancel, and OK buttons", () => {
    const settings = createDefaultPatternSearchSettings("T106");
    // Enable image region so preview button is enabled
    settings.imageRegion.enabled = true;

    const onChange = vi.fn();
    const onCancel = vi.fn();
    const onOk = vi.fn();
    const onPreview = vi.fn();

    render(
      <StandardPatternSearch
        settings={settings}
        onChange={onChange}
        onCancel={onCancel}
        onOk={onOk}
        onPreview={onPreview}
      />,
    );

    // Switch to Search Region tab
    const searchTabBtn = screen.getByTitle("Search Region");
    fireEvent.click(searchTabBtn);

    // Verify Search Region tab header is shown
    expect(screen.getByRole("heading", { name: "Search Region" })).toBeTruthy();

    // Click Preview button
    const previewBtn = screen.getByRole("button", { name: "Preview" });
    fireEvent.click(previewBtn);
    expect(onPreview).toHaveBeenCalledTimes(1);

    // Toggle search region section
    const toggleBtn = screen.getByLabelText("Toggle search region panel");
    expect(toggleBtn.textContent).toBe("<<");
    fireEvent.click(toggleBtn);
    expect(toggleBtn.textContent).toBe(">>");
    fireEvent.click(toggleBtn);
    expect(toggleBtn.textContent).toBe("<<");
  });

  it("tests StandardHeaderReadouts pagination and ToolTitleBar image cycle", () => {
    let currentSettings = createDefaultPatternSearchSettings("T106");
    const onChange = vi.fn((updater) => {
      currentSettings = typeof updater === "function" ? updater(currentSettings) : updater;
    });

    render(<StandardPatternSearch settings={currentSettings} onChange={onChange} />);

    // Test header readout pagination
    expect(screen.getByText("1 / 2")).toBeTruthy();
    const nextPageBtn = screen.getByLabelText("Next readout page");
    fireEvent.click(nextPageBtn);
    expect(screen.getByText("2 / 2")).toBeTruthy();
    expect(screen.getByText("Score")).toBeTruthy();

    const prevPageBtn = screen.getByLabelText("Previous readout page");
    fireEvent.click(prevPageBtn);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.getByText("Unit Time")).toBeTruthy();

    // Test ToolTitleBar Reference Image cycling
    const cycleRefBtn = screen.getByLabelText("Cycle reference image");
    fireEvent.click(cycleRefBtn);
    expect(onChange).toHaveBeenCalled();
  });

  it("updates state properly with default handlers when optional props are omitted", () => {
    let currentSettings = createDefaultPatternSearchSettings("T106");
    const onChange = vi.fn((updater) => {
      currentSettings = typeof updater === "function" ? updater(currentSettings) : updater;
    });

    render(<StandardPatternSearch settings={currentSettings} onChange={onChange} />);

    // Click Origin Point -> resets zoom to 100 and search region x,y to 0
    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.OriginPoint }));
    expect(onChange).toHaveBeenCalled();

    // Click Register Image -> increments referenceImage index
    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.RegisterImage }));
    expect(onChange).toHaveBeenCalled();

    // Click Refresh -> resets zoom to 100
    fireEvent.click(screen.getByTitle("Refresh"));
    expect(onChange).toHaveBeenCalled();
  });
});
