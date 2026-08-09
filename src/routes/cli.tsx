/**
 * Route: `/cli` - layout shell for the CLI operator surface.
 *
 * Plan 90 Step 134: responsive breakpoints. The `md:` breakpoint (>=768px)
 * splits the two navigation modes:
 *   - `< md`: persistent sidebar is hidden; a top nav bar exposes a
 *     `Sheet`-based drawer trigger. Route changes auto-close the drawer.
 *   - `>= md`: original fixed 14rem sidebar shell (Steps 106..133).
 *
 * Tables in `cli.sessions`, `cli.rules`, and the `cli.ipc` inbox drop
 * secondary columns via `hidden md:table-cell` at the same breakpoint so
 * the primary identifier + status stay readable on 375px phones.
 *
 * `robots: noindex`: internal operator screen.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Radio,
  ScrollText,
  Inbox,
  ListChecks,
  Images,
  SlidersHorizontal,
  Menu,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { CliRouteNotFound } from "@/components/cli/CliRouteNotFound";

export const Route = createFileRoute("/cli")({
  head: () => ({
    meta: [
      { title: "CLI Operator Console" },
      {
        name: "description",
        content:
          "Operator console for worker-cli and processing-cli: sessions, live logs, IPC inbox, rules, samples, and settings.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "CLI Operator Console" },
      {
        property: "og:description",
        content:
          "Sidebar-tabbed shell for CLI runs: sessions, live logs, IPC inbox, rules, samples, and settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CliLayout,
  notFoundComponent: () => (
    <CliRouteNotFound
      title="CLI page not found"
      body="This /cli/* path does not match any known operator surface. Pick a tab from the sidebar - sessions, logs, IPC, rules, samples, or settings."
    />
  ),
});

interface TabDef {
  key: string;
  label: string;
  Icon: typeof Radio;
  futurePath: `/cli/${string}`;
  live?: boolean;
  step: number;
}

const TABS: readonly TabDef[] = [
  {
    key: "sessions",
    label: "Sessions",
    Icon: Radio,
    futurePath: "/cli/sessions",
    live: true,
    step: 107,
  },
  { key: "live-log", label: "Live Log", Icon: ScrollText, futurePath: "/cli/live-log", step: 109 },
  { key: "ipc", label: "IPC Inbox", Icon: Inbox, futurePath: "/cli/ipc", step: 112 },
  {
    key: "rules",
    label: "Rules",
    Icon: ListChecks,
    futurePath: "/cli/rules",
    live: true,
    step: 115,
  },
  {
    key: "samples",
    label: "Samples",
    Icon: Images,
    futurePath: "/cli/samples",
    live: true,
    step: 118,
  },
  {
    key: "settings",
    label: "Settings",
    Icon: SlidersHorizontal,
    futurePath: "/cli/settings",
    live: true,
    step: 120,
  },
] as const;

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-hmi-1" role="tablist" aria-orientation="vertical">
      {TABS.map((tab) => {
        const isActive = pathname === tab.futurePath || pathname.startsWith(`${tab.futurePath}/`);
        const Icon = tab.Icon;
        const baseClass = cn(
          "inline-flex items-center gap-hmi-2 min-h-11 rounded-hmi-sm px-hmi-3 py-hmi-2 text-hmi-body text-left",
          "border border-transparent",
          isActive
            ? "bg-ca-accent-soft text-ca-accent border-ca-accent"
            : "text-ca-ink hover:bg-ca-surface-alt hover:border-ca-border",
        );

        if (tab.live) {
          return (
            <Link
              key={tab.key}
              to={tab.futurePath as any}
              role="tab"
              aria-selected={isActive}
              className={baseClass}
              onClick={onNavigate}
            >
              <Icon aria-hidden className="size-4" />
              <span className="flex-1">{tab.label}</span>
            </Link>
          );
        }

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={false}
            aria-disabled
            disabled
            title={`Lands in Plan 90 Step ${tab.step} at ${tab.futurePath}`}
            className={cn(baseClass, "cursor-not-allowed opacity-60")}
          >
            <Icon aria-hidden className="size-4" />
            <span className="flex-1">{tab.label}</span>
            <span className="text-hmi-caption text-ca-ink-muted">S{tab.step}</span>
          </button>
        );
      })}
    </nav>
  );
}

function CliLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-close mobile drawer on route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const activeLabel =
    TABS.find((t) => pathname === t.futurePath || pathname.startsWith(`${t.futurePath}/`))?.label ??
    "CLI Console";

  return (
    <div className="flex min-h-[calc(100dvh-var(--hmi-header-height,4rem))] w-full flex-col md:flex-row">
      {/* Mobile top nav (< md) */}
      <div className="flex items-center justify-between gap-hmi-2 border-b border-ca-border bg-ca-surface px-hmi-3 py-hmi-2 md:hidden">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-hmi-sm border border-ca-border bg-ca-surface-alt text-ca-ink hover:bg-ca-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-focus"
            aria-label="Open CLI navigation"
          >
            <Menu aria-hidden className="size-5" />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 border-r border-ca-border bg-ca-surface p-hmi-2"
          >
            <SheetTitle className="px-hmi-2 pb-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              CLI Console
            </SheetTitle>
            <NavList pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="truncate text-hmi-body font-medium text-ca-ink" aria-live="polite">
          {activeLabel}
        </span>
        <span aria-hidden className="min-w-11" />
      </div>

      {/* Desktop sidebar (>= md) */}
      <aside
        aria-label="CLI navigation"
        className="hidden shrink-0 flex-col gap-hmi-1 border-r border-ca-border bg-ca-surface p-hmi-2 md:flex md:w-56"
      >
        <div className="px-hmi-2 pb-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
          CLI Console
        </div>
        <NavList pathname={pathname} />
      </aside>

      <main className="min-w-0 flex-1 p-hmi-3 md:p-hmi-4">
        <Outlet />
      </main>
    </div>
  );
}
