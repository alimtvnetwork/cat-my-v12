// Plan 65 step 11: Dev-only invariant that fails loud when more than one
// app-shell header renders at the same time. Issue 22 shipped a fix that
// removed the duplicate `<TopMenuBar>` inside the Titlebar, but nothing
// stopped a future refactor from re-introducing a second shell header.
// This module observes the DOM and logs a `E_SHELL_DUPLICATE_HEADER`
// warning with the outerHTML of every extra header so the regression is
// obvious in the console instead of only visible as an ugly double bar.
//
// The check is scoped to shell headers marked `data-app-shell="true"`,
// so section `<header>` elements inside cards, panels, and dialogs are
// ignored on purpose.
import { useEffect } from "react";

const CODE = "E_SHELL_DUPLICATE_HEADER";

function check(): void {
  if (typeof document === "undefined") return;
  const nodes = document.querySelectorAll<HTMLElement>('header[data-app-shell="true"]');

  if (nodes.length <= 1) return;
  const tags = Array.from(nodes).map((n) => n.outerHTML.slice(0, 160));
  console.warn(`[${CODE}] ${nodes.length} shell headers mounted at once`, tags);
}

export function useSingleHeaderInvariant(): void {
  const isNonImportmetaenvDEV = !import.meta.env.DEV;

  useEffect(() => {
    if (isNonImportmetaenvDEV) return;
    check();
    const obs = new MutationObserver(() => check());
    obs.observe(document.body, { childList: true, subtree: true });

    return () => obs.disconnect();
  }, []);
}
