import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * BugErrorModal - UI surface for `BugError` (02-spec/21-app/40-error-manage.md §6).
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
import { copyText } from "@/lib/errors/copy-text";

export type BugErrorDetail = {
  Code: string;
  Message?: string;
  Context?: Record<string, unknown>;
  CorrelationId?: string;
};

export function BugErrorModal(): React.JSX.Element | null {
  const [err, setErr] = useState<BugErrorDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailureMessage, setCopyFailureMessage] = useState("");

  useEffect(() => {
    const onBug = (ev: Event) => {
      const detail = (ev as CustomEvent<BugErrorDetail>).detail;

      if (!detail || typeof detail.Code !== "string") return;
      setErr(detail);
      setCopied(false);
      setCopyFailureMessage("");
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
    const result = await copyText(diag);
    setCopied(result.isCopied);
    setCopyFailureMessage(result.isCopied ? "" : result.failureMessage);

    if (result.isCopied) {
      return;
    }

    ClientLogger.error("ca:bug-error:copy-failed", {
      Code: err.Code,
      failureMessage: result.failureMessage,
    });
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
        {copyFailureMessage.length > 0 ? (
          <pre className="mt-3 max-h-32 overflow-auto rounded bg-muted p-2 font-mono text-xs whitespace-pre-wrap">
            {`${copyFailureMessage}\n${diag}`}
          </pre>
        ) : null}
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
