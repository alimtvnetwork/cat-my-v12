import { Link, useRouterState } from "@tanstack/react-router";
import { Camera, Zap, Sun, Keyboard, KeyRound, LayoutGrid } from "lucide-react";

// Left rail navigation for the Settings hub. Uses `aria-current="page"` for the
// active leaf so assistive tech announces the current subsection consistently
// with the rest of the app's nav (see TopMenuBar / GlobalNav).
const ITEMS = [
  { to: "/settings", label: "Overview", Icon: LayoutGrid, exact: true },
  { to: "/settings/camera", label: "Camera", Icon: Camera, exact: false },
  { to: "/settings/trigger", label: "Trigger", Icon: Zap, exact: false },
  { to: "/settings/lighting", label: "Lighting", Icon: Sun, exact: false },
  { to: "/settings/shortcuts", label: "Shortcuts", Icon: Keyboard, exact: false },
  { to: "/settings/license", label: "License", Icon: KeyRound, exact: false },
] as const;

export function SettingsSidenav(): React.JSX.Element | null {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Settings sections"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-2 shadow-hmi-panel"
    >
      <ul className="flex flex-col gap-hmi-1">
        {ITEMS.map(({ to, label, Icon, exact }) => {
          const active = exact
            ? pathname === to || pathname === `${to}/`
            : pathname === to || pathname.startsWith(`${to}/`);

          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={
                  "group flex items-center gap-hmi-2 rounded-md px-hmi-2 py-hmi-2 text-hmi-body transition " +
                  (active
                    ? "bg-ca-select text-ca-bg border border-ca-select"
                    : "text-ca-ink border border-transparent hover:border-ca-border hover:bg-ca-panel-2")
                }
              >
                <span
                  aria-hidden
                  className={
                    "grid h-7 w-7 shrink-0 place-items-center rounded-sm border transition " +
                    (active
                      ? "border-ca-select/50 bg-ca-select/10 text-ca-select"
                      : "border-ca-border bg-ca-panel-2 text-ca-ink-muted group-hover:text-ca-select")
                  }
                >
                  <Icon size={14} />
                </span>
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
