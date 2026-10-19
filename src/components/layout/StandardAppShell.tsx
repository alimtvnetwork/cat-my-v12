import React, { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Menu,
  ChevronDown,
  Home,
  FolderKanban,
  Play,
  PlayCircle,
  Settings,
  Sliders,
  TestTube2,
  Wrench,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UiModeSwitch } from "@/components/ui-mode/UiModeSwitch";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
// import { WindowMenu } from "@/components/app-shell/WindowMenu";
import { GlobalSitemapBar } from "@/components/sitemap/GlobalSitemapBar";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";
import {
  GUIDED_SIMULATION_COMMAND_EVENT,
  GUIDED_SIMULATION_MENU_EVENT,
  GUIDED_SIMULATION_STATE_EVENT,
  type GuidedSimulationCommandDetail,
  type GuidedSimulationMenuDetail,
  type GuidedSimulationStateDetail,
} from "@/components/guided-simulation/events";
import { cn } from "@/lib/utils";

export interface StandardAppShellProps {
  title?: string;
  subtitle?: string;
  activeNav?:
    | "home"
    | "analyze"
    | "run"
    | "ops"
    | "setup"
    | "rules"
    | "test"
    | "diagnostics"
    | "errors"
    | "results"
    | "projects"
    | "settings";
  actions?: ReactNode;
  children: ReactNode;
}

interface NavigationItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tour?: string;
}

const CORE_NAV_ITEMS: NavigationItem[] = [
  { key: "home", label: "Home", href: "/", icon: Home },
  {
    key: "projects",
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    tour: "standard-project-nav",
  },
  { key: "analyze", label: "Analyzer", href: "/analyze", icon: Zap },
  { key: "setup", label: "Setup", href: "/setup", icon: Wrench },
  { key: "rules", label: "Rules", href: "/setup/rules", icon: Sliders },
  { key: "test", label: "Test", href: "/trial-run", icon: TestTube2 },
  { key: "run", label: "Run", href: "/run", icon: Play },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings },
];

const AUX_NAV_ITEMS: NavigationItem[] = [
  { key: "diagnostics", label: "Diagnostics", href: "/diagnostics", icon: Activity },
  { key: "results", label: "Results", href: "/results", icon: CheckCircle2 },
  { key: "errors", label: "Errors", href: "/errors", icon: AlertTriangle },
  { key: "ops", label: "Operations", href: "/ops", icon: Layers },
];

