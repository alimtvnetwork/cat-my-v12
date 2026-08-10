
export enum EmptyStateActionVariantType {
  Primary = "primary",
  Secondary = "secondary",
}
// Plan 81 step 17. Unified empty-state primitive.
//
// Root cause it addresses: every list surface (rules, projects, settings
// subsections) rolled its own centred-text empty message with slightly
// different padding, muted-colour tokens, and CTA affordances. That
// drift makes each screen feel bespoke and makes a11y patches N-shaped
// instead of 1-shaped. This component is the single seam.
//
// Purely presentational: no facade reads, no persistence, SSR-safe. The
// CTA is optional; if omitted the block renders as an icon + title + body.
// Consumers pass a lucide `icon` (already used across the app) so we do
// not bring a new icon dependency into the shared layer.

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  testId?: string;
  variant?: EmptyStateActionVariantType;
}

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: readonly EmptyStateAction[];
  className?: string;
  testId?: string;
  // Compact variant: tighter padding, smaller title and icon, no vertical
  // stretch. Use inside cards or sub-sections so the empty block does not
  // dominate the viewport. Full variant remains the route-level default.
  compact?: boolean;
  // Plan 87 step 18. Optional decorative SVG rendered above the icon on
  // the non-compact variant. Purely presentational; the accessible label
  // is still title + description. Compact variant ignores this to keep
  // in-card empty blocks tight.
  illustration?: ReactNode;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-select focus-visible:ring-offset-2 focus-visible:ring-offset-ca-panel";
const BTN_PRIMARY = `inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition-opacity hover:opacity-90 ${FOCUS_RING}`;
const BTN_SECONDARY = `inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-ink transition-colors hover:border-ca-select hover:bg-ca-panel-2 ${FOCUS_RING}`;

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
  testId,
  compact,
  illustration,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={testId ?? "empty-state"}
      className={[
        compact
          ? "flex flex-col items-center justify-center gap-hmi-1 px-hmi-4 py-hmi-4 text-center"
          : "flex flex-1 flex-col items-center justify-center gap-hmi-2 px-hmi-4 py-hmi-6 text-center",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {!compact && illustration ? (
        <div aria-hidden className="mb-hmi-1 flex items-center justify-center">
          {illustration}
        </div>
      ) : null}
      {Icon ? (
        <span
          aria-hidden
          className={
            compact
              ? "flex h-7 w-7 items-center justify-center rounded-full border border-ca-border bg-ca-panel-2 text-ca-ink-muted"
              : "flex h-10 w-10 items-center justify-center rounded-full border border-ca-border bg-ca-panel-2 text-ca-ink-muted"
          }
        >
          <Icon size={compact ? 14 : 18} strokeWidth={1.5} />
        </span>
      ) : null}
      <h2
        className={
          compact
            ? "text-hmi-body font-semibold text-ca-ink"
            : "text-hmi-h3 font-semibold text-ca-ink"
        }
      >
        {title}
      </h2>
      {description ? (
        <p
          className={
            compact
              ? "max-w-sm text-hmi-caption text-ca-ink-muted"
              : "max-w-md text-hmi-body text-ca-ink-muted"
          }
        >
          {description}
        </p>
      ) : null}
      {actions && actions.length > 0 ? (
        <div
          className={
            compact
              ? "mt-hmi-1 flex flex-wrap items-center justify-center gap-hmi-2"
              : "mt-hmi-2 flex flex-wrap items-center justify-center gap-hmi-2"
          }
        >
          {actions.map((a, i) => (
            <button
              key={a.label + i}
              type="button"
              onClick={a.onClick}
              data-testid={a.testId}
              className={a.variant === "secondary" ? BTN_SECONDARY : BTN_PRIMARY}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
