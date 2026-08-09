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
import { AppBreadcrumb } from "@/components/app-shell/AppBreadcrumb";
import { HistoryNav } from "@/components/app-shell/HistoryNav";
import { TopMenuBar } from "@/components/nav/TopMenuBar";
import { HeaderDensityToggle } from "@/components/hmi/HeaderDensityToggle";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { FlavorToggle } from "@/components/theme/FlavorToggle";
import { KeyboardModeIndicator } from "@/components/hmi/KeyboardModeIndicator";
import { AddressBar } from "@/components/shell/AddressBar";
import { Search as SearchIcon } from "lucide-react";

export function HeaderBrand() {
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-hmi-1 sm:gap-hmi-2">
      <Link
        to="/"
        aria-label="Home"
        title="Home"
        preload="intent"
        className="hmi-focus-ring group flex min-w-0 shrink items-center gap-hmi-2 rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-ca-select/50 active:bg-ca-select/70"
      >
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full bg-ca-ok transition-transform duration-200 group-hover:scale-110"
          style={{ boxShadow: "0 0 10px currentColor" }}
        />
        <span className="hidden min-w-0 truncate text-hmi-body font-semibold tracking-tight sm:inline">
          Control Automation
        </span>
        <span className="text-hmi-body font-semibold tracking-tight sm:hidden" aria-hidden>
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

export function HeaderCrumbs({ showBreadcrumb, program }: HeaderCrumbsProps) {
  if (showBreadcrumb) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-hmi-2">
        <AppBreadcrumb variant="inline" />
        <AddressBar />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-hmi-2">
      {program ? (
        <span className="block truncate text-hmi-caption font-semibold text-ca-ink-muted">
          {program}
        </span>
      ) : null}
      <AddressBar />
    </div>
  );
}

export interface HeaderActionsProps {
  right?: ReactNode;
}

export function HeaderActions({ right }: HeaderActionsProps) {
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
      <CommandPaletteTrigger />
      <TopMenuBar />
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
      className="hmi-focus-ring inline-flex h-7 items-center gap-2 rounded-full border border-ca-border bg-ca-panel/70 px-2.5 text-hmi-caption text-ca-ink-muted transition-colors hover:border-[color-mix(in_oklab,var(--ca-primary)_55%,var(--ca-border))] hover:bg-[color-mix(in_oklab,var(--ca-primary)_14%,var(--ca-panel))] hover:text-ca-chrome-ink"
    >
      <SearchIcon aria-hidden size={13} />
      <span className="hidden sm:inline">Search</span>
      <kbd className="ml-1 hidden rounded border border-ca-border/80 bg-ca-bg/60 px-1 py-[1px] text-[10px] font-mono text-ca-ink-muted sm:inline">
        {combo}
      </kbd>
    </button>
  );
}
