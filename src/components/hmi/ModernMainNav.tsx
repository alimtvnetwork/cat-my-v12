import { Link, useRouterState } from "@tanstack/react-router";
import { useRunStore } from "@/lib/stores/run-store";
import { RunStatusType } from "@/types/run/RunStatus";

const NAV_LINKS: Array<{ to: string; label: string; exact?: boolean; activePrefix?: string }> = [
  { to: "/", label: "Home", exact: true },
  { to: "/projects", label: "Project", exact: false, activePrefix: "/projects" },
  { to: "/analyze", label: "Analyze", exact: false, activePrefix: "/analyze" },
  { to: "/setup", label: "Setup", exact: false, activePrefix: "/setup" },
  { to: "/setup/rules", label: "Rules", exact: false, activePrefix: "/setup/rules" },
  { to: "/trial-run", label: "Test", exact: false, activePrefix: "/trial-run" },
  { to: "/run", label: "Run", exact: false, activePrefix: "/run" },
  { to: "/settings", label: "Settings", exact: false, activePrefix: "/settings" },
  { to: "/help", label: "Help", exact: false, activePrefix: "/help" },
];

export function ModernMainNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRunning = useRunStore((s) => RunStatusType.isRunning(s.status));

  return (
    <nav
      className="flex items-center gap-1 rounded-full border border-ca-border/80 bg-ca-panel/85 p-0.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_4px_16px_-4px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      aria-label="Main Navigation"
    >
      {NAV_LINKS.map((link) => {
        const isActive = link.exact
          ? pathname === link.to
          : pathname.startsWith(link.activePrefix || link.to);

        const isRunLink = link.to === "/run";

        return (
          <Link
            key={link.to}
            to={link.to as any}
            className={`relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all duration-150 ${
              isActive
                ? "border border-ca-primary/50 bg-ca-primary/15 text-ca-primary shadow-[0_0_12px_-2px_color-mix(in_oklab,var(--ca-primary)_35%,transparent),inset_0_1px_0_0_rgba(255,255,255,0.12)]"
                : "border border-transparent text-ca-ink-muted hover:border-ca-border/80 hover:bg-ca-panel-2 hover:text-ca-ink"
            }`}
          >
            {isRunLink && isRunning ? (
              <span className="relative flex h-2 w-2 items-center justify-center" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ca-ok opacity-75" />
                <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-ca-ok shadow-[0_0_8px_var(--ca-ok)]" />
              </span>
            ) : null}

            {isActive && !isRunLink ? (
              <span className="inline-block h-1 w-1 rounded-full bg-ca-primary shadow-[0_0_6px_var(--ca-primary)]" aria-hidden />
            ) : null}

            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
