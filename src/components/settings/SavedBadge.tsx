import { useEffect, useState } from "react";

// Plan 81 step 4: relative-time "saved N ago" badge that fades out after
// a short window so the Settings hub does not fill with stale confirmations.
// `at` is an epoch-ms timestamp; pass `null` to hide the badge entirely.
export interface SavedBadgeProps {
  at: number | null;
  /** ms before the badge visually fades (default 4000). */
  fadeAfterMs?: number;
  /** ms before the badge stops rendering entirely (default 8000). */
  hideAfterMs?: number;
  /** Optional label prefix (default "Saved"). */
  label?: string;
}

const DEFAULT_FADE_MS = 4000;
const DEFAULT_HIDE_MS = 8000;

export function formatRelative(now: number, at: number): string {
  const delta = Math.max(0, now - at);
  const s = Math.round(delta / 1000);

  if (s < 1) return "just now";

  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);

  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);

  return `${h}h ago`;
}

export function SavedBadge({
  at,
  fadeAfterMs = DEFAULT_FADE_MS,
  hideAfterMs = DEFAULT_HIDE_MS,
  label = "Saved",
}: SavedBadgeProps): React.JSX.Element | null {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (at == null) return;
    // Re-render each second while visible so the relative label stays fresh.
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(id);
  }, [at]);

  if (at == null) return null;
  const age = Math.max(0, now - at);

  if (age > hideAfterMs) return null;
  const faded = age > fadeAfterMs;

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="saved-badge"
      style={{
        opacity: faded ? 0.35 : 1,
        transition: "opacity 600ms ease-out",
      }}
      className="shrink-0 rounded-sm border border-ca-select/40 bg-ca-select/10 px-hmi-2 py-[2px] text-[11px] tabular-nums text-ca-select"
    >
      {label} {formatRelative(now, at)}
    </span>
  );
}
