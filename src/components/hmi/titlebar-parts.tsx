// Plan 87 step 4: internal Titlebar parts.
//
// Root cause this file addresses, in one sentence:
//   Titlebar.tsx was one 90-line JSX block, so Plan 87 steps 5 (chip
//   breadcrumbs), 6 (Ctrl+K trigger), and 24 (density toggle in user menu)
//   would each have to reach into the same monolith and risk breaking the
//   single-<header> invariant locked by issue 22.
//
// Design contract:
//   - No new <header> or <nav landmark> elements. Titlebar.tsx still owns
//     the single sticky <header data-app-shell="true">. Parts render into
//     it as three sibling <div>s so the DOM shape and CSS selectors that
//     tests/e2e/playwright_single_header.py locks stay unchanged.
//   - Parts are pure: props in, JSX out; no store subscriptions here so
//     Titlebar can decide when/how to re-render.

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { GlobalSitemapBar } from "@/components/sitemap/GlobalSitemapBar";
import { HistoryNav } from "@/components/app-shell/HistoryNav";
import { TopMenuBar } from "@/components/nav/TopMenuBar";
import { HeaderDensityToggle } from "@/components/hmi/HeaderDensityToggle";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { FlavorToggle } from "@/components/theme/FlavorToggle";
import { KeyboardModeIndicator } from "@/components/hmi/KeyboardModeIndicator";
import { AddressBar } from "@/components/shell/AddressBar";
import { Maximize2, Minimize2, Search as SearchIcon, X } from "lucide-react";
import { UiModeSwitch } from "@/components/ui-mode/UiModeSwitch";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";
import { ModernMainNav } from "@/components/hmi/ModernMainNav";

export function HeaderBrand(): React.JSX.Element | null {
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-hmi-1 sm:gap-hmi-2">
      <Link
        to="/"
        aria-label="Home"
        title="Home"
        preload="intent"
        className="hmi-focus-ring group relative flex min-w-0 shrink items-center gap-2.5 rounded-xl border border-ca-border/80 bg-ca-panel/85 px-3 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_8px_-2px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-200 hover:border-ca-primary/60 hover:bg-ca-panel-2 hover:shadow-[0_0_16px_-2px_color-mix(in_oklab,var(--ca-primary)_35%,transparent)]"
      >
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span
            aria-hidden
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ca-primary opacity-60 duration-1000"
          />
          <span
            aria-hidden
            className="relative inline-block h-2 w-2 rounded-full bg-ca-primary shadow-[0_0_10px_var(--ca-primary),0_0_3px_#fff]"
          />
        </span>
        <span className="hidden min-w-0 truncate text-hmi-body font-bold tracking-tight text-ca-ink sm:inline">
          Control Automation
        </span>
        <span className="text-hmi-body font-bold tracking-tight text-ca-ink sm:hidden" aria-hidden>
          CA
        </span>
      </Link>
      <HistoryNav />
    </div>
  );
}

export interface HeaderCrumbsProps {
  showBreadcrumb: boolean;
  program?: string;
}

export function HeaderCrumbs({
  showBreadcrumb,
  program,
}: HeaderCrumbsProps): React.JSX.Element | null {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 justify-between px-2">
      <div className="flex min-w-0 items-center gap-2">
        {showBreadcrumb ? <GlobalSitemapBar /> : null}
        <CommandPaletteTrigger />
      </div>
      <ModernMainNav />
    </div>
  );
}

export interface HeaderActionsProps {
  right?: ReactNode;
}

export function HeaderActions({ right }: HeaderActionsProps): React.JSX.Element | null {
  return (
    <div
      role="group"
      aria-label="Titlebar controls"
      data-testid="titlebar-right-cluster"
      className="flex shrink-0 items-center gap-1 px-2"
    >
      {/* Portal target: EditorTopBar merges its Save/Preview/Publish
          cluster into the titlebar via createPortal so the two chrome
          rows collapse into one. */}
      <div
        id="titlebar-editor-slot"
        data-testid="titlebar-editor-slot"
        className="flex min-w-0 items-center gap-1"
      />
      <TopMenuBar />
      <div className="flex items-center mx-1">
        <UiModeSwitch />
      </div>
      <FlavorToggle />
      <ThemeToggle />
      <HeaderDensityToggle />
      <KeyboardModeIndicator />
      {right}
      <WindowControls />
    </div>
  );
}

/**
 * Window controls for the browser shell (spec file 03 section 1.3, AI-01 open).
 *
 * As-built truth: this app runs in a browser launched with --app=<url>,
 * which strips OS window chrome. There is no Tauri/Electron shell and no
 * window-control IPC, so this component renders only what the web
 * platform can actually do - never a dead-button shim:
 *
 * - Full screen toggle: the Fullscreen API is the working maximize /
 *   restore equivalent in a browser. State tracks `fullscreenchange`,
 *   so API exits (including Esc) resync the icon.
 * - Close: `window.close()` first. Browsers ignore it for windows not
 *   opened by script (the launcher opens this window), so when the
 *   window is still alive a beat later, a dismissible hint says so and
 *   names the real close path (OS window control / tab close) instead
 *   of pretending the button worked.
 * - Minimize: deliberately absent. No web API can minimize a window;
 *   rendering a Minus button that does nothing would reproduce the
 *   reported defect with prettier chrome. When AI-01 picks a real shell,
 *   its IPC contract wires in here (spec section 13 allows a new
 *   shell-IPC module) and a real minimize button joins this cluster.
 *
 * Local React state only; no store subscriptions, so HeaderActions
 * stays a pure composition and only this leaf re-renders on state
 * change.
 */
