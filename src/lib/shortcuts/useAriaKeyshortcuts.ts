/**
 * Plan 100 Phase F step 58: `aria-keyshortcuts` hook.
 *
 * Resolves a registered shortcut id into a canonical, WAI-ARIA-compliant
 * `aria-keyshortcuts` string. Returns `undefined` when the id is not
 * registered so callers can spread the attribute without falsy strings.
 *
 * ARIA spec requires space-separated combos with `+` joining modifiers
 * (`"Alt+H"`, `"Control+/"`). We accept the registry's canonical form
 * (`Ctrl+/`, `Alt+H`, `Meta+K`) and normalize `Ctrl` -> `Control` per
 * https://www.w3.org/TR/wai-aria-1.2/#aria-keyshortcuts.
 */
import { useMemo } from "react";
import { useShortcuts } from "./registry";

function toAriaCombo(combo: string): string {
  return combo
    .split("+")
    .map((part) => (part === "Ctrl" ? "Control" : part))
    .join("+");
}

export function useAriaKeyshortcuts(shortcutId: string): string | undefined {
  const defs = useShortcuts();

  return useMemo(() => {
    const def = defs.find((d) => d.id === shortcutId);

    if (!def) return undefined;

    return toAriaCombo(def.combo);
  }, [defs, shortcutId]);
}