/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { StandardActionBar } from "../StandardActionBar";

describe("StandardActionBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders expected controls with accessible names", () => {
    render(<StandardActionBar />);
    expect(screen.getByRole("button", { name: /origin \/ point/i }).tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: /display/i }).tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: /register image/i }).tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: /evaluate rule/i }).tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: /cancel/i }).tagName).toBe("BUTTON");
    expect(screen.getByRole("button", { name: /ok/i }).tagName).toBe("BUTTON");
  });

  it("settings icon button has an accessible name", () => {
    render(<StandardActionBar />);
    expect(screen.getByRole("button", { name: /settings/i }).tagName).toBe("BUTTON");
  });

  it("invokes onEvaluate callback exactly once", () => {
    const onEvaluateMock = vi.fn();
    render(<StandardActionBar onEvaluate={onEvaluateMock} />);
    const evaluateButton = screen.getByRole("button", { name: /evaluate rule/i });

    fireEvent.click(evaluateButton);
    expect(onEvaluateMock).toHaveBeenCalledTimes(1);
  });
});
