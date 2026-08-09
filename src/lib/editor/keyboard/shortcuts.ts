// Top-level keyboard shortcuts for the editor experience (plan 30 step 82).
// Skips when focus is inside a text input so form typing is unaffected.
import { useEffect } from "react";
import { HtmlTag } from "@/lib/enums/html";

export interface ShortcutHandlers {
  onUndo: () => void;
  onRedo: () => void;
  onSelectAll: () => void;
  onDuplicateSelected: () => void;
  /**
   * Plan 67 step 23. Optional handler for "duplicate as reference"
   * (Cmd/Ctrl+Shift+D). When omitted, Shift+D is ignored.
   */
  onDuplicateAsReference?: () => void;
  onDeleteSelected?: () => void;
  onToggleLockSelected?: () => void;
  onToggleHiddenSelected?: () => void;
  onMoveSelectionUp?: () => void;
  onMoveSelectionDown?: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const t = target as (Partial<HTMLElement> & { tagName?: string }) | null;

  if (!t || typeof t.tagName !== "string") return false;
  const tag = t.tagName;

  if (tag === HtmlTag.Input || tag === HtmlTag.Textarea || tag === HtmlTag.Select) return true;

  return t.isContentEditable === true;
}

// Exported for direct unit testing without a React host.
export function handleShortcutKey(event: KeyboardEvent, handlers: ShortcutHandlers): boolean {
  if (isTypingTarget(event.target)) return false;
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  // Non-modifier bracket keys reorder the selected rule (73).
  if (!mod) {
    if (key === "[" && handlers.onMoveSelectionUp) {
      event.preventDefault();
      handlers.onMoveSelectionUp();

      return true;
    }

    if (key === "]" && handlers.onMoveSelectionDown) {
      event.preventDefault();
      handlers.onMoveSelectionDown();

      return true;
    }
    // Step 82: single-key lock/hide/delete for the selected rules.
    if ((key === "delete" || key === "backspace") && handlers.onDeleteSelected) {
      event.preventDefault();
      handlers.onDeleteSelected();

      return true;
    }

    if (key === "l" && handlers.onToggleLockSelected) {
      event.preventDefault();
      handlers.onToggleLockSelected();

      return true;
    }

    if (key === "h" && handlers.onToggleHiddenSelected) {
      event.preventDefault();
      handlers.onToggleHiddenSelected();

      return true;
    }

    return false;
  }

  if (key === "z" && !event.shiftKey) {
    event.preventDefault();
    handlers.onUndo();

    return true;
  }

  if ((key === "z" && event.shiftKey) || key === "y") {
    event.preventDefault();
    handlers.onRedo();

    return true;
  }

  if (key === "a") {
    event.preventDefault();
    handlers.onSelectAll();

    return true;
  }

  if (key === "d" && event.shiftKey && handlers.onDuplicateAsReference) {
    event.preventDefault();
    handlers.onDuplicateAsReference();

    return true;
  }

  if (key === "d") {
    event.preventDefault();
    handlers.onDuplicateSelected();

    return true;
  }

  return false;
}

export function useEditorShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      handleShortcutKey(event, handlers);
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
