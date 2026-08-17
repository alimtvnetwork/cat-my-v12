/**
 * Alt-mnemonic highlight layer for Plan 100 §13 (step 14).
 *
 * While Alt is held down, toggles a `data-alt-mnemonic="on"` attribute on
 * `<html>` so menus and buttons can reveal their access-key underlines via
 * a CSS selector (`html[data-alt-mnemonic=on] [data-mnemonic] > u`). The
 * attribute clears on keyup, blur, or when focus leaves the window so a
 * stuck modifier never leaves the UI in the highlighted state.
 *
 * This does not dispatch mnemonic activations by itself: `Alt+<Letter>`
 * combos flow through the registry via `ShortcutProvider`. This component
 * owns only the visual reveal.
 */
import { useEffect } from "react";

const ATTR = "data-alt-mnemonic";

function setOn(): void {
  document.documentElement.setAttribute(ATTR, "on");
}

function setOff(): void {
  document.documentElement.removeAttribute(ATTR);
}

export function AltMnemonicLayer(): React.JSX.Element | null {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") setOn();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt") setOff();
    };
    const onBlur = () => setOff();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      setOff();
    };
  }, []);

  return null;
}
