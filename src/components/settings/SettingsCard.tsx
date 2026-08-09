import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { SavedBadge } from "./SavedBadge";

// Plan 81 step 3: reusable settings card. Extracted from
// `settings.index.tsx` so misc setting leaf pages
// (camera/trigger/lighting/shortcuts/license) can adopt the same visual
// language without copy-pasting the header markup.
export interface SettingsCardProps {
  Icon: LucideIcon;
  title: string;
  description?: string;
  /** Epoch-ms timestamp of the last successful save; renders SavedBadge. */
  savedAt?: number | null;
  /** Escape hatch for callers that must render a non-timestamped chip. */
  statusLabel?: string | null;
  children: ReactNode;
  className?: string;
}

export function SettingsCard({
  Icon,
  title,
  description,
  savedAt = null,
  statusLabel,
  children,
  className,
}: SettingsCardProps) {
  return (
    <section
      className={
        "rounded-lg border border-ca-border bg-ca-panel p-hmi-4 shadow-hmi-panel " +
        (className ?? "")
      }
    >
      <header className="flex items-start justify-between gap-hmi-3">
        <div className="flex items-start gap-hmi-3">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-ca-border bg-ca-panel-2 text-ca-select"
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
              {title}
            </h2>
            {description ? (
              <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">{description}</p>
            ) : null}
          </div>
        </div>
        {savedAt != null ? (
          <SavedBadge at={savedAt} />
        ) : statusLabel ? (
          <span className="shrink-0 rounded-sm border border-ca-select/40 bg-ca-select/10 px-hmi-2 py-[2px] text-[11px] tabular-nums text-ca-select">
            {statusLabel}
          </span>
        ) : null}
      </header>
      <div className="mt-hmi-3">{children}</div>
    </section>
  );
}
