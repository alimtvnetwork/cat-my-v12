import { Link, useRouterState } from "@tanstack/react-router";
import { Home } from "lucide-react";

/**
 * Plan 75 - Issue 15: always-visible Home escape hatch.
 *
 * The app-shell `Titlebar` already ships a Home link, but several routes
 * (ai-testing, diagnostics, admin, camera, ...) render their own layout
 * without `HmiShell`. This mounts a small fixed Home button that only shows
 * on those shell-less routes and when the current pathname is not "/".
 *
 * Root cause of the reported bug (one sentence): routes that bypass
 * `HmiShell` had no Home link, so users hit navigation dead-ends on those
 * pages. The Titlebar sets `data-app-shell="true"`; when it is present the
 * CSS `body:has(...)` selector hides this fallback.
 */
export function GlobalHomeAffordance() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/") return null;

  return (
    <Link
      to="/"
      aria-label="Home"
      title="Home"
      data-global-home="true"
      className="global-home-affordance hmi-focus-ring fixed left-3 top-3 z-40 inline-flex items-center gap-1.5 rounded-md border border-ca-border bg-ca-chrome/90 px-2 py-1 text-hmi-caption font-semibold text-ca-chrome-ink shadow-sm backdrop-blur hover:bg-ca-select/60"
    >
      <Home aria-hidden className="h-3.5 w-3.5" />
      <span>Home</span>
    </Link>
  );
}
