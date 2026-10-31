import React from "react";
import { Link } from "@tanstack/react-router";
import { Camera, Home, Info, LayoutDashboard, Settings, Sun, Target } from "lucide-react";

import { FlavorToggle } from "@/components/theme/FlavorToggle";
import { WindowMenu } from "@/components/app-shell/WindowMenu";
import { TopBarErrorButton } from "@/components/errors/TopBarErrorButton";

export interface StandardAppShellNavProps {
  className?: string;
  hasLogo?: boolean;
}

/**
 * StandardAppShellNav: Top-level navigation bar for CAT iVISION layout.
 * Hosts navigation routes, persistent TopBarErrorButton for runtime and Split-DB
 * error visibility, window controls, and theme toggles.
 */
export function StandardAppShellNav({
  className,
  hasLogo = true,
}: StandardAppShellNavProps): React.JSX.Element | null {
  return (
    <header
      className={`standard-app-shell-nav fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b-2 border-ca-border bg-ca-panel px-4 shadow-sm ${className ?? ""}`}
      data-testid="standard-app-shell-nav"
    >
      <div className="flex items-center gap-6">
        {hasLogo && (
          <div className="flex items-center gap-2 border-r border-ca-border/50 pr-6">
            <Target className="h-5 w-5 text-ca-chrome-ink" />
            <span className="font-bold text-ca-chrome-ink tracking-wide">VISION SYS</span>
          </div>
        )}

        <nav className="flex items-center gap-1" aria-label="Main Navigation">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink [&.active]:bg-ca-ink [&.active]:text-ca-bg"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>

          <Link
            to="/run"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink [&.active]:bg-ca-ink [&.active]:text-ca-bg"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Run</span>
          </Link>

          <Link
            to="/settings/camera"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink [&.active]:bg-ca-ink [&.active]:text-ca-bg"
          >
            <Camera className="h-4 w-4" />
            <span>Camera</span>
          </Link>

          <Link
            to="/settings/lighting"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink [&.active]:bg-ca-ink [&.active]:text-ca-bg"
          >
            <Sun className="h-4 w-4" />
            <span>Lighting</span>
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <TopBarErrorButton />
        <WindowMenu />
        <FlavorToggle />

        <Link
          to="/settings"
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink [&.active]:bg-ca-ink [&.active]:text-ca-bg"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>

        <button
          type="button"
          aria-label="Application information"
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ca-panel-2 text-ca-chrome-ink/70"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export default StandardAppShellNav;
