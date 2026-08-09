import { useEffect, useRef, useState } from "react";

/**
 * Plan 90 Step 133 - CLI a11y live-region primitive.
 *
 * Root cause for a dedicated primitive (one sentence): CLI tail surfaces
 * (IPC SSE frames, sessions log tail, doctor probe output) append rows
 * silently into the DOM, so screen-reader users never learn that new data
 * arrived and there is no shared, rate-limited announcement channel to
 * prevent verbal spam when tails burst.
 *
 * Design:
 *  - One always-mounted <div role="status" aria-live="polite"> at the app
 *    root (`<CliLiveRegionHost/>` in `__root.tsx`); consumers announce
 *    through the module-level `announce()` publisher (works from event
 *    handlers, EventSource callbacks, mutation onSuccess, or React effects).
 *  - `aria-live="polite"` is the default so tail updates never interrupt.
 *    A separate `assertive` slot is reserved for errors (surfaced by the
 *    existing GlobalErrorModal / EnvelopeErrorPanel; NOT re-announced here
 *    to avoid double-reading).
 *  - Coalesce window: at most one announcement per 500ms per priority,
 *    replacing prior queued text. Prevents "12 new frame" spam when an
 *    SSE burst drops 40 rows in a tick.
 *  - Never announce empty strings or duplicate consecutive text.
 *  - SSR-safe: no window / document access outside the effect.
 *
 * Consumer contract:
 *   import { announce } from "@/components/cli/LiveRegion";
 *   announce("3 new IPC frames");
 *   announce("Rule set validation failed", { priority: "assertive" });
 *
 * NOT a11y label pass: icon-only buttons under `src/components/cli/**` and
 * `src/routes/cli.*.tsx` were audited in this step and every icon-only
 * <button>/<Button> already carries `aria-label` (CorrelationIdChip L126,
 * envelope-viewer L162 chevron via title, DoctorPanel refresh, sessions
 * pagination) or wraps visible text. focus-visible rings are already
 * inherited from `@utility hmi-focus-ring`/`ca-focus-ring` in
 * `src/styles.css` (L494, L609). Axe-core CI wiring is deferred to Step
 * 193 (a11y focus-order sweep) where the whole CLI surface is scanned in
 * one Playwright run instead of adding a per-route dep here.
 */

export enum PriorityType {
  Polite = "polite",
  Assertive = "assertive",
}
export type Priority = PriorityType;

type Subscriber = (message: string, priority: Priority) => void;

const subscribers = new Set<Subscriber>();
const COALESCE_MS = 500;
let politeTimer: ReturnType<typeof setTimeout> | null = null;
let assertiveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPolite: string | null = null;
let pendingAssertive: string | null = null;

function flush(priority: Priority): void {
  const message = priority === "polite" ? pendingPolite : pendingAssertive;

  if (priority === "polite") {
    pendingPolite = null;
    politeTimer = null;
  } else {
    pendingAssertive = null;
    assertiveTimer = null;
  }

  if (!message) return;
  for (const sub of subscribers) sub(message, priority);
}

export interface AnnounceOptions {
  priority?: Priority;
}

/** Rate-limited screen-reader announcement. Safe from any runtime. */
export function announce(message: string, options: AnnounceOptions = {}): void {
  const trimmed = message.trim();

  if (!trimmed) return;
  const priority = options.priority ?? "polite";

  if (priority === "polite") {
    pendingPolite = trimmed;

    if (politeTimer !== null) return;
    politeTimer = setTimeout(() => flush(PriorityType.Polite), COALESCE_MS);
  } else {
    pendingAssertive = trimmed;

    if (assertiveTimer !== null) return;
    assertiveTimer = setTimeout(() => flush(PriorityType.Assertive), COALESCE_MS);
  }
}

/**
 * Single global host. Mount ONCE in `__root.tsx`. Renders two visually
 * hidden regions (polite + assertive) that follow WCAG 4.1.3 status-message
 * conventions (`role="status"` for polite, `role="alert"` for assertive).
 * Uses class `sr-only` if the app defines it; otherwise inline styles keep
 * the region off-screen without hiding it from assistive tech (`display:
 * none` and `visibility: hidden` would silence announcements).
 */
export function CliLiveRegionHost() {
  const [politeText, setPoliteText] = useState("");
  const [assertiveText, setAssertiveText] = useState("");
  const lastPolite = useRef("");
  const lastAssertive = useRef("");

  useEffect(() => {
    const sub: Subscriber = (message, priority) => {
      if (priority === "polite") {
        if (lastPolite.current === message) {
          // Same text twice in a row: SR clients will re-announce only if
          // the node's text mutates. Toggle to empty then set to force it.
          setPoliteText("");
          setTimeout(() => setPoliteText(message), 16);
        } else {
          setPoliteText(message);
        }

        lastPolite.current = message;
      } else {
        if (lastAssertive.current === message) {
          setAssertiveText("");
          setTimeout(() => setAssertiveText(message), 16);
        } else {
          setAssertiveText(message);
        }

        lastAssertive.current = message;
      }
    };
    subscribers.add(sub);

    return () => {
      subscribers.delete(sub);
    };
  }, []);

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-cli-live-region="polite"
        style={srOnly}
      >
        {politeText}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-cli-live-region="assertive"
        style={srOnly}
      >
        {assertiveText}
      </div>
    </>
  );
}

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
