import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleMenuShortcutEvent, type MenuShortcutBinding } from "@/hooks/useMenuShortcuts";
import { MenuShortcutType } from "@/lib/enums/menu-shortcut-type";

type KeyMods = { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean };

function makeEvent(
  key: string,
  mods: KeyMods = {},
  target: EventTarget | null = null,
): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    target,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...mods,
  } as unknown as KeyboardEvent;
}

describe("handleMenuShortcutEvent", () => {
  const onUndo = vi.fn();
  const onPalette = vi.fn();
  const onFullscreen = vi.fn();
  const onStatusBar = vi.fn();
  const bindings: MenuShortcutBinding[] = [
    { shortcut: MenuShortcutType.Undo, handler: onUndo },
    { shortcut: MenuShortcutType.CommandPalette, handler: onPalette },
    { shortcut: MenuShortcutType.Fullscreen, handler: onFullscreen },
    { shortcut: MenuShortcutType.ToggleStatusBar, handler: onStatusBar },
  ];

  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const handler of [onUndo, onPalette, onFullscreen, onStatusBar]) handler.mockReset();
  });

  it("dispatches a modified shortcut and prevents default browser handling", () => {
    const event = makeEvent("z", { ctrlKey: true });
    expect(handleMenuShortcutEvent(event, bindings)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("supports meta-key command palette shortcuts", () => {
    handleMenuShortcutEvent(makeEvent("k", { metaKey: true }), bindings);
    expect(onPalette).toHaveBeenCalledOnce();
  });

  it("supports unmodified function-key shortcuts", () => {
    handleMenuShortcutEvent(makeEvent("F11"), bindings);
    expect(onFullscreen).toHaveBeenCalledOnce();
  });

  it("ignores shortcuts while a form control has focus", () => {
    const input = { tagName: "INPUT", isContentEditable: false } as unknown as EventTarget;
    expect(handleMenuShortcutEvent(makeEvent("z", { ctrlKey: true }, input), bindings)).toBe(false);
    expect(onUndo).not.toHaveBeenCalled();
  });

  it("logs and rethrows handler failures", () => {
    const failing = vi.fn(() => {
      throw new Error("boom");
    });
    const event = makeEvent("/", { ctrlKey: true });
    expect(() =>
      handleMenuShortcutEvent(event, [
        { shortcut: MenuShortcutType.ToggleStatusBar, handler: failing },
      ]),
    ).toThrow("boom");
    expect(console.error).toHaveBeenCalledWith(
      "[menu-shortcut-types] shortcut failed",
      expect.objectContaining({ shortcut: MenuShortcutType.ToggleStatusBar }),
    );
  });
});
