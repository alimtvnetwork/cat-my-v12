import type { ReactNode } from "react";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";
import { useHeaderMetrics } from "@/hooks/useHeaderMetrics";
import { SkipToContentLink } from "@/components/app-shell/SkipToContentLink";
import { HeaderBrand, HeaderCrumbs, HeaderActions } from "@/components/hmi/titlebar-parts";

export interface TitlebarProps {
  program?: string;
  right?: ReactNode;
  /**
   * When true, render the inline `AppBreadcrumb` on the left side of the
   * Titlebar (plan 65 SS-04). Callers pass `false` when a route already
   * renders its own breadcrumb.
   */
  showBreadcrumb?: boolean;
}

/**
 * Single `<header>` for the whole app (plan 65 SS-04 / issue 22).
 *
 * Plan 87 step 4: composition-only refactor. Titlebar owns the sticky
 * <header> and the top row grid; the three children (Brand, Crumbs,
 * Actions) live in `titlebar-parts.tsx` so subsequent steps (5, 6, 24)
 * can mutate one region without touching the other two.
 *
 * The DOM shape is preserved on purpose:
 *   header[data-app-shell="true"]
 *     > div[data-app-shell-row="top"]
 *       > HeaderBrand
 *       > HeaderCrumbs
 *       > HeaderActions
 *     > (optional) div[data-app-shell-row="breadcrumb"]  // < sm fallback
 *
 * `tests/e2e/playwright_single_header.py` locks the single-<header>
 * invariant; the mobile fallback strip below is still gated on
 * `program && !showBreadcrumb` exactly as before.
 */
export function Titlebar({ program, right, showBreadcrumb = true }: TitlebarProps): React.JSX.Element | null {
  const density = useUiPrefsStore((s) => s.headerDensity);
  const headerRef = useHeaderMetrics<HTMLElement>();

  return (
    <header
      ref={headerRef}
      data-app-shell="true"
      data-density={density}
      aria-label="Application"
      className="app-titlebar sticky top-0 z-40 flex flex-col border-b border-ca-border/80 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--ca-chrome)_92%,transparent),color-mix(in_oklab,var(--ca-chrome)_78%,transparent))] text-ca-chrome-ink font-hmi shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_1px_2px_-1px_rgba(0,0,0,0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--ca-chrome)_72%,transparent),color-mix(in_oklab,var(--ca-chrome)_58%,transparent))] transition-[height,padding,background-color] duration-200 ease-out"
    >
      <SkipToContentLink />
      <div
        data-app-shell-row="top"
        className="flex items-center gap-hmi-2 px-hmi-2 sm:px-hmi-3 transition-[height] duration-200 ease-out"
        style={{ height: "var(--header-h)" }}
      >
        <HeaderBrand />
        <HeaderCrumbs showBreadcrumb={showBreadcrumb} program={program} />
        <HeaderActions right={right} />
      </div>
      {program && !showBreadcrumb ? (
        <div
          data-app-shell-row="breadcrumb"
          className="flex min-w-0 items-center gap-hmi-2 border-t border-ca-border/60 bg-ca-bg/40 px-hmi-3 py-1 sm:hidden"
        >
          <span aria-hidden className="text-ca-ink-muted">
            /
          </span>
          <span className="min-w-0 truncate text-hmi-body text-ca-ink-muted">{program}</span>
        </div>
      ) : null}
    </header>
  );
}