export function StandardAppShell({
  title,
  subtitle,
  activeNav,
  actions,
  children,
}: StandardAppShellProps): React.JSX.Element {
  const density = useUiPrefsStore((s) => s.headerDensity);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isSimulationRunning, setIsSimulationRunning] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.guidedSimulationRunning === "true",
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onSimulationState = (event: Event) => {
      const detail = (event as CustomEvent<GuidedSimulationStateDetail>).detail;
      setIsSimulationRunning(Boolean(detail?.isRunning));

      if (detail?.isRunning && window.location.pathname === "/") {
        setIsMenuOpen(true);
      }
    };

    window.addEventListener(GUIDED_SIMULATION_STATE_EVENT, onSimulationState);

    return () => {
      window.removeEventListener(GUIDED_SIMULATION_STATE_EVENT, onSimulationState);
    };
  }, []);

  useEffect(() => {
    const onSimulationMenu = (event: Event) => {
      const detail = (event as CustomEvent<GuidedSimulationMenuDetail>).detail;
      setIsMenuOpen(Boolean(detail?.isOpen));
    };

    window.addEventListener(GUIDED_SIMULATION_MENU_EVENT, onSimulationMenu);

    return () => {
      window.removeEventListener(GUIDED_SIMULATION_MENU_EVENT, onSimulationMenu);
    };
  }, []);

  const getNavActive = (key: string) => {
    if (activeNav) {
      return activeNav === key;
    }

    if (key === "home" && pathname === "/") {
      return true;
    }

    if (key === "projects" && pathname.startsWith("/projects")) {
      return true;
    }

    if (key === "analyze" && pathname.startsWith("/analyze")) {
      return true;
    }

    if (key === "setup" && pathname.startsWith("/setup") && !pathname.startsWith("/setup/rules")) {
      return true;
    }

    if (key === "rules" && pathname.startsWith("/setup/rules")) {
      return true;
    }

    if (
      key === "test" &&
      (pathname.startsWith("/trial-run") || pathname.startsWith("/ai-testing"))
    ) {
      return true;
    }

    if (key === "run" && pathname.startsWith("/run")) {
      return true;
    }

    if (key === "settings" && pathname.startsWith("/settings")) {
      return true;
    }

    if (key === "diagnostics" && pathname.startsWith("/diagnostics")) {
      return true;
    }

    if (key === "results" && pathname.startsWith("/results")) {
      return true;
    }

    if (key === "errors" && pathname.startsWith("/errors")) {
      return true;
    }

    if (key === "ops" && pathname.startsWith("/ops")) {
      return true;
    }

    return false;
  };

  return (
    <div
      data-standard-shell="true"
      data-testid="standard-app-shell"
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-ca-bg text-ca-ink font-sans"
    >
      {/* Industrial Top HMI Header */}
      <header
        data-app-shell="true"
        data-density={density}
        className={cn(
          "flex items-center justify-between border-b border-white/[0.08] bg-[#0c0f17]/95 px-3 sm:px-4 shrink-0 select-none z-30 min-w-0 shadow-sm backdrop-blur-xl flex-nowrap overflow-hidden",
          density === "compact"
            ? "h-[33px] min-h-[33px] max-h-[33px]"
            : "h-[41px] min-h-[41px] max-h-[41px]",
        )}
        style={{
          height: density === "compact" ? "var(--header-h, 32px)" : "var(--header-h, 40px)",
          maxHeight: density === "compact" ? "var(--header-h, 32px)" : "var(--header-h, 40px)",
        }}
      >
        <div
          data-app-shell-row="top"
          className="flex h-full items-center gap-2 sm:gap-2.5 min-w-0 flex-nowrap overflow-hidden"
          style={{
            height: density === "compact" ? "var(--header-h, 32px)" : "var(--header-h, 40px)",
            maxHeight: density === "compact" ? "var(--header-h, 32px)" : "var(--header-h, 40px)",
          }}
        >
          {/* Brand Wordmark (home page only) */}
          {pathname === "/" ? (
            <Link
              to="/"
              title="Control Automation Home"
              className="group flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-bold tracking-tight text-white hover:border-cyan-400/40 hover:bg-white/[0.08] transition-all cursor-pointer select-none shrink-0"
            >
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              <span className="hidden sm:inline">Control Automation</span>
              <span className="sm:hidden font-mono text-[10px]">CA</span>
            </Link>
          ) : null}

          {/* Dropdown Menu Trigger */}
          <DropdownMenu
            open={isMenuOpen}
            onOpenChange={(isOpen) => {
              if (!isOpen && isSimulationRunning && pathname === "/") {
                return;
              }

              setIsMenuOpen(isOpen);
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-tour="standard-menu-trigger"
                className="group flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] hover:border-cyan-400/40 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-200 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 cursor-pointer select-none"
              >
                <Menu className="h-3.5 w-3.5 text-cyan-400 transition-transform group-hover:scale-110" />
                <span>Menu</span>
                <ChevronDown className="h-3 w-3 text-slate-400 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="w-56 rounded-lg border border-white/15 bg-[#0c1017]/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 text-slate-200"
            >
              <DropdownMenuLabel className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center justify-between">
                <span>Navigation</span>
                <span className="text-[9px] text-cyan-400/80 font-mono">Workflows</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-white/10" />

              <div className="flex flex-col gap-0.5">
                {CORE_NAV_ITEMS.map((item) => {
                  const isCurrentActive = getNavActive(item.key);
                  const isSimulationProjectTarget =
                    isSimulationRunning && pathname === "/" && item.key === "projects";
                  const ItemIcon = item.icon;

                  return (
                    <DropdownMenuItem asChild key={item.key}>
                      <Link
                        to={item.href}
                        data-tour={item.tour}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors outline-none",
                          isCurrentActive
                            ? "bg-cyan-500/20 text-cyan-200 font-semibold border border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                            : "text-slate-300 hover:bg-white/10 hover:text-white",
                          isSimulationProjectTarget &&
                            "border border-amber-300 bg-amber-400/20 text-amber-100 ring-2 ring-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.45)] animate-pulse",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <ItemIcon
                            className={cn(
                              "h-3.5 w-3.5",
                              isCurrentActive ? "text-cyan-300" : "text-slate-400",
                            )}
                          />
                          <span>{item.label}</span>
                        </div>
                        {isCurrentActive && (
                          <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-700/60 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            Active
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </div>

              <DropdownMenuSeparator className="my-1 bg-white/10" />
              <DropdownMenuLabel className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-400">
                System & Logs
              </DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                {AUX_NAV_ITEMS.map((item) => {
                  const isCurrentActive = getNavActive(item.key);
                  const ItemIcon = item.icon;

                  return (
                    <DropdownMenuItem asChild key={item.key}>
                      <Link
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors outline-none",
                          isCurrentActive
                            ? "bg-cyan-500/20 text-cyan-200 font-semibold border border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                            : "text-slate-300 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <ItemIcon
                            className={cn(
                              "h-3.5 w-3.5",
                              isCurrentActive ? "text-cyan-300" : "text-slate-400",
                            )}
                          />
                          <span>{item.label}</span>
                        </div>
                        {isCurrentActive && (
                          <span className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-700/60 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            Active
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Upper Bar Concise Sitemap */}
          <div className="hidden lg:flex items-center ml-2 min-w-0 flex-nowrap overflow-hidden">
            <GlobalSitemapBar />
          </div>
        </div>

        <div className="flex h-full items-center gap-2 sm:gap-3 shrink-0 ml-2 flex-nowrap overflow-hidden">
          <UiModeSwitch />
          <button
            type="button"
            data-tour="simulation-launcher"
            onClick={() => {
              if (isSimulationRunning) {
                return;
              }

              setIsMenuOpen(false);
              const detail: GuidedSimulationCommandDetail = { command: "start" };
              window.dispatchEvent(new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail }));
            }}
            disabled={isSimulationRunning}
            className="flex shrink-0 items-center gap-1.5 rounded px-2.5 sm:px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            <span>{isSimulationRunning ? "Simulation Running" : "Simulation"}</span>
          </button>
          <div className="h-4 w-px bg-ca-border" />
          <ThemeToggle />
          {/* WindowMenu commented out per user request; uncomment below to restore: */}
          {/* <WindowMenu /> */}
        </div>
      </header>

      {/* Action Strip (Rendered only when actions are supplied) */}
      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-b border-ca-border/40 bg-ca-panel-2/40 px-4 py-1.5 shrink-0">
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden hmi-cad-grid-bg">
        {children}
      </main>
    </div>
  );
}
