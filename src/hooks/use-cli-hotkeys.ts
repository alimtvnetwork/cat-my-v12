import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { HtmlTagType } from "@/lib/enums/html";

/**
 * Plan 90 Step 132 - CLI global hotkey layer.
 *
 * Root cause for a dedicated hook (one sentence): CLI operators had no
 * keyboard-first navigation between the four primary surfaces (sessions,
 * rules, samples, config), forcing pointer trips through the header on
 * every context switch and slowing triage during incidents.
 *
 * Bindings (all keyboard-only, no chords with modifiers, gmail/vim style):
 *   `g s` -> /cli/sessions
 *   `g r` -> /cli/rules
 *   `g p` -> /cli/samples
 *   `g c` -> /cli/settings   (effective-config accordion, Steps 120-121)
 *   `/`   -> focus first element matching `[data-cli-filter]` on the page
 *   `j`   -> move to next    `[data-cli-row]` (wraps)
 *   `k`   -> move to previous `[data-cli-row]` (wraps)
 *
 * Guardrails:
 *  - All bindings are suppressed while focus is inside an editable target
 *    (INPUT / TEXTAREA / SELECT / contenteditable) EXCEPT `Escape`, which
 *    blurs the editable target (needed so `/` can grab focus back).
 *  - The `g` prefix has a 1200ms window; a second key outside the window
 *    resets the prefix instead of dispatching, so accidental `g` presses
 *    do not fire on the next unrelated key.
 *  - Only one listener is attached at the document level; the effect
 *    cleans up on unmount so mounting the hook twice does not double-fire.
 *  - Consumers mark filter inputs with `data-cli-filter` and rows with
 *    `data-cli-row` (a data-attr contract, not a class contract, so the
 *    styling layer stays free to evolve independently).
 */

const GO_TARGETS: Record<string, string> = {
  s: "/cli/sessions",
  r: "/cli/rules",
  p: "/cli/samples",
  c: "/cli/settings",
};

const GO_WINDOW_MS = 1200;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;

  if (HtmlTagType.isInput(tag) || HtmlTagType.isTextarea(tag) || HtmlTagType.isSelect(tag)) return true;

  if (target.isContentEditable) return true;

  return false;
}

function focusFilter(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.querySelector<HTMLElement>("[data-cli-filter]");

  if (!el) return false;
  el.focus();

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.select();
  }

  return true;
}

function moveRow(direction: 1 | -1): boolean {
  if (typeof document === "undefined") return false;
  const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-cli-row]")).filter(
    (el) => el.offsetParent !== null,
  );

  if (rows.length === 0) return false;
  const active = document.activeElement as HTMLElement | null;
  const currentIdx = active ? rows.indexOf(active) : -1;
  let nextIdx: number;

  if (currentIdx === -1) {
    nextIdx = direction === 1 ? 0 : rows.length - 1;
  } else {
    nextIdx = (currentIdx + direction + rows.length) % rows.length;
  }

  const next = rows[nextIdx];

  if (next.hasAttribute("tabindex") === false) next.setAttribute("tabindex", "0");
  next.focus();
  next.scrollIntoView({ block: "nearest", behavior: "smooth" });

  return true;
}

export function useCliHotkeys(enabled: boolean = true): void {
  const navigate = useNavigate();
  // Ref instead of state: we do not want a re-render on prefix change.
  const prefixRef = useRef<{ key: "g"; at: number } | null>(null);
  const isNonEnabled = !enabled;

  useEffect(() => {
    if (isNonEnabled) return;

    if (typeof window === "undefined") return;

    const onKeyDown = (event: KeyboardEvent) => {
      // Modifier chords are handled by existing app hotkeys; do not intercept.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target;
      const editable = isEditableTarget(target);

      // Escape always wins: blur editable so `/` can regrab focus.
      if (KeyboardKeyType.isEscape(event.key) && editable && target instanceof HTMLElement) {
        target.blur();
        prefixRef.current = null;

        return;
      }

      if (editable) return;

      const key = event.key.toLowerCase();

      // `g` prefix start.
      if (key === "g" && !event.shiftKey) {
        prefixRef.current = { key: "g", at: Date.now() };
        event.preventDefault();

        return;
      }

      // `g X` resolution.
      const prefix = prefixRef.current;

      if (prefix && KeyboardKeyType.isG(prefix.key)) {
        const fresh = Date.now() - prefix.at <= GO_WINDOW_MS;
        prefixRef.current = null;

        if (fresh && key in GO_TARGETS) {
          event.preventDefault();
          void navigate({ to: GO_TARGETS[key] });

          return;
        }
        // Stale or unrecognised: fall through so `j`/`k`/`/` still work.
      }

      if (key === "/") {
        if (focusFilter()) event.preventDefault();

        return;
      }

      if (key === "j") {
        if (moveRow(1)) event.preventDefault();

        return;
      }

      if (key === "k") {
        if (moveRow(-1)) event.preventDefault();

        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, navigate]);
}
