// Lock/Hide/Delete shortcuts (plan 30 step 82).
import { describe, expect, it, vi } from "vitest";
import { handleShortcutKey } from "@/lib/editor/keyboard/shortcuts";

function baseHandlers() {
  return {
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onSelectAll: vi.fn(),
    onDuplicateSelected: vi.fn(),
    onDeleteSelected: vi.fn(),
    onToggleLockSelected: vi.fn(),
    onToggleHiddenSelected: vi.fn(),
  };
}

function ev(key: string, over: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target: null,
    preventDefault: () => {},
    ...over,
  } as unknown as KeyboardEvent;
}

describe("editor shortcuts step 82 (Lock/Hide/Delete)", () => {
  it("L toggles lock on the selected set", () => {
    const h = baseHandlers();
    expect(handleShortcutKey(ev("l"), h)).toBe(true);
    expect(h.onToggleLockSelected).toHaveBeenCalledOnce();
  });

  it("H toggles hidden on the selected set", () => {
    const h = baseHandlers();
    expect(handleShortcutKey(ev("h"), h)).toBe(true);
    expect(h.onToggleHiddenSelected).toHaveBeenCalledOnce();
  });

  it("Delete removes selected rules", () => {
    const h = baseHandlers();
    expect(handleShortcutKey(ev("Delete"), h)).toBe(true);
    expect(h.onDeleteSelected).toHaveBeenCalledOnce();
  });

  it("Backspace also removes selected rules", () => {
    const h = baseHandlers();
    expect(handleShortcutKey(ev("Backspace"), h)).toBe(true);
    expect(h.onDeleteSelected).toHaveBeenCalledOnce();
  });

  it("does not fire while typing in an input", () => {
    const h = baseHandlers();
    const target = { tagName: "INPUT" } as unknown as EventTarget;
    handleShortcutKey(ev("l", { target }), h);
    handleShortcutKey(ev("h", { target }), h);
    handleShortcutKey(ev("Delete", { target }), h);
    expect(h.onToggleLockSelected).not.toHaveBeenCalled();
    expect(h.onToggleHiddenSelected).not.toHaveBeenCalled();
    expect(h.onDeleteSelected).not.toHaveBeenCalled();
  });
});
