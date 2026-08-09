import { RunStatusType } from "@/types/run/RunStatus";
import { Link, useRouterState } from "@tanstack/react-router";
import { useRunStore } from "@/lib/run-store";

const LINKS = [
  { to: "/setup", label: "Setup", lockDuringRun: true },
  { to: "/setup/roi", label: "ROI", lockDuringRun: true },
  { to: "/setup/reference", label: "Reference", lockDuringRun: true },
  { to: "/settings/camera", label: "Camera", lockDuringRun: true },
  { to: "/settings/trigger", label: "Trigger", lockDuringRun: true },
  { to: "/settings/lighting", label: "Lighting", lockDuringRun: true },
  { to: "/run", label: "Run", lockDuringRun: false },
  { to: "/results", label: "Results", lockDuringRun: false },
  { to: "/errors", label: "NG", lockDuringRun: false },
] as const;

export function GlobalNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const running = useRunStore((s) => RunStatusType.isRunning(s.status));

  return (
    <nav
      className="flex items-center gap-0.5 rounded-md bg-ca-panel/60 p-0.5 text-hmi-body"
      aria-label="Primary"
    >
      {LINKS.map((l) => {
        const active = pathname === l.to;
        const locked = running && l.lockDuringRun && !active;
        const base = "px-hmi-3 py-1 rounded transition-colors text-[0.75rem] font-medium";

        if (locked) {
          return (
            <span
              key={l.to}
              aria-disabled="true"
              title="Locked while running"
              className={`${base} text-ca-chrome-ink/25 cursor-not-allowed`}
            >
              {l.label}
            </span>
          );
        }

        return (
          <Link
            key={l.to}
            to={l.to}
            className={`${base} ${
              active
                ? "bg-ca-primary/15 text-ca-primary"
                : "text-ca-chrome-ink/70 hover:text-ca-chrome-ink hover:bg-ca-panel-2"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      {running && (
        <span className="ml-hmi-2 flex items-center gap-1.5 rounded-full bg-ca-ok/15 px-hmi-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-ca-ok">
          <span className="h-1.5 w-1.5 rounded-full bg-ca-ok animate-pulse" />
          Live
        </span>
      )}
    </nav>
  );
}
