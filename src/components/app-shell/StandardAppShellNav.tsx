import { Link } from "@tanstack/react-router";
import { Settings, Home, Camera, Sun, Info, Target, LayoutDashboard } from "lucide-react";
import { FlavorToggle } from "../theme/FlavorToggle";
import { WindowMenu } from "./WindowMenu";

export function StandardAppShellNav() {
  return (
    <div
      className="standard-app-shell-nav fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b-2 border-ca-border bg-ca-panel px-4 shadow-sm"
      data-testid="standard-app-shell-nav"
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 border-r border-ca-border/50 pr-6">
          <Target className="h-5 w-5 text-blue-500" />
          <span className="font-bold text-ca-chrome-ink tracking-wide">VISION SYS</span>
        </div>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink [&.active]:bg-ca-panel-2 [&.active]:text-ca-chrome-ink"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            to="/run"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink [&.active]:bg-ca-panel-2 [&.active]:text-ca-chrome-ink"
          >
            <LayoutDashboard className="h-4 w-4" />
            Run
          </Link>
          <Link
            to="/settings/camera"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink [&.active]:bg-ca-panel-2 [&.active]:text-ca-chrome-ink"
          >
            <Camera className="h-4 w-4" />
            Camera
          </Link>
          <Link
            to="/settings/lighting"
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink [&.active]:bg-ca-panel-2 [&.active]:text-ca-chrome-ink"
          >
            <Sun className="h-4 w-4" />
            Lighting
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <WindowMenu />
        <FlavorToggle />
        <Link
          to="/settings"
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-ca-chrome-ink/70 hover:bg-ca-panel-2 hover:text-ca-chrome-ink [&.active]:bg-ca-panel-2 [&.active]:text-ca-chrome-ink"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ca-panel-2 text-ca-chrome-ink/70">
          <Info className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}