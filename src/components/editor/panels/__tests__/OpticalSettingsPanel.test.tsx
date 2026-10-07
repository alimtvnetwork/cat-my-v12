import { EditorRuleKindType } from "@/lib/editor/types";
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorRule } from "@/lib/editor/types";
import { OpticalSettingsPanel } from "../OpticalSettingsPanel";

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
});

const makeRule = (over: Partial<EditorRule> = {}): EditorRule => ({
  id: "rule-1",
  name: "Inspection Rule",
  kind: EditorRuleKindType.R,
  isHidden: false,
  isLocked: false,
  x: 10,
  y: 20,
  width: 100,
  height: 80,
  params: {},
  ...over,
});

describe("OpticalSettingsPanel", () => {
  it("renders default camera and lighting values when rule has none", () => {
    const rule = makeRule();
    render(<OpticalSettingsPanel rule={rule} />);

    expect(screen.getByText("Camera & Illumination")).toBeTruthy();
    expect(screen.getByText("Exposure Time")).toBeTruthy();
    expect(screen.getByText("20.0 ms")).toBeTruthy();
    expect(screen.getByText("Analog Gain")).toBeTruthy();
    expect(screen.getByText("0.0 dB")).toBeTruthy();
    expect(screen.getByText("Light Intensity")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("Light Channel")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Strobe Flash Mode/i })).toBeTruthy();
  });

  it("renders custom optical values when provided on rule", () => {
    const rule = makeRule({
      cameraSettings: {
        exposureUs: 500,
        gainDb: 6.5,
        whiteBalanceKelvin: 4000,
        gamma: 1.2,
      },
      lightSettings: {
        channel: 3,
        intensity: 75,
        hasStrobe: true,
        strobeDurationUs: 250,
      },
    });

    render(<OpticalSettingsPanel rule={rule} />);

    expect(screen.getByText("500 µs")).toBeTruthy();
    expect(screen.getByText("6.5 dB")).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy();
    expect(screen.getByText("250 µs")).toBeTruthy();
  });

  it("updates channel when channel button is clicked", async () => {
    const user = userEvent.setup();
    const onUpdateOptical = vi.fn();
    const rule = makeRule();

    render(<OpticalSettingsPanel rule={rule} onUpdateOptical={onUpdateOptical} />);

    const channel2Btn = screen.getByRole("button", { name: "2" });
    await user.click(channel2Btn);

    expect(onUpdateOptical).toHaveBeenCalledWith("rule-1", {
      cameraSettings: expect.objectContaining({ exposureUs: 20000 }),
      lightSettings: expect.objectContaining({ channel: 2 }),
    });
  });

  it("toggles strobe flash mode when checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onUpdateOptical = vi.fn();
    const rule = makeRule();

    render(<OpticalSettingsPanel rule={rule} onUpdateOptical={onUpdateOptical} />);

    const strobeCheckbox = screen.getByRole("checkbox", { name: /Strobe Flash Mode/i });
    await user.click(strobeCheckbox);

    expect(onUpdateOptical).toHaveBeenCalledWith("rule-1", {
      cameraSettings: expect.objectContaining({ exposureUs: 20000 }),
      lightSettings: expect.objectContaining({ hasStrobe: true }),
    });
  });

  it("disables controls and ignores clicks when rule is locked", async () => {
    const user = userEvent.setup();
    const onUpdateOptical = vi.fn();
    const rule = makeRule({ isLocked: true });

    render(<OpticalSettingsPanel rule={rule} onUpdateOptical={onUpdateOptical} />);

    const channel2Btn = screen.getByRole("button", { name: "2" }) as HTMLButtonElement;
    expect(channel2Btn.disabled).toBe(true);

    const strobeCheckbox = screen.getByRole("checkbox", {
      name: /Strobe Flash Mode/i,
    }) as HTMLInputElement;
    expect(strobeCheckbox.disabled).toBe(true);

    await user.click(channel2Btn);
    expect(onUpdateOptical).not.toHaveBeenCalled();
  });
});
