// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SimulationPlayerBar } from "../SimulationPlayerBar";

describe("SimulationPlayerBar", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    stepIndex: 3,
    totalSteps: 22,
    stepTitle: "Save project and continue",
    isPaused: false,
    dwellTimeSec: 8,
    elapsedSec: 2.5,
    currentStepTotalSec: 8,
    hasPreviousStep: true,
    hasNextStep: true,
    onTogglePause: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onStop: vi.fn(),
    onChangeDwellTime: vi.fn(),
  };

  it("renders step counter, title, and remaining seconds", () => {
    render(<SimulationPlayerBar {...defaultProps} />);

    expect(screen.getByText("Step 4 / 22")).not.toBeNull();
    expect(screen.getByText("Save project and continue")).not.toBeNull();
    expect(screen.getByText("5.5s")).not.toBeNull();
    expect(screen.getByText("Pause")).not.toBeNull();
  });

  it("displays PAUSED indicator when isPaused is true", () => {
    render(<SimulationPlayerBar {...defaultProps} isPaused={true} />);

    expect(screen.getByText("PAUSED")).not.toBeNull();
    expect(screen.getByText("Resume")).not.toBeNull();
  });

  it("fires onTogglePause when clicking the Pause / Resume button", () => {
    const onTogglePause = vi.fn();
    render(<SimulationPlayerBar {...defaultProps} onTogglePause={onTogglePause} />);

    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(onTogglePause).toHaveBeenCalledTimes(1);
  });

  it("fires onNext when clicking Next", () => {
    const onNext = vi.fn();
    render(<SimulationPlayerBar {...defaultProps} onNext={onNext} />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("fires onPrevious when clicking Prev", () => {
    const onPrevious = vi.fn();
    render(<SimulationPlayerBar {...defaultProps} onPrevious={onPrevious} />);

    fireEvent.click(screen.getByRole("button", { name: /prev/i }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("fires onStop when clicking Exit", () => {
    const onStop = vi.fn();
    render(<SimulationPlayerBar {...defaultProps} onStop={onStop} />);

    fireEvent.click(screen.getByRole("button", { name: /exit/i }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("fires onTakeOver when clicking Take Over", () => {
    const onTakeOver = vi.fn();
    render(<SimulationPlayerBar {...defaultProps} onTakeOver={onTakeOver} />);

    fireEvent.click(screen.getByRole("button", { name: /take over/i }));
    expect(onTakeOver).toHaveBeenCalledTimes(1);
  });

  it("fires onChangeDwellTime when adjusting the slider", () => {
    const onChangeDwellTime = vi.fn();
    render(<SimulationPlayerBar {...defaultProps} onChangeDwellTime={onChangeDwellTime} />);

    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "12" } });
    expect(onChangeDwellTime).toHaveBeenCalledWith(12);
  });
});
