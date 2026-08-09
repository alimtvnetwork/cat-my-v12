import { EditorRuleKindType } from "@/lib/editor/types";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorRule, EditorRuleKind, EditorRect } from "@/lib/editor/types";
import { PropertiesPanel } from "../PropertiesPanel";

if (typeof window.ResizeObserver === "undefined") {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const makeRule = (over: Partial<EditorRule> = {}): EditorRule => ({
  id: "a",
  name: "Alpha",
  kind: EditorRuleKindType.R,
  isHidden: false,
  isLocked: false,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  params: {},
  ...over,
});

const imageBounds: EditorRect = { x: 0, y: 0, width: 100, height: 100 };

function setup(over: Partial<React.ComponentProps<typeof PropertiesPanel>> = {}) {
  const props: React.ComponentProps<typeof PropertiesPanel> = {
    rules: [makeRule()],
    selectedIds: ["a"],
    imageBounds,
    onRename: vi.fn(),
    onSetKind: vi.fn(),
    onUpdateParams: vi.fn(),
    onSetBounds: vi.fn(),
    onSetHidden: vi.fn(),
    onSetLocked: vi.fn(),
    ...over,
  };

  return { ...render(<PropertiesPanel {...props} />), props };
}

describe("PropertiesPanel", () => {
  it("renders the empty state when no rule is selected", () => {
    setup({ selectedIds: [] });
    expect(screen.getByText("No layer selected.")).toBeTruthy();
  });

  it("renders a multi-select summary and toggles visibility/lock for all", async () => {
    const user = userEvent.setup();
    const { props } = setup({
      rules: [makeRule(), makeRule({ id: "b", name: "Beta", isHidden: true })],
      selectedIds: ["a", "b"],
    });

    expect(screen.getByText("2 layers selected")).toBeTruthy();

    // At least one is visible, so button offers "Hide all".
    await user.click(screen.getByRole("button", { name: "Hide all" }));
    expect(props.onSetHidden).toHaveBeenCalledWith(["a", "b"], true);

    await user.click(screen.getByRole("button", { name: "Lock all" }));
    expect(props.onSetLocked).toHaveBeenCalledWith(["a", "b"], true);
  });

  it("commits a renamed rule on blur when valid", async () => {
    const user = userEvent.setup();
    const { props } = setup();
    const input = screen.getByLabelText("Name of Rect") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Renamed");
    fireEvent.blur(input);
    expect(props.onRename).toHaveBeenCalledWith("a", "Renamed");
  });

  it("changes rule kind through the select", async () => {
    const user = userEvent.setup();
    const { props } = setup();
    await user.selectOptions(screen.getByLabelText("Rule kind"), "C");
    expect(props.onSetKind).toHaveBeenCalledWith("a", "C");
  });

  it("emits bounds updates when a coordinate input changes", () => {
    const { props } = setup();
    fireEvent.change(screen.getByLabelText("X"), { target: { value: "5" } });
    expect(props.onSetBounds).toHaveBeenCalledWith("a", { x: 5, y: 0, width: 10, height: 10 });
  });

  it("always renders the Bounds controls even if the old collapsible state was closed", () => {
    window.localStorage.setItem("hmi.rail.panel:properties.bounds.open", "0");
    setup();
    expect(screen.getByRole("region", { name: "Rule bounds" })).toBeTruthy();
    expect(screen.getByLabelText("X")).toBeTruthy();
    expect(screen.getByLabelText("Y")).toBeTruthy();
    expect(screen.getByLabelText("W")).toBeTruthy();
    expect(screen.getByLabelText("H")).toBeTruthy();
  });

  it("disables bounds inputs and kind select when the rule is locked", () => {
    setup({ rules: [makeRule({ isLocked: true })] });
    expect((screen.getByLabelText("X") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Rule kind") as HTMLSelectElement).disabled).toBe(true);
  });
});
