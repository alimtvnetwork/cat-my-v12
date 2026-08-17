// Route-level fallback for 500-class failures.
// Drop into `errorComponent` on any route, or render directly from a page when
// a fetch throws a `BackendEnvelopeError` (see Plan 89 Phase 4).
//
// Spec: spec/03-error-manage/02-error-architecture/04-error-modal/03-error-modal-reference.md
// Rules:
//   - Always shows the user-safe `Errors.Message` (or the JS error message).
//   - Stack frames render only in dev or when `responseStatus >= 500`, matching
//     `EnvelopeErrorPanel`.
//   - Never fetches, never logs (caller decides whether to hit `errorStore`).

import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { buildCapturedError, type CapturedError } from "@/types/errors";

import { EnvelopeErrorPanel } from "./EnvelopeErrorPanel";

export interface ServerErrorFallbackProps {
  /**
   * Either a pre-built `CapturedError` (preferred, set by `beFetch`) or a raw
   * unknown thrown value. When raw, we wrap it via `buildCapturedError` so the
   * panel can still render `envelopeErrors` if the thrown object carries one.
   */
  error: unknown;
  onRetry?: () => void;
  onGoHome?: () => void;
  title?: string;
}

function toCaptured(input: unknown): CapturedError {
  if (input && typeof input === "object" && "correlationId" in input && "code" in input) {
    return input as CapturedError;
  }

  return buildCapturedError(input);
}

export function ServerErrorFallback({
  error,
  onRetry,
  onGoHome,
  title = "Something went wrong",
}: ServerErrorFallbackProps): React.JSX.Element | null {
  const err = useMemo(() => toCaptured(error), [error]);

  const primaryMessage =
    err.envelopeErrors?.BackendMessage?.trim() || err.message || "Unexpected error";
  const status = err.responseStatus;

  return (
    <div
      role="alert"
      className="mx-auto my-12 max-w-2xl rounded-lg border bg-card p-6 shadow-sm"
      data-testid="server-error-fallback"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{err.code}</span>
            {typeof status === "number" ? (
              <>
                {" · "}
                <span className="font-mono">HTTP {status}</span>
              </>
            ) : null}
            {" · "}
            <span className="font-mono">{err.correlationId}</span>
          </p>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm" data-testid="server-error-fallback-message">
        {primaryMessage}
      </p>

      {err.envelopeErrors ? (
        <div className="mt-4 border-t pt-4">
          <EnvelopeErrorPanel err={err} />
        </div>
      ) : null}

      {onRetry || onGoHome ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {onRetry ? (
            <Button type="button" variant="default" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {onGoHome ? (
            <Button type="button" variant="ghost" size="sm" onClick={onGoHome}>
              Go home
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
