import { EditorRuleKindType } from "@/lib/editor/types";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorRule, EditorRuleKind } from "@/lib/editor/types";
import type { RuleGroup } from "@/lib/editor/store/rules-slice";
import { LayersPanel } from "../LayersPanel";

afterEach(() => cleanup());

const makeRule = (
  id: string,
  kind: EditorRuleKind = EditorRuleKindType.R,
  name = `Rule ${id}`,
): EditorRule => ({
  id,
  name,
  kind,
  isHidden: false,
  isLocked: false,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  params: {},
});

const group: RuleGroup = { id: "g1", name: "Group 1", ruleIds: ["a", "b"] };

function setup(over: Partial<React.ComponentProps<typeof LayersPanel>> = {}) {
  const props: React.ComponentProps<typeof LayersPanel> = {
    rules: [
      makeRule("a", EditorRuleKindType.R, "Alpha"),
      makeRule("b", EditorRuleKindType.C, "Beta"),
      makeRule("c", EditorRuleKindType.K, "Gamma"),
    ],
    selectedIds: ["a"],
    groups: [],
    onSelect: vi.fn(),
    onToggleHidden: vi.fn(),
    onToggleLocked: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onReorder: vi.fn(),
    onGroupSelected: vi.fn(),
    onUngroupSelected: vi.fn(),
    onMergeSelected: vi.fn(),
    onDeleteSelected: vi.fn(),
    ...over,
  };

  return { ...render(<LayersPanel {...props} />), props };
}

describe("LayersPanel", () => {
  it("renders grouped rules first and collapses group contents", async () => {
    const user = userEvent.setup();
    setup({ groups: [group] });

    expect(screen.getByText("Group 1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Alpha, Rect" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Beta, ROI" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Collapse group Group 1" }));

    expect(screen.queryByRole("button", { name: "Alpha, Rect" })).toBeNull();
    expect(screen.getByRole("button", { name: "Gamma, OCR Anchor" })).toBeTruthy();
  });

  it("issue 19: places the group disclosure chevron on the right and toggles aria-expanded", () => {
    setup({ groups: [group] });
    const toggle = screen.getByRole("button", { name: "Collapse group Group 1" });
    // aria-expanded reflects the open state.
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    // Chevron button is the LAST interactive element in the group header row
    // (Photoshop-style: icon + name + count, then disclosure on the right).
    const row = toggle.closest('[role="listitem"]');
    expect(row).toBeTruthy();
    const buttons = row!.querySelectorAll("button");
    expect(buttons[buttons.length - 1]).toBe(toggle);
  });

  it("issue 19: LayerRow does not render a trailing static chevron placeholder", () => {
    const { container } = setup();
    expect(container.querySelector("[data-layer-detail-chevron]")).toBeNull();
  });

  it("emits selection intents, visibility, lock, delete, and rename callbacks", async () => {
    const user = userEvent.setup();
    const { props } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Beta, ROI" }), { ctrlKey: true });
    await user.click(screen.getByRole("button", { name: "Hide Beta" }));
    await user.click(screen.getByRole("button", { name: "Lock Beta" }));
    await user.click(screen.getByRole("button", { name: "Delete Beta" }));
    fireEvent.doubleClick(screen.getByRole("button", { name: "Beta, ROI" }));
    await user.clear(screen.getByRole("textbox", { name: "Rename Beta" }));
    await user.type(screen.getByRole("textbox", { name: "Rename Beta" }), "Beta renamed{Enter}");

    expect(props.onSelect).toHaveBeenCalledWith("b", "toggle");
    expect(props.onToggleHidden).toHaveBeenCalledWith("b");
    expect(props.onToggleLocked).toHaveBeenCalledWith("b");
    expect(props.onDelete).toHaveBeenCalledWith("b");
    expect(props.onRename).toHaveBeenCalledWith("b", "Beta renamed");
  });

  it("handles panel shortcuts without hijacking rename input typing", async () => {
    const user = userEvent.setup();
    const { props } = setup({ selectedIds: ["a", "b"] });
    const panel = screen.getByRole("region", { name: "Layers" });

    panel.focus();
    fireEvent.keyDown(panel, { key: "Delete" });
    fireEvent.keyDown(panel, { key: "g", ctrlKey: true });
    fireEvent.keyDown(panel, { key: "G", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(panel, { key: "e", ctrlKey: true });
    fireEvent.keyDown(panel, { key: "ArrowDown", shiftKey: true });
    fireEvent.doubleClick(screen.getByRole("button", { name: "Alpha, Rect" }));
    await user.type(screen.getByRole("textbox", { name: "Rename Alpha" }), "x");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Rename Alpha" }), { key: "Delete" });

    expect(props.onDeleteSelected).toHaveBeenCalledOnce();
    expect(props.onGroupSelected).toHaveBeenCalledOnce();
    expect(props.onUngroupSelected).toHaveBeenCalledOnce();
    expect(props.onMergeSelected).toHaveBeenCalledOnce();
    expect(props.onSelect).toHaveBeenCalledWith("c", "range");
    expect(props.onDeleteSelected).toHaveBeenCalledTimes(1);
  });
});
