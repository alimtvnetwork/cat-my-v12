import React, { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  LayoutDashboard,
  Settings,
  Activity,
  AlertTriangle,
  FileSpreadsheet,
  Sparkles,
  Sliders,
  FolderOpen,
} from "lucide-react";
import { UiModeSwitch } from "@/components/ui-mode/UiModeSwitch";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { WindowMenu } from "@/components/app-shell/WindowMenu";

export interface StandardAppShellProps {
  title?: string;
  subtitle?: string;
  activeNav?:
    | "home"
    | "run"
    | "ops"
    | "setup"
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
    if (key === "run" && pathname.startsWith("/run")) return true;
    if (key === "ops" && pathname.startsWith("/ops")) return true;
    if (key === "setup" && pathname.startsWith("/setup")) return true;
    if (key === "diagnostics" && pathname.startsWith("/diagnostics")) return true;
    if (key === "errors" && pathname.startsWith("/errors")) return true;
    if (key === "results" && pathname.startsWith("/results")) return true;
    if (key === "projects" && pathname.startsWith("/projects")) return true;
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
      className="flex flex-col flex-1 min-h-screen bg-ca-bg text-ca-ink font-sans"
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
            <Link to="/run" className={navLinkClass(getNavActive("run"))}>
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Run</span>
            </Link>
            <Link to="/ops" className={navLinkClass(getNavActive("ops"))}>
              <Activity className="h-3.5 w-3.5" />
              <span>Ops</span>
            </Link>
            <Link to="/setup" className={navLinkClass(getNavActive("setup"))}>
              <Sliders className="h-3.5 w-3.5" />
              <span>Setup</span>
            </Link>
            <Link to="/diagnostics" className={navLinkClass(getNavActive("diagnostics"))}>
              <Sparkles className="h-3.5 w-3.5" />
              <span>Diagnostics</span>
            </Link>
            <Link to="/errors" className={navLinkClass(getNavActive("errors"))}>
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Errors</span>
            </Link>
            <Link to="/results" className={navLinkClass(getNavActive("results"))}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Results</span>
            </Link>
            <Link to="/projects" className={navLinkClass(getNavActive("projects"))}>
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Projects</span>
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
      <main className="flex flex-1 flex-col min-h-0 overflow-auto">{children}</main>
    </div>
  );
}
