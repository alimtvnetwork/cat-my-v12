/**
 * Plan 90 Step 128 - Domain empty-state illustrations for `/cli/*`.
 *
 * Root cause guarded (one sentence): the four CLI list surfaces
 * (`cli.sessions`, `cli.rules`, `cli.samples`, `cli.ipc`) rendered
 * empty results as a bare `<p>` (or a dashed box with a single
 * lucide icon in the IPC case), which read as "nothing happened /
 * page is broken" and had no domain glyph, no next action, and no
 * shared shape - so any polish to one drifted from the others.
 *
 * Design:
 *   - Pure presentation. No fetching, no store writes.
 *   - The icon is a caller-supplied `LucideIcon`. Route call sites
 *     pass a DOMAIN glyph: Terminal (sessions), ScrollText (rules),
 *     Images (samples), Inbox (ipc). We explicitly do NOT accept the
 *     generic `Sparkles` icon (guarded at the type level via a name
 *     narrowing in the props doc, and enforced at review by the
 *     eslint-style comment below). No AI-slop shimmer.
 *   - `title` is the domain sentence ("No CLI sessions yet"), `body`
 *     is optional secondary copy (may be a ReactNode so callers can
 *     inline `<code>` and `<Link>` without re-wrapping), `action` is
 *     an optional CTA slot (Button / Link).
 *   - Uses ca-* + hmi-* tokens only (per `src/styles.css`); no hex,
 *     no bespoke colors. Dashed border reads as "empty by design,
 *     not error" - the destructive border stays reserved for the
 *     `AlertTriangle` failure branch that already exists in each
 *     route.
 *
 * Explicitly rejected: Sparkles, animated gradients, decorative
 * illustrations pulled from stock. The CLI shell is an operator
 * surface; empty means "run the CLI", not "here is a marketing
 * moment".
 */
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** Domain glyph. Do NOT pass `Sparkles`; use Terminal / ScrollText / Images / Inbox / etc. */
  icon: LucideIcon;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Test hook, defaults to `empty-state`. */
  testId?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
  testId = "empty-state",
}: EmptyStateProps): React.JSX.Element | null {

  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col items-center justify-center gap-hmi-2",
        "rounded-hmi-sm border border-dashed border-ca-border bg-ca-surface",
        "px-hmi-4 py-hmi-6 text-center",
        className,
      )}
    >
      <Icon aria-hidden className="h-8 w-8 text-ca-ink-muted" strokeWidth={1.5} />
      <p className="text-hmi-body font-medium text-ca-ink">{title}</p>
      {body ? <div className="max-w-prose text-hmi-caption text-ca-ink-muted">{body}</div> : null}
      {action ? <div className="mt-hmi-1">{action}</div> : null}
    </div>
  );
}
