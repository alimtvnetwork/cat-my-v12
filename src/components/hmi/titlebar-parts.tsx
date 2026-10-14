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

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppBreadcrumb, AppBreadcrumbPropsVariantType } from "@/components/app-shell/AppBreadcrumb";
import { HistoryNav } from "@/components/app-shell/HistoryNav";
import { TopMenuBar } from "@/components/nav/TopMenuBar";
import { HeaderDensityToggle } from "@/components/hmi/HeaderDensityToggle";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { FlavorToggle } from "@/components/theme/FlavorToggle";
import { KeyboardModeIndicator } from "@/components/hmi/KeyboardModeIndicator";
import { AddressBar } from "@/components/shell/AddressBar";
import { Search as SearchIcon } from "lucide-react";
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
    <div className="flex min-w-0 flex-1 items-center gap-4 justify-between px-2">
      <div className="flex items-center gap-4">
        {showBreadcrumb && <AppBreadcrumb variant={AppBreadcrumbPropsVariantType.Inline} />}
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
