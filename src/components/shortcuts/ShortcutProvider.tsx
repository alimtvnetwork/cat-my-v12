import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Global shortcut dispatcher for Plan 100 §13 (step 12).
 *
 * Attaches a single window-level `keydown` listener, normalizes the event
 * to the canonical combo, resolves it through the registry honoring scope
 * precedence (hud > editor > route:* > menu > global), and invokes the
 * winning handler. Errors are surfaced via `console.error` with combo +
 * id context (no silent catch, per V4 spec §21).
 *
 * The active route scope is derived from TanStack Router's current
 * pathname so route-scoped shortcuts only fire while their route is
 * mounted. Editor / HUD scopes register directly from those components.
 */
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { comboFromEvent } from "@/lib/shortcuts/formatCombo";
import { resolveShortcut } from "@/lib/shortcuts/registry";
import type { ShortcutScopeType } from "@/lib/shortcuts/scopes";
import { HtmlTag } from "@/lib/enums/html";

function pathToRouteScope(pathname: string): ShortcutScopeType {
  // First non-empty segment is the route key. `/projects/abc` -> `route:projects`.
  const seg = pathname.split("/").filter(Boolean)[0] ?? "index";

  return `route:${seg}` as ShortcutScopeType;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;

  if (tag === HtmlTag.Input || tag === HtmlTag.Textarea || tag === HtmlTag.Select) return true;

  if (target.isContentEditable) return true;

  return false;
}

export function ShortcutProvider() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const scope = pathToRouteScope(pathname);
    const onKeyDown = (event: KeyboardEvent) => {
      // Never hijack typing in editable surfaces unless the combo carries a modifier.
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      if (isEditableTarget(event.target) && !hasModifier) return;

      const combo = comboFromEvent(event);
      const match = resolveShortcut(combo, scope);

      if (!match) return;
      event.preventDefault();
      try {
        match.run(event);
      } catch (err) {
        // Do not swallow: log with context so a broken handler is visible.
        ClientLogger.error("[shortcuts] handler threw", {
          shortcutId: match.id,
          combo,
          scope: match.scope,
          error: err,
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname]);

  return null;
}
