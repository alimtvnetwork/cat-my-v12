import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 72 step 20: seed error boundary + Zod recovery UI.
//
// Root cause the toast addresses: today, when `JsonUiSeedFacade` throws
// (bad JSON, drifted schema, unreachable remote endpoint), the failure
// is only visible as a `console.error` line inside `SeedProvider`.
// Every downstream `useSeedSlice` returns `{ status: "error" }` and each
// consumer independently renders "unavailable" without telling the
// operator that the whole seed bundle failed to load. This is silent
// failure of the system, even though every consumer is technically
// honest, and it's exactly what spec/03-error-manage §3 forbids.
//
// Fix: a single, floating, non-blocking recovery toast that reads the
// SeedProvider status, extracts a human-readable summary from a
// `ZodError` when present (issue path + message), and exposes a Retry
// button that calls `reload()`. Not a modal: the app is fully usable
// with a broken seed (consumers already handle their own empty
// states), so we surface + let the operator act, we do not block.
//
// Related: `GlobalErrorModal` handles user-visible captured errors and
// is intentionally separate from this toast, because a seed load
// failure is a startup/config issue, not a runtime user action.
import { AlertTriangle, RotateCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ZodError } from "zod";
import { useSeedContextOptional } from "./provider";

interface ExtractedIssue {
  path: string;
  message: string;
}

function extractIssues(error: Error | null): ExtractedIssue[] {
  if (!error) return [];

  if (error instanceof ZodError) {
    return error.issues.slice(0, 6).map((i) => ({
      path: i.path.length > 0 ? i.path.join(".") : "(root)",
      message: i.message,
    }));
  }
  // Support the case where a facade wraps the ZodError with extra
  // context. `.cause` is standard on Error in ES2022+ TS lib.
  const cause = (error as { cause?: unknown }).cause;

  if (cause instanceof ZodError) {
    return cause.issues.slice(0, 6).map((i) => ({
      path: i.path.length > 0 ? i.path.join(".") : "(root)",
      message: i.message,
    }));
  }

  return [];
}

export function SeedRecoveryToast(): React.JSX.Element | null {
  const ctx = useSeedContextOptional();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal whenever a new error arrives (fresh reload attempt
  // that failed again is a new event, operator should see it).
  useEffect(() => {
    if (ctx?.status === "error") setDismissed(false);
  }, [ctx?.error, ctx?.status]);

  const issues = useMemo(() => extractIssues(ctx?.error ?? null), [ctx?.error]);

  if (!ctx || ctx.status !== "error" || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="seed-recovery-toast"
      className="fixed bottom-4 right-4 z-[70] w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-destructive/50 bg-background/95 p-3 shadow-lg backdrop-blur"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-foreground">Seed bundle failed to load</div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setDismissed(true)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Source: <code className="font-mono">{ctx.facade.source}</code>.{" "}
            {ctx.error?.message ?? "Unknown error."}
          </div>
          {issues.length > 0 ? (
            <ul
              data-testid="seed-recovery-issues"
              className="mt-2 max-h-32 overflow-auto rounded border bg-muted/40 p-1.5 text-[11px] leading-snug"
            >
              {issues.map((it, idx) => (
                <li key={`${it.path}-${idx}`} className="font-mono">
                  <span className="text-foreground">{it.path}</span>
                  <span className="text-muted-foreground">: {it.message}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // Structured log so the retry is observable and
                // pairs with the original `[seed] SeedProvider load
                // failed` line (spec/03-error-manage §3).
                ClientLogger.info("[seed] SeedRecoveryToast retry clicked", {
                  source: ctx.facade.source,
                });
                ctx.reload();
              }}
              data-testid="seed-recovery-retry"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RotateCw aria-hidden className="size-3.5" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-md border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
