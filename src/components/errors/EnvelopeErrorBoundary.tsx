import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 90 Step 103: top-level boundary that routes `EnvelopeError` into the
// GlobalErrorModal.
//
// Two entry paths are covered so no failure class silently drops:
//   1. Async path: `beFetch` dispatches `ENVELOPE_ERROR_EVENT` after capturing
//      the error into `useErrorStore`. This boundary listens on `window` and
//      calls `openErrorModal(captured)` so the modal actually appears
//      (`captureError` alone only pushes into history, per errorStore.ts).
//   2. Render/effect path: if an `EnvelopeError` escapes to React (e.g. thrown
//      from a `useSuspenseQuery` selector), the React error boundary catches
//      it, captures via `errorStore`, opens the modal, and swallows the throw
//      so the surrounding tree keeps rendering. Non-envelope errors are
//      re-thrown so TanStack Router's `errorComponent` handles them.
//
// Spec: spec/03-error-manage/01-error-resolution/ (§Global surfacing).
// Consumer: mounted once inside `src/routes/__root.tsx` wrapping <Outlet />.

import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";

import { ENVELOPE_ERROR_EVENT, EnvelopeError } from "@/lib/be-fetch";
import { useErrorStore } from "@/lib/errors/errorStore";
import type { CapturedError } from "@/types/errors";

interface EnvelopeErrorEventDetail {
  captured: CapturedError;
  error: EnvelopeError;
}

function isEnvelopeErrorEvent(e: Event): e is CustomEvent<EnvelopeErrorEventDetail> {
  return (
    e instanceof CustomEvent &&
    e.detail &&
    typeof e.detail === "object" &&
    "captured" in (e.detail as object)
  );
}

function EnvelopeErrorEventBridge(): null {
  useEffect(() => {
    const handler = (e: Event) => {
      if (isEnvelopeErrorEvent(e) === false) return;
      const { captured, error } = e.detail;
      ClientLogger.info(
        `[EnvelopeErrorBoundary] surfacing cid=${error.correlationId} code=${error.code}`,
      );
      useErrorStore.getState().openErrorModal(captured);
    };
    window.addEventListener(ENVELOPE_ERROR_EVENT, handler);

    return () => window.removeEventListener(ENVELOPE_ERROR_EVENT, handler);
  }, []);

  return null;
}

interface BoundaryProps {
  children: ReactNode;
}
interface BoundaryState {
  errorToRethrow: unknown | null;
  hasEnvelopeError: boolean;
}

class ReactEnvelopeBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { errorToRethrow: null, hasEnvelopeError: false };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    const isEnvelope =
      (error as any).name === "EnvelopeError" || (error instanceof Error && error.name === "EnvelopeError");

    if (isEnvelope) {
      // Capture the error to rethrow it, so TanStack Router's errorComponent can handle it!
      // Previously this set hasEnvelopeError: true and returned null, causing a blank screen.
      return { errorToRethrow: error, hasEnvelopeError: true };
    }
    // Only intercept envelope errors; let anything else bubble to the
    // route-level errorComponent.
    return { errorToRethrow: error, hasEnvelopeError: false };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const isEnvelope =
      (error as any).name === "EnvelopeError" || (error instanceof Error && error.name === "EnvelopeError");

    if (!isEnvelope) return;

    // It's an EnvelopeError. Cast it so we can read its properties.
    const envErr = error as EnvelopeError;

    const captured = useErrorStore.getState().captureError(
      error,
      {
        endpoint: envErr.endpoint,
        method: envErr.method,
        responseStatus: envErr.responseStatus,
        correlationId: envErr.correlationId,
        source: `EnvelopeErrorBoundary${info.componentStack ? ` @${info.componentStack.split("\n")[1]?.trim() ?? ""}` : ""}`,
      },
      envErr.code,
    );
    useErrorStore.getState().openErrorModal(captured);
  }

  render() {
    if (this.state.errorToRethrow) {
      // Surface a visual indicator instead of returning null (which causes a blank screen)
      // or throwing (which unmounts the RootComponent and destroys the GlobalErrorModal).
      // This keeps the React tree alive, allowing the GlobalErrorModal to appear on top.
      const err = this.state.errorToRethrow as Error;
      const isEnvelope = EnvelopeError.is(err);
      const envErr = isEnvelope ? (err as EnvelopeError) : null;

      const title = envErr
        ? `${envErr.code}${envErr.responseStatus ? ` (HTTP ${envErr.responseStatus})` : ""}`
        : "Component Failed to Load";
      const message = envErr ? envErr.backendMessage : err.message || String(err);

      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 max-w-md w-full">
            <h2 className="mb-2 text-lg font-semibold text-destructive">{title}</h2>
            <p className="mb-4 text-sm">
              An unexpected error prevented this section from rendering. The error has been
              captured.
            </p>
            <pre className="mb-4 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-2 text-left text-xs text-foreground">
              {message}
            </pre>
            <button
              onClick={() => this.setState({ errorToRethrow: null, hasEnvelopeError: false })}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function EnvelopeErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ReactEnvelopeBoundary>
      <EnvelopeErrorEventBridge />
      {children}
    </ReactEnvelopeBoundary>
  );
}