function WindowControls(): React.JSX.Element {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    () => typeof document !== "undefined" && document.fullscreenElement !== null,
  );
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  useEffect(() => {
    const handleFullscreenChange = (): void => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {

    return () => {

      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleFullscreenToggle = (): void => {

    if (document.fullscreenElement !== null) {
      document.exitFullscreen().catch(() => {
        setHintMessage("Exit full screen was blocked by the browser.");
      });

      return;
    }

    document.documentElement.requestFullscreen().catch(() => {
      setHintMessage("Full screen was blocked by the browser.");
    });
  };

  const handleClose = (): void => {
    window.close();

    // A window the launcher opened is not script-closable, so close()
    // above is usually ignored. If this timer still fires, the window
    // survived: say so and name the real close path.
    closeTimerRef.current = window.setTimeout(() => {
      setHintMessage(
        isMac
          ? "Browser blocked close - use Cmd+W or the tab close button."
          : "Browser blocked close - use Alt+F4 or the tab close button.",
      );
    }, 300);
  };

  const handleDismissHint = (): void => {
    setHintMessage(null);
  };

  return (
    <div
      role="group"
      aria-label="Window controls"
      data-testid="window-controls"
      className="flex shrink-0 items-center gap-1"
    >
      <button
        type="button"
        data-testid="window-fullscreen-toggle"
        onClick={handleFullscreenToggle}
        title={isFullscreen ? "Exit full screen" : "Full screen"}
        aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
        className="hmi-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-ca-border/80 bg-ca-panel/85 text-ca-ink-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-200 hover:border-ca-primary/50 hover:bg-ca-panel-2 hover:text-ca-ink"
      >
        {isFullscreen ? (
          <Minimize2 aria-hidden size={14} />
        ) : (
          <Maximize2 aria-hidden size={14} />
        )}
      </button>
      <button
        type="button"
        data-testid="window-close"
        onClick={handleClose}
        title="Close window"
        aria-label="Close window"
        className="hmi-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-ca-border/80 bg-ca-panel/85 text-ca-ink-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-200 hover:border-ca-primary/50 hover:bg-ca-panel-2 hover:text-ca-ink"
      >
        <X aria-hidden size={14} />
      </button>
      {hintMessage !== null ? (
        <span
          data-testid="window-close-hint"
          className="inline-flex max-w-64 items-center gap-1 rounded-full border border-ca-border/80 bg-ca-panel px-2 py-1 text-hmi-caption text-ca-ink-muted"
        >
          <span className="truncate">{hintMessage}</span>
          <button
            type="button"
            onClick={handleDismissHint}
            title="Dismiss"
            aria-label="Dismiss window hint"
            className="hmi-focus-ring inline-flex shrink-0 items-center justify-center rounded-full hover:text-ca-ink"
          >
            <X aria-hidden size={12} />
          </button>
        </span>
      ) : null}
    </div>
  );
}

/**
 * Plan 87 Step 6: visible affordance for the global command palette.
 *
 * Root cause it fixes (one sentence): `CommandPalette` (registered at
 * `src/components/nav/CommandPalette.tsx:199-238`) is keyboard-only, so
 * users who don't know Ctrl+K cannot reach it.
 *
 * The button dispatches a `command-palette:toggle` window event; the
 * palette component listens for it and flips its internal `open` state.
 * This keeps `open` a single source of truth (no shared store, no
 * module-level ref) and stays reversible.
 */
function CommandPaletteTrigger() {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const combo = isMac ? "\u2318K" : "Ctrl K";

  return (
    <button
      type="button"
      data-testid="command-palette-trigger"
      onClick={() => window.dispatchEvent(new CustomEvent("command-palette:toggle"))}
      title="Command palette"
      aria-label="Open command palette"
      className="hmi-focus-ring group relative inline-flex h-7 items-center gap-2 rounded-full border border-ca-border/80 bg-ca-panel/85 px-3 text-hmi-caption text-ca-ink-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-200 hover:border-ca-primary/50 hover:bg-ca-panel-2 hover:text-ca-ink hover:shadow-[0_0_14px_-2px_color-mix(in_oklab,var(--ca-primary)_35%,transparent)]"
    >
      <SearchIcon aria-hidden size={13} className="text-ca-ink-muted transition-colors duration-200 group-hover:text-ca-primary" />
      <span className="hidden sm:inline font-medium tracking-tight">Search</span>
      <kbd className="ml-1 hidden rounded-md border border-ca-border/80 bg-ca-panel px-1.5 py-[0.5px] text-[10px] font-mono font-semibold text-ca-ink-muted shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-colors group-hover:border-ca-primary/40 group-hover:text-ca-primary sm:inline">
        {combo}
      </kbd>
    </button>
  );
}
