/**
 * @vitest-environment jsdom
 */
import React, { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { StandardToolShell } from "../StandardToolShell";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import {
  createDefaultPatternSearchSettings,
  PatternSearchSettings,
} from "@/domain/vision/pattern-search";
import { ShapeType } from "@/domain/vision/shapes";

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function TestStandardToolHarness(props: {
  initialSettings: PatternSearchSettings;
  onSettingsChange?: (settings: PatternSearchSettings) => void;
}): React.JSX.Element {
  const [settings, setSettings] = useState<PatternSearchSettings>(props.initialSettings);

  const handleSettingsChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>> = (
    updater,
  ) => {
    setSettings((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      props.onSettingsChange?.(next);

      return next;
    });
  };

  const tabs = [
    {
      id: "region",
      label: "Inspection Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "conditions",
      label: "Judgment Conditions",
      content: <JudgmentConditionsTab />,
    },
  ];

  return (
    <StandardToolShell
      toolName="Context Test Tool"
      toolKindId="T-TEST"
      tabs={tabs}
      settings={settings}
      onChangeSettings={handleSettingsChange}
    />
  );
}

describe("StandardToolContext parameter synchronization", () => {
  afterEach(() => {
    cleanup();
  });

  it("synchronizes inspection region changes from tab to settings without explicit props", () => {
    const onSettingsChange = vi.fn();
    const initialSettings = createDefaultPatternSearchSettings("T-TEST");
    initialSettings.searchRegion = {
      shape: ShapeType.Rectangle,
      geometry: { x: 75, y: 80, width: 220, height: 180 },
    };

    render(
      <TestStandardToolHarness
        initialSettings={initialSettings}
        onSettingsChange={onSettingsChange}
      />,
    );

    const xInput = screen.getByDisplayValue("75");
    expect(xInput).toBeDefined();

    fireEvent.change(xInput, { target: { value: "125" } });

    expect(onSettingsChange).toHaveBeenCalled();
    const lastCall = onSettingsChange.mock.calls[onSettingsChange.mock.calls.length - 1][0];
    expect(lastCall.searchRegion.geometry.x).toBe(125);
  });

  it("synchronizes judgment condition limits and recalculates pass/fail status", () => {
    const onSettingsChange = vi.fn();
    const initialSettings = createDefaultPatternSearchSettings("T-TEST");
    initialSettings.params = {
      judgmentItems: [
        {
          id: "item1",
          name: "Test Measurement",
          unit: "px",
          lowerLimit: 10,
          measured: 50,
          upperLimit: 100,
          status: "PASS",
        },
      ],
    };

    render(
      <TestStandardToolHarness
        initialSettings={initialSettings}
        onSettingsChange={onSettingsChange}
      />,
    );

    const tabButton = screen.getByRole("button", { name: "Judgment Conditions" });
    fireEvent.click(tabButton);

    const lowerInput = screen.getByDisplayValue("10");
    fireEvent.change(lowerInput, { target: { value: "60" } });

    expect(onSettingsChange).toHaveBeenCalled();
    const lastCall = onSettingsChange.mock.calls[onSettingsChange.mock.calls.length - 1][0];
    const items = lastCall.params?.judgmentItems;
    expect(items[0].lowerLimit).toBe(60);
    expect(items[0].status).toBe("FAIL");
  });

  it("auto-sets limits when Auto Set Limits button is clicked", () => {
    const onSettingsChange = vi.fn();
    const initialSettings = createDefaultPatternSearchSettings("T-TEST");
    initialSettings.params = {
      judgmentItems: [
        {
          id: "item1",
          name: "Calibration Area",
          unit: "px",
          lowerLimit: 0,
          measured: 100,
          upperLimit: 200,
          status: "PASS",
        },
      ],
    };

    render(
      <TestStandardToolHarness
        initialSettings={initialSettings}
        onSettingsChange={onSettingsChange}
      />,
    );

    const tabButton = screen.getByRole("button", { name: "Judgment Conditions" });
    fireEvent.click(tabButton);

    const autoSetButton = screen.getByRole("button", { name: "Auto Set Limits" });
    fireEvent.click(autoSetButton);

    expect(onSettingsChange).toHaveBeenCalled();
    const lastCall = onSettingsChange.mock.calls[onSettingsChange.mock.calls.length - 1][0];
    const items = lastCall.params?.judgmentItems;
    expect(items[0].lowerLimit).toBe(80);
    expect(items[0].upperLimit).toBe(120);
    expect(items[0].status).toBe("PASS");
  });
});
