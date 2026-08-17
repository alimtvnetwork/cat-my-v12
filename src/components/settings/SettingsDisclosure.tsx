import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface SettingsDisclosureProps {
  title: string;
  description?: string;
  /**
   * Controlled or uncontrolled initial-open state. Uncontrolled by default,
   * which keeps the disclosure closed on first paint (SSR-safe).
   */
  defaultOpen?: boolean;
  /**
   * When this value changes, the disclosure auto-opens. Used by the Settings
   * hub so switching capture vendor pops the device discovery panel open
   * without a click.
   */
  openTrigger?: string | number | null;
  children: ReactNode;
}

/**
 * A11y-first disclosure primitive used by the Settings hub (Plan 81 step 7)
 * to keep the Device Discovery panel folded away until an operator asks for
 * it, or until switching vendors makes rediscovery relevant.
 *
 * Implemented with a plain `<button aria-expanded>` + content div instead of
 * `<details>` so the SSR markup matches the hydrated client markup (no
 * `open`/`hidden` attribute drift) and so focus / keyboard order stays under
 * our control.
 */
export function SettingsDisclosure({
  title,
  description,
  defaultOpen = false,
  openTrigger = null,
  children,
}: SettingsDisclosureProps): React.JSX.Element | null {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  // Track the last openTrigger we honored so we only auto-open on actual
  // changes, not on every re-render. `null` is treated as "no trigger yet"
  // so a route that never sets it never forces open.
  const lastTrigger = useRef<string | number | null>(openTrigger ?? null);
  useEffect(() => {
    if (openTrigger === null || openTrigger === undefined) return;

    if (lastTrigger.current === openTrigger) return;
    lastTrigger.current = openTrigger;
    setOpen(true);
  }, [openTrigger]);

  return (
    <div
      className="rounded-md border border-ca-border bg-ca-panel"
      data-testid="settings-disclosure"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center justify-between gap-hmi-3 px-hmi-3 py-hmi-2 text-left transition hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-select"
      >
        <span className="min-w-0">
          <span className="block font-display text-hmi-body font-semibold text-ca-ink">
            {title}
          </span>
          {description ? (
            <span className="mt-hmi-1 block text-hmi-caption text-ca-ink-muted">{description}</span>
          ) : null}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className="shrink-0 text-ca-ink-muted transition-transform"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      <div id={bodyId} hidden={!open} className="border-t border-ca-border p-hmi-3">
        {children}
      </div>
    </div>
  );
}
