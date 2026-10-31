import React, { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Menu,
  X,
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
  Loader2,
  LogOut,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  WindowControlButtons,
  WINDOW_EXIT_REQUEST_EVENT,
} from "@/components/layout/WindowControlButtons";
import { VersionInfoModal } from "@/components/layout/VersionInfoModal";
import { APP_VERSION_INFO } from "@/lib/version-info";
import { GlobalSitemapBar } from "@/components/sitemap/GlobalSitemapBar";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";
import { RecorderLauncherButton } from "@/components/recorder/RecorderLauncherButton";
import {
  GUIDED_SIMULATION_COMMAND_EVENT,
  GUIDED_SIMULATION_MENU_EVENT,
  GUIDED_SIMULATION_STATE_EVENT,
  type GuidedSimulationCommandDetail,
  type GuidedSimulationMenuDetail,
  type GuidedSimulationStateDetail,
} from "@/components/guided-simulation/events";
import { cn } from "@/lib/utils";
import { useUiRemoteControl } from "@/hooks/useUiRemoteControl";

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

// Spec 55 menu work: opening the menu flips shell state, which re-renders
// the shell. The main content (heavy vision canvases, simulation player)
// is memoized on the children element identity, so a menu open does not
// re-render it — the route parent does not recreate the element on a
// shell state change, so the memo bail-out holds.
const ShellMainContent = memo(function ShellMainContent({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden hmi-cad-grid-bg">{children}</main>
  );
});

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
  const [isSimulationLoading, setIsSimulationLoading] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.guidedSimulationLoading === "true",
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const menuOpenStartRef = useRef<number | null>(null);

  useUiRemoteControl();

  useEffect(() => {
    const onSimulationState = (event: Event) => {
      const detail = (event as CustomEvent<GuidedSimulationStateDetail>).detail;
      setIsSimulationRunning(Boolean(detail?.isRunning));
      setIsSimulationLoading(Boolean(detail?.isLoading));

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
    if (!isMenuOpen) {
      return;
    }

    // Spec 55 menu instrumentation: the next "menu is slow" complaint
    // must come with a measured number. The start mark is set in
    // onOpenChange (the user-click path); this effect runs after the
    // open render, so the measure covers click → painted.
    const startMs = menuOpenStartRef.current;

    if (startMs !== null) {
      const openMs = performance.now() - startMs;
      performance.mark("cat-vision:menu-open-end");
      performance.measure(
        "cat-vision:menu-open",
        "cat-vision:menu-open-start",
        "cat-vision:menu-open-end",
      );
      console.debug(`[menu-timing] menu open took ${openMs.toFixed(1)}ms`);
      menuOpenStartRef.current = null;
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const onSimulationMenu = (event: Event) => {
      const detail = (event as CustomEvent<GuidedSimulationMenuDetail>).detail;
      setIsMenuOpen(Boolean(detail?.isOpen));
    };

    const onOpenVersionModal = () => {
      setIsVersionModalOpen(true);
    };

    window.addEventListener(GUIDED_SIMULATION_MENU_EVENT, onSimulationMenu);
    window.addEventListener("cat-vision:open-version-modal", onOpenVersionModal);

    return () => {
      window.removeEventListener(GUIDED_SIMULATION_MENU_EVENT, onSimulationMenu);
      window.removeEventListener("cat-vision:open-version-modal", onOpenVersionModal);
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
          {/* Brand — CAT logo mark is home-page only, but the version
              badge shows on EVERY route (spec 55: /run and all tool
              pages previously showed no version anywhere). */}
          <div className="flex items-center gap-1.5 shrink-0">
            {pathname === "/" ? (
              <Link
                to="/"
                title="CAT iVISION Home"
                className="group flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 hover:border-cyan-400/40 hover:bg-white/[0.08] transition-all cursor-pointer select-none shrink-0"
              >
                <img src="/cat-logo.svg" alt="CAT" className="h-6 w-auto" draggable={false} />
                <span className="hidden sm:inline text-xs font-bold tracking-tight text-white">
                  Cat Vision, Cat I Vision
                </span>
              </Link>
            ) : null}

            <button
              type="button"
              data-testid="version-badge-button"
              onClick={() => setIsVersionModalOpen(true)}
              title={`Released ${APP_VERSION_INFO.releaseDate} — Click for release details`}
              className="flex cursor-pointer items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-white active:scale-95 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
            >
              <span>{APP_VERSION_INFO.version}</span>
            </button>
          </div>

          {/* Dropdown Menu Trigger */}
          <DropdownMenu
            modal={false}
            open={isMenuOpen}
            onOpenChange={(isOpen) => {
              if (isOpen) {
                menuOpenStartRef.current = performance.now();
                performance.mark("cat-vision:menu-open-start");
              }

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
                aria-expanded={isMenuOpen}
                className="group flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] hover:border-cyan-400/40 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-200 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 cursor-pointer select-none"
              >
                <Menu className="h-3.5 w-3.5 text-cyan-400 transition-colors group-hover:text-cyan-300" />
                <span>Menu</span>
                <ChevronDown className="h-3 w-3 text-slate-400 opacity-70 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              collisionPadding={16}
              onPointerDownOutside={(e) => {
                if (isSimulationRunning && pathname === "/") {
                  e.preventDefault();

                  return;
                }

                setIsMenuOpen(false);
              }}
              onEscapeKeyDown={() => {
                if (isSimulationRunning && pathname === "/") {
                  return;
                }

                setIsMenuOpen(false);
              }}
              className="w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-white/15 bg-[#0c1017]/95 p-1.5 shadow-2xl z-50 text-slate-200"
            >
              <DropdownMenuLabel className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">Navigation</span>
                <span className="shrink-0 text-[9px] text-cyan-400/80 font-mono">Workflows</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  title="Close menu"
                  onClick={() => {
                    if (isSimulationRunning && pathname === "/") {
                      return;
                    }

                    setIsMenuOpen(false);
                  }}
                  className="flex shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] p-1 text-slate-300 transition hover:border-cyan-400/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
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
                        onClick={() => {
                          setIsMenuOpen(false);

                          if (isSimulationProjectTarget) {
                            const detail: GuidedSimulationCommandDetail = { command: "advance" };
                            window.dispatchEvent(
                              new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail }),
                            );
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors outline-none border border-transparent",
                          isCurrentActive
                            ? "bg-cyan-500/20 text-cyan-200 font-semibold border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                            : "text-slate-300 hover:bg-white/10 hover:text-white",
                          isSimulationProjectTarget &&
                            "border-amber-300 bg-amber-400/20 text-amber-100 ring-2 ring-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.45)] animate-pulse",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ItemIcon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isCurrentActive ? "text-cyan-300" : "text-slate-400",
                            )}
                          />
                          <span className="min-w-0 truncate">{item.label}</span>
                        </div>
                        {isCurrentActive && (
                          <span className="flex shrink-0 items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-700/60 font-semibold">
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
                          "flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors outline-none border border-transparent",
                          isCurrentActive
                            ? "bg-cyan-500/20 text-cyan-200 font-semibold border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
                            : "text-slate-300 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ItemIcon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isCurrentActive ? "text-cyan-300" : "text-slate-400",
                            )}
                          />
                          <span className="min-w-0 truncate">{item.label}</span>
                        </div>
                        {isCurrentActive && (
                          <span className="flex shrink-0 items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-700/60 font-semibold">
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
              <DropdownMenuItem
                onClick={() => {
                  setIsMenuOpen(false);
                  // Single exit path (spec 54 section 8): the confirm dialog
                  // and shutdown flow live only in WindowControlButtons.
                  window.dispatchEvent(new CustomEvent(WINDOW_EXIT_REQUEST_EVENT));
                }}
                className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs font-medium rounded-md cursor-pointer text-rose-300 hover:bg-rose-500/20 hover:text-rose-100 transition-colors outline-none"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <LogOut className="h-3.5 w-3.5 text-rose-400" />
                  <span>Exit Application</span>
                </div>

                <span className="text-[9px] font-mono uppercase tracking-wider text-rose-400/80 bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-700/60 font-semibold">
                  Alt+F4
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Upper Bar Concise Sitemap */}
          <div className="hidden lg:flex items-center ml-2 min-w-0 flex-nowrap overflow-hidden">
            <GlobalSitemapBar />
          </div>
        </div>

        <div className="flex h-full items-center gap-2 sm:gap-3 shrink-0 ml-2 flex-nowrap overflow-hidden">
          <UiModeSwitch />
          <RecorderLauncherButton />
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  data-tour="simulation-launcher"
                  aria-label={
                    isSimulationLoading
                      ? "Simulation is loading. The guided walkthrough is preparing the demo project."
                      : isSimulationRunning
                        ? "Simulation is running. The guided walkthrough is in progress."
                        : "Start the guided simulation. It walks through a demo project, a ruleset, and a greyscale pattern."
                  }
                  onClick={() => {
                    if (isSimulationRunning || isSimulationLoading) {
                      return;
                    }

                    setIsMenuOpen(false);
                    const detail: GuidedSimulationCommandDetail = { command: "start" };
                    window.dispatchEvent(
                      new CustomEvent(GUIDED_SIMULATION_COMMAND_EVENT, { detail }),
                    );
                  }}
                  disabled={isSimulationRunning || isSimulationLoading}
                  className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSimulationLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300" />
                  ) : (
                    <PlayCircle className="h-3.5 w-3.5" />
                  )}
                  <span>Simulation</span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                align="end"
                collisionPadding={12}
                className="max-w-[240px] border border-white/15 bg-[#0f172a] px-3 py-2 text-left text-xs leading-snug text-slate-100"
              >
                {isSimulationLoading
                  ? "Simulation is loading. The guided walkthrough is preparing the demo project."
                  : isSimulationRunning
                    ? "Simulation is running. The guided walkthrough is in progress."
                    : "Start the guided simulation. It walks through a demo project, a ruleset, and a greyscale pattern."}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="h-4 w-px bg-ca-border" />
          <ThemeToggle />
          <WindowControlButtons />
        </div>
      </header>

      <VersionInfoModal isOpen={isVersionModalOpen} onClose={() => setIsVersionModalOpen(false)} />

      {/* Action Strip (Rendered only when actions are supplied) */}
      {actions && (
        <div className="flex flex-wrap items-center justify-end gap-3 border-b border-ca-border/40 bg-ca-panel-2/40 px-4 py-1.5 shrink-0">
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        </div>
      )}

      {/* Main Content Area — memoized so a menu open does not re-render
          heavy vision canvases (see ShellMainContent above). */}
      <ShellMainContent>{children}</ShellMainContent>
    </div>
  );
}
