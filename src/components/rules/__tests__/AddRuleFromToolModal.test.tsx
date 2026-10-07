// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { AddRuleFromToolModal } from "../AddRuleFromToolModal";

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

describe("AddRuleFromToolModal", () => {
  it("renders null when isOpen is false", () => {
    const { container } = render(
      <AddRuleFromToolModal isOpen={false} onClose={vi.fn()} onAddRule={vi.fn()} existingRules={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("transitions between isOpen false and true without hook order violation", () => {
    const { rerender } = render(
      <AddRuleFromToolModal isOpen={false} onClose={vi.fn()} onAddRule={vi.fn()} existingRules={[]} />,
    );

    expect(screen.queryByText("Tool Catalog / Add Rule")).toBeNull();

    rerender(
      <AddRuleFromToolModal isOpen={true} onClose={vi.fn()} onAddRule={vi.fn()} existingRules={[]} />,
    );

    expect(screen.getByText("Tool Catalog / Add Rule")).toBeTruthy();

    rerender(
      <AddRuleFromToolModal isOpen={false} onClose={vi.fn()} onAddRule={vi.fn()} existingRules={[]} />,
    );

    expect(screen.queryByText("Tool Catalog / Add Rule")).toBeNull();
  });

  it("shows image choice after selecting a tool and clicking add, then adds the rule", () => {
    const onAddRule = vi.fn();
    const onClose = vi.fn();

    render(
      <AddRuleFromToolModal isOpen={true} onClose={onClose} onAddRule={onAddRule} existingRules={[]} />,
    );

    // Click a tool in the catalog (e.g. by its code or name)
    const selectBtn = screen.getByText("T101").closest("button");
    if (!selectBtn) throw new Error("Could not find tool");
    fireEvent.click(selectBtn);

    // Click Add in the right panel
    const addBtn = screen.getByText("Add").closest("button");
    if (!addBtn) throw new Error("Could not find Add button");
    fireEvent.click(addBtn);

    // Check that Image Choice screen appeared
    expect(screen.getByText("Select Image Source")).toBeTruthy();

    // Click Current Image
    const currentImgBtn = screen.getByText("Current Image").closest("button");
    if (!currentImgBtn) throw new Error("Could not find Current Image button");
    fireEvent.click(currentImgBtn);

    expect(onAddRule).toHaveBeenCalledTimes(1);
    const addedRule = onAddRule.mock.calls[0][0];
    expect(addedRule.x).toBeGreaterThan(0);
    expect(addedRule.y).toBeGreaterThan(0);
    expect(addedRule.width).toBeGreaterThan(0);
    expect(addedRule.height).toBeGreaterThan(0);
    expect(addedRule.cameraSettings).toBeDefined();
    expect(addedRule.lightSettings).toBeDefined();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

