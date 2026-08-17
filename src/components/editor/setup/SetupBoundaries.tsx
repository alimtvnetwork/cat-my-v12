import { ClientLogger } from "@/lib/observability/client-logger";
// Setup route boundaries (plan 30 step 90).
// Shared error + notFound components for /setup, /setup/roi, /setup/reference
// so a crash in the editor experience surfaces one clear message instead of
// falling through to the root boundary with no route context.
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { logger } from "@/lib/editor/errors";

export function SetupNotFoundComponent(): React.JSX.Element | null {
  useEffect(() => {
    logger.warn("W_UI_SETUP_ROUTE_NOT_FOUND");
  }, []);

  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-hmi-2 bg-ca-panel p-hmi-4 text-ca-ink"
    >
      <h1 className="text-hmi-header">Setup screen not found</h1>
      <p className="text-hmi-body text-ca-ink-muted">
        Pick a screen from the setup menu, or return to the editor home.
      </p>
      <Link
        to="/setup"
        className="border border-ca-border px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel-2"
      >
        Back to Setup
      </Link>
    </div>
  );
}

export function SetupErrorComponent({ error, reset }: { error: Error; reset: () => void }): React.JSX.Element | null {
  const router = useRouter();
  useEffect(() => {
    logger.error("E_UI_SETUP_ROUTE_CRASH", { message: error.message, name: error.name });
    ClientLogger.error("[setup boundary]", error);
  }, [error]);

  const retry = () => {
    // reset() alone clears the boundary but does not re-run the loader,
    // so invalidate first, then reset. Matches TanStack guidance.
    router.invalidate();
    reset();
  };

  return (
    <div
      role="alert"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-hmi-2 bg-ca-panel p-hmi-4 text-ca-ink"
    >
      <h1 className="text-hmi-header">Setup screen crashed</h1>
      <p className="max-w-md text-center text-hmi-body text-ca-ink-muted">
        {error.message || "An unexpected error occurred while rendering this setup screen."}
      </p>
      <div className="flex gap-hmi-2">
        <button
          type="button"
          onClick={retry}
          className="border border-ca-primary bg-ca-primary px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
        >
          Try again
        </button>
        <Link
          to="/"
          className="border border-ca-border px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink hover:bg-ca-panel-2"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
