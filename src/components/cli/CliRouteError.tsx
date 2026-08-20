// Route-level errorComponent wrapper for CLI surfaces.
// Wires TanStack Router's `reset` and `router.invalidate()` per
// tanstack-errors-notfound rules: reset() alone clears the boundary but does
// not re-run the loader; invalidate() re-runs it. We call both.

import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ServerErrorFallback } from "@/components/errors/ServerErrorFallback";

export interface CliRouteErrorProps extends ErrorComponentProps {
  title?: string;
}

export function CliRouteError({
  error,
  reset,
  title,
}: CliRouteErrorProps): React.JSX.Element | null {
  const router = useRouter();

  return (
    <ServerErrorFallback
      error={error}
      title={title ?? "This CLI surface failed to load"}
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
      onGoHome={() => {
        void router.navigate({ to: "/cli/sessions" });
      }}
    />
  );
}
