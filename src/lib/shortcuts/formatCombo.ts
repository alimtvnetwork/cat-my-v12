/**
 * Cross-platform combo formatter for Plan 100 §13.
 * Input canonical form: "Ctrl+Shift+F", "Alt+ArrowLeft", "F2", "?".
 * Output uses ⌘/⇧/⌥/⌃ glyphs on macOS, textual tokens elsewhere.
 */
const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? navigator.userAgent ?? "");

const MAC_MAP: Record<string, string> = {
  Ctrl: "⌃",
  Cmd: "⌘",
  Mod: "⌘",
  Shift: "⇧",
  Alt: "⌥",
  Option: "⌥",
  Meta: "⌘",
};

const WIN_MAP: Record<string, string> = {
  Mod: "Ctrl",
  Cmd: "Ctrl",
  Meta: "Win",
};

export function formatCombo(combo: string): string {
  const map = IS_MAC ? MAC_MAP : WIN_MAP;
  const parts = combo.split("+").map((raw) => {
    const key = raw.trim();

    return map[key] ?? key;
  });

  return IS_MAC ? parts.join("") : parts.join("+");
}

/**
 * Normalize a KeyboardEvent to the canonical combo form used by the registry.
 * Order: Ctrl, Alt, Shift, Meta, then the key.
 */
export function comboFromEvent(event: KeyboardEvent): string {
  const parts: string[] = [];

  if (event.ctrlKey) parts.push("Ctrl");

  if (event.altKey) parts.push("Alt");

  if (event.shiftKey) parts.push("Shift");

  if (event.metaKey) parts.push("Meta");
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  parts.push(key);

  return parts.join("+");
}
