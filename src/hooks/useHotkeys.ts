import { useEffect } from "react";
import { HtmlTagType } from "@/lib/enums/html";

/**
 * Minimal hotkey hook, Plan 64 step 93 support.
 *
 * Root cause for a dedicated hook: scattered `window.addEventListener`
 * calls inside components leak listeners and diverge on editable-field
 * detection. Centralising here means one guard, one matcher, one cleanup.
 *
 * Supported binding forms (case-insensitive):
 *   "mod+k", "ctrl+k", "meta+k", "shift+?", "?", "escape".
 *
 * "mod" matches Command on macOS and Control elsewhere.
 */
export type HotkeyHandler = (event: KeyboardEvent) => void;

export interface HotkeyBinding {
  combo: string;
  handler: HotkeyHandler;
  /** When true, fires even inside inputs / textareas / contenteditable. */
  allowInEditable?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;

  if (HtmlTagType.isInput(tag) || HtmlTagType.isTextarea(tag) || HtmlTagType.isSelect(tag)) return true;

  if (target.isContentEditable) return true;

  return false;
}

function matches(combo: string, event: KeyboardEvent): boolean {
  const parts = combo
    .toLowerCase()
    .split("+")
    .map((p) => p.trim());
  const key = parts[parts.length - 1];
  const mods = new Set(parts.slice(0, -1));
  const isMac = typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform);

  const wantMeta = mods.has("meta") || (mods.has("mod") && isMac);
  const wantCtrl = mods.has("ctrl") || (mods.has("mod") && !isMac);
  const wantShift = mods.has("shift");
  const wantAlt = mods.has("alt");

  if (event.metaKey !== wantMeta) return false;

  if (event.ctrlKey !== wantCtrl) return false;

  if (event.shiftKey !== wantShift) return false;

  if (event.altKey !== wantAlt) return false;

  return event.key.toLowerCase() === key;
}

export function useHotkeys(bindings: readonly HotkeyBinding[]): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      for (const b of bindings) {
        if (matches(b.combo, event) === false) continue;

        if (!b.allowInEditable && isEditableTarget(event.target)) continue;
        event.preventDefault();
        try {
          b.handler(event);
        } catch (err) {
          console.error("[useHotkeys] handler threw", { combo: b.combo, err });
        }

        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings]);
}
