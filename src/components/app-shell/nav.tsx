import { GlobalNav } from "../hmi/GlobalNav";

/**
 * Plan 63: app-shell nav slot. Fixed wrapper around type-safe `GlobalNav`.
 * CSS-gated via `.app-shell-nav-global` so it only paints on routes that
 * do NOT mount an `HmiShell` titlebar.
 */
export function AppShellNav() {
  return (
    <div
      className="app-shell-nav-global hidden lg:block"
      data-testid="app-shell-nav"
      aria-label="Global navigation"
    >
      <GlobalNav />
    </div>
  );
}

export default AppShellNav;
