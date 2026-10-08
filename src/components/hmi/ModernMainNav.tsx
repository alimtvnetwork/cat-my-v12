import { Link, useRouterState } from "@tanstack/react-router";
import { useRunStore } from "@/lib/stores/run-store";
import { RunStatusType } from "@/types/run/RunStatus";

const NAV_LINKS: Array<{ to: string; label: string; exact?: boolean; activePrefix?: string }> = [
  { to: "/", label: "Home", exact: true },
  { to: "/projects", label: "Project", exact: false, activePrefix: "/projects" },
  { to: "/setup", label: "Setup", exact: false, activePrefix: "/setup" },
  { to: "/rules", label: "Rules", exact: false, activePrefix: "/rules" },
  { to: "/test", label: "Test", exact: false, activePrefix: "/test" },
  { to: "/run", label: "Run", exact: false, activePrefix: "/run" },
  { to: "/settings", label: "Settings", exact: false, activePrefix: "/settings" },
  { to: "/help", label: "Help", exact: false, activePrefix: "/help" },
];

export function ModernMainNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const running = useRunStore((s) => RunStatusType.isRunning(s.status));

  return (
    <nav className="flex items-center gap-1" aria-label="Main Navigation">
      {NAV_LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.to
          : pathname.startsWith(link.activePrefix || link.to);

        return (
          <Link
            key={link.to}
            to={link.to as any}
            className={`px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${
              active
                ? "bg-ca-primary/15 text-ca-primary"
                : "text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
