/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { StandardActionBar } from "../StandardActionBar";
import { StandardActionLabel } from "../constants";

describe("StandardActionBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders expected controls with accessible names", () => {
    render(<StandardActionBar />);
    expect(screen.getByRole("button", { name: StandardActionLabel.OriginPoint }).tagName).toBe(
      "BUTTON",
    );
    expect(screen.getByRole("button", { name: StandardActionLabel.Display }).tagName).toBe(
      "BUTTON",
    );
    expect(screen.getByRole("button", { name: StandardActionLabel.RegisterImage }).tagName).toBe(
      "BUTTON",
    );
    expect(screen.getByRole("button", { name: StandardActionLabel.EvaluateRule }).tagName).toBe(
      "BUTTON",
    );
    expect(screen.getByRole("button", { name: StandardActionLabel.Cancel }).tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: StandardActionLabel.Ok }).tagName).toBe("BUTTON");
  });

  it("settings icon button has an accessible name", () => {
    render(<StandardActionBar />);
    expect(screen.getByRole("button", { name: StandardActionLabel.Settings }).tagName).toBe(
      "BUTTON",
    );
  });

  it("invokes onEvaluate callback exactly once", () => {
    const onEvaluateMock = vi.fn();
    render(<StandardActionBar onEvaluate={onEvaluateMock} />);
    const evaluateButton = screen.getByRole("button", { name: StandardActionLabel.EvaluateRule });

    fireEvent.click(evaluateButton);
    expect(onEvaluateMock).toHaveBeenCalledTimes(1);
  });

  it("invokes action bar callbacks when clicked", () => {
    const onOriginPoint = vi.fn();
    const onDisplay = vi.fn();
    const onRegisterImage = vi.fn();
    const onSettings = vi.fn();
    const onCancel = vi.fn();
    const onOk = vi.fn();

    render(
      <StandardActionBar
        onOriginPoint={onOriginPoint}
        onDisplay={onDisplay}
        onRegisterImage={onRegisterImage}
        onSettings={onSettings}
        onCancel={onCancel}
        onOk={onOk}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.OriginPoint }));
    expect(onOriginPoint).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.Display }));
    expect(onDisplay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.RegisterImage }));
    expect(onRegisterImage).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.Settings }));
    expect(onSettings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.Cancel }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: StandardActionLabel.Ok }));
    expect(onOk).toHaveBeenCalledTimes(1);
  });
});
