import React, { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  FolderKanban,
  Play,
  Settings,
  Sliders,
  TestTube2,
  Wrench,
} from "lucide-react";
import { UiModeSwitch } from "@/components/ui-mode/UiModeSwitch";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { WindowMenu } from "@/components/app-shell/WindowMenu";

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

export function StandardAppShell({
  title,
  subtitle,
  activeNav,
  actions,
  children,
}: StandardAppShellProps): React.JSX.Element {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const getNavActive = (key: string) => {
    if (activeNav) return activeNav === key;
    if (key === "home" && pathname === "/") return true;
    if (key === "projects" && pathname.startsWith("/projects")) return true;
    if (key === "setup" && pathname.startsWith("/setup") && !pathname.startsWith("/setup/rules")) return true;
    if (key === "rules" && pathname.startsWith("/setup/rules")) return true;
    if (key === "test" && (pathname.startsWith("/trial-run") || pathname.startsWith("/ai-testing"))) return true;
    if (key === "run" && pathname.startsWith("/run")) return true;
    if (key === "settings" && pathname.startsWith("/settings")) return true;
    return false;
  };

  const navLinkClass = (isActive: boolean) =>
    `flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded transition-colors whitespace-nowrap shrink-0 ${
      isActive
        ? "bg-ca-ink text-ca-bg shadow-sm"
        : "text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ca-border"
    }`;

  return (
    <div
      data-app-shell="true"
      data-standard-shell="true"
      data-testid="standard-app-shell"
      className="flex h-screen min-h-0 flex-col overflow-hidden bg-ca-bg text-ca-ink font-sans"
    >
      {/* Industrial Top HMI Header */}
      <header className="flex h-11 items-center justify-between border-b border-ca-border bg-ca-panel px-3 shrink-0 select-none z-30 min-w-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 border-r border-ca-border pr-3 sm:pr-4 shrink-0">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-wider text-ca-ink whitespace-nowrap">
              CAT iVision HMI
            </span>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto min-w-0 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <Link to="/" className={navLinkClass(getNavActive("home"))}>
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <Link to="/projects" className={navLinkClass(getNavActive("projects"))}>
              <FolderKanban className="h-3.5 w-3.5" />
              <span>Project</span>
            </Link>
            <Link to="/setup" className={navLinkClass(getNavActive("setup"))}>
              <Wrench className="h-3.5 w-3.5" />
              <span>Setup</span>
            </Link>
            <Link to="/setup/rules" className={navLinkClass(getNavActive("rules"))}>
              <Sliders className="h-3.5 w-3.5" />
              <span>Rules</span>
            </Link>
            <Link to="/trial-run" className={navLinkClass(getNavActive("test"))}>
              <TestTube2 className="h-3.5 w-3.5" />
              <span>Test</span>
            </Link>
            <Link to="/run" className={navLinkClass(getNavActive("run"))}>
              <Play className="h-3.5 w-3.5" />
              <span>Run</span>
            </Link>
            <Link to="/settings" className={navLinkClass(getNavActive("settings"))}>
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
          <UiModeSwitch />
          <div className="h-4 w-px bg-ca-border" />
          <ThemeToggle />
          <WindowMenu />
        </div>
      </header>

      {/* Optional Breadcrumb / Page Header Bar */}
      {(title || subtitle || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ca-border bg-ca-panel-2 px-4 py-2 shrink-0">
          <div className="min-w-0">
            {title && (
              <h1 className="text-sm font-bold tracking-wide text-ca-ink uppercase">{title}</h1>
            )}
            {subtitle && <p className="text-xs text-ca-ink-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
