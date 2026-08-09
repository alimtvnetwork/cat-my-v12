import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleShortcutKey } from "@/lib/editor/keyboard/shortcuts";
import { __resetIdsForTests, nextRuleId, nextRuleIds } from "@/lib/editor/store/ids";

function makeEvent(
  key: string,
  mods: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean } = {},
  target: EventTarget | null = null,
): KeyboardEvent {
  const ev = {
    key,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    target,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...mods,
  } as unknown as KeyboardEvent;
  return ev;
}

describe("id generator seam", () => {
  beforeEach(() => __resetIdsForTests());
  it("produces stable monotonic ids", () => {
    expect(nextRuleId()).toBe("r-1");
    expect(nextRuleIds(3)).toEqual(["r-2", "r-3", "r-4"]);
  });
});

describe("handleShortcutKey (82)", () => {
  const h = {
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onSelectAll: vi.fn(),
    onDuplicateSelected: vi.fn(),
  };
  beforeEach(() => Object.values(h).forEach((fn) => fn.mockReset()));

  it("Ctrl+Z fires undo and preventDefault", () => {
    const ev = makeEvent("z", { ctrlKey: true });
    expect(handleShortcutKey(ev, h)).toBe(true);
    expect(ev.defaultPrevented).toBe(true);
    expect(h.onUndo).toHaveBeenCalledOnce();
  });
  it("Ctrl+Shift+Z fires redo", () => {
    handleShortcutKey(makeEvent("z", { ctrlKey: true, shiftKey: true }), h);
    expect(h.onRedo).toHaveBeenCalledOnce();
    expect(h.onUndo).not.toHaveBeenCalled();
  });
  it("Ctrl+Y also fires redo", () => {
    handleShortcutKey(makeEvent("y", { ctrlKey: true }), h);
    expect(h.onRedo).toHaveBeenCalledOnce();
  });
  it("Ctrl+A and Ctrl+D fire selectAll / duplicate", () => {
    handleShortcutKey(makeEvent("a", { ctrlKey: true }), h);
    handleShortcutKey(makeEvent("d", { ctrlKey: true }), h);
    expect(h.onSelectAll).toHaveBeenCalledOnce();
    expect(h.onDuplicateSelected).toHaveBeenCalledOnce();
  });
  it("no modifier: ignored (typing lower-case z into the page must not undo)", () => {
    expect(handleShortcutKey(makeEvent("z"), h)).toBe(false);
    expect(h.onUndo).not.toHaveBeenCalled();
  });
  it("skips when target is an INPUT (no accidental undo while typing rule name)", () => {
    const input = { tagName: "INPUT", isContentEditable: false } as unknown as EventTarget;
    handleShortcutKey(makeEvent("z", { ctrlKey: true }, input), h);
    expect(h.onUndo).not.toHaveBeenCalled();
  });
  it("bracket keys fire moveSelectionUp/Down without a modifier (73)", () => {
    const up = vi.fn(),
      down = vi.fn();
    const local = { ...h, onMoveSelectionUp: up, onMoveSelectionDown: down };
    handleShortcutKey(makeEvent("["), local);
    handleShortcutKey(makeEvent("]"), local);
    expect(up).toHaveBeenCalledOnce();
    expect(down).toHaveBeenCalledOnce();
  });
  it("brackets do nothing when handlers absent", () => {
    expect(handleShortcutKey(makeEvent("["), h)).toBe(false);
    expect(handleShortcutKey(makeEvent("]"), h)).toBe(false);
  });
});
