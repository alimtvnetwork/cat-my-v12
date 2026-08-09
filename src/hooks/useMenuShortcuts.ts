import { useEffect } from "react";
import { MenuShortcutType } from "@/lib/enums/menu-shortcut-type";
import { HtmlTag } from "@/lib/enums/html";

export interface MenuShortcutBinding {
  shortcut: MenuShortcutType;
  handler: () => void;
}

type KeyMatcher = (event: KeyboardEvent) => boolean;

const SHORTCUT_MATCHERS: Record<MenuShortcutType, KeyMatcher> = {
  [MenuShortcutType.NewJob]: (event) => hasModifiedKey(event, "n"),
  [MenuShortcutType.OpenJob]: (event) => hasModifiedKey(event, "o"),
  [MenuShortcutType.Save]: (event) => hasModifiedKey(event, "s"),
  [MenuShortcutType.SaveAs]: (event) => hasModifiedShiftKey(event, "s"),
  [MenuShortcutType.Undo]: (event) => hasModifiedKey(event, "z"),
  [MenuShortcutType.Redo]: (event) => hasModifiedKey(event, "y") || hasModifiedShiftKey(event, "z"),
  [MenuShortcutType.Cut]: (event) => hasModifiedKey(event, "x"),
  [MenuShortcutType.Copy]: (event) => hasModifiedKey(event, "c"),
  [MenuShortcutType.Paste]: (event) => hasModifiedKey(event, "v"),
  [MenuShortcutType.Delete]: (event) => hasPlainKey(event, "delete"),
  [MenuShortcutType.Preferences]: (event) => hasModifiedKey(event, ","),
  [MenuShortcutType.LiveRun]: (event) => hasPlainKey(event, "r"),
  [MenuShortcutType.ZoomIn]: (event) => hasModifiedPlusKey(event),
  [MenuShortcutType.ZoomOut]: (event) => hasModifiedKey(event, "-"),
  [MenuShortcutType.Fit]: (event) => hasModifiedKey(event, "0"),
  [MenuShortcutType.ResetZoom]: (event) => hasModifiedKey(event, "1"),
  [MenuShortcutType.Fullscreen]: (event) => hasPlainKey(event, "f11"),
  [MenuShortcutType.Quit]: (event) => hasModifiedKey(event, "q"),
  [MenuShortcutType.CommandPalette]: (event) => hasModifiedKey(event, "k"),
  [MenuShortcutType.ToggleStatusBar]: (event) => hasModifiedKey(event, "/"),
  [MenuShortcutType.ToggleDensity]: (event) => hasModifiedShiftKey(event, "d"),
};

function hasTypingFocus(target: EventTarget | null): boolean {
  const element = target as { tagName?: string; isContentEditable?: boolean } | null;
  const tagName = typeof element?.tagName === "string" ? element.tagName.toUpperCase() : "";

  return (
    tagName === HtmlTag.Input ||
    tagName === HtmlTag.Textarea ||
    tagName === HtmlTag.Select ||
    element?.isContentEditable === true
  );
}

function isKey(event: KeyboardEvent, key: string): boolean {
  return event.key.toLowerCase() === key.toLowerCase();
}

function hasShortcutModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey === true || event.metaKey === true;
}

function hasModifiedKey(event: KeyboardEvent, key: string): boolean {
  return hasShortcutModifier(event) && event.shiftKey === false && isKey(event, key);
}

function hasModifiedShiftKey(event: KeyboardEvent, key: string): boolean {
  return hasShortcutModifier(event) && event.shiftKey === true && isKey(event, key);
}

function hasModifiedPlusKey(event: KeyboardEvent): boolean {
  return hasShortcutModifier(event) && (isKey(event, "+") || isKey(event, "="));
}

function hasPlainKey(event: KeyboardEvent, key: string): boolean {
  return (
    event.ctrlKey === false &&
    event.metaKey === false &&
    event.altKey === false &&
    event.shiftKey === false &&
    isKey(event, key)
  );
}

function matchesMenuShortcut(event: KeyboardEvent, shortcut: MenuShortcutType): boolean {
  return SHORTCUT_MATCHERS[shortcut](event);
}

function invokeMenuShortcut(binding: MenuShortcutBinding): void {
  try {
    binding.handler();
    console.info("[menu-shortcut-types] shortcut dispatched", { shortcut: binding.shortcut });
  } catch (error: unknown) {
    console.error("[menu-shortcut-types] shortcut failed", { shortcut: binding.shortcut, error });

    throw error;
  }
}

export function handleMenuShortcutEvent(
  event: KeyboardEvent,
  bindings: readonly MenuShortcutBinding[],
): boolean {
  if (hasTypingFocus(event.target)) return false;
  const binding = bindings.find((candidate) => matchesMenuShortcut(event, candidate.shortcut));

  if (binding === undefined) return false;
  event.preventDefault();
  invokeMenuShortcut(binding);

  return true;
}

export function useMenuShortcuts(bindings: readonly MenuShortcutBinding[]): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      handleMenuShortcutEvent(event, bindings);
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings]);
}
