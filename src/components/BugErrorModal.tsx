import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * BugErrorModal - UI surface for `BugError` (spec/21-app/40-error-manage.md §6).
 *
 * Contract:
 * - Never shows a stack trace.
 * - Shows the typed `Code`, a short apology, and a `Copy diagnostics` button
 *   that copies `Code + Context + CorrelationId` as JSON.
 * - Callers dispatch a `CustomEvent('ca:bug-error', { detail })` to surface it.
 *   This keeps error surfacing decoupled from any store/router shape.
 */
import { useEffect, useState } from "react";
import { AppEvent } from "@/lib/constants";

export type BugErrorDetail = {
  Code: string;
  Message?: string;
  Context?: Record<string, unknown>;
  CorrelationId?: string;
};

export function BugErrorModal() {
  const [err, setErr] = useState<BugErrorDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onBug = (ev: Event) => {
      const detail = (ev as CustomEvent<BugErrorDetail>).detail;

      if (!detail || typeof detail.Code !== "string") return;
      setErr(detail);
      setCopied(false);
    };
    window.addEventListener(AppEvent.BugError, onBug as EventListener);

    return () => window.removeEventListener(AppEvent.BugError, onBug as EventListener);
  }, []);

  if (!err) return null;

  const diag = JSON.stringify(
    {
      Code: err.Code,
      Context: err.Context ?? {},
      CorrelationId: err.CorrelationId ?? null,
    },
    null,
    2,
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(diag);
      setCopied(true);
    } catch {
      // Explicit surface - no silent swallow (spec 40 §3).
      ClientLogger.error("ca:bug-error:copy-failed", { Code: err.Code });
    }
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby="bug-title"
      aria-describedby="bug-desc"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ca-scrim p-4"
    >
      <div className="max-w-md w-full rounded border border-border bg-card p-5 text-card-foreground">
        <h2 id="bug-title" className="text-base font-semibold">
          Something went wrong
        </h2>
        <p id="bug-desc" className="mt-2 text-sm text-muted-foreground">
          The app hit an unexpected condition. Nothing was lost. Please copy the diagnostics below
          and send them to support.
        </p>
        <div className="mt-3 rounded bg-muted p-2 font-mono text-xs">
          <div>
            <span className="opacity-60">Code:</span> {err.Code}
          </div>
          {err.CorrelationId ? (
            <div>
              <span className="opacity-60">CorrelationId:</span> {err.CorrelationId}
            </div>
          ) : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="rounded border border-border px-3 py-1 text-sm hover:bg-muted"
          >
            {copied ? "Copied" : "Copy diagnostics"}
          </button>
          <button
            type="button"
            onClick={() => setErr(null)}
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- helper colocated with the modal it dispatches to.
export function surfaceBugError(detail: BugErrorDetail) {
  window.dispatchEvent(new CustomEvent<BugErrorDetail>(AppEvent.BugError, { detail }));
}
