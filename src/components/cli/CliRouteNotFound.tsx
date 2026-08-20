/**
 * Plan 90 Step 137 - Shared `notFoundComponent` for `/cli/*` routes.
 *
 * Root cause guarded (one sentence): most `cli.*` routes had no
 * `notFoundComponent`, so any unmatched `/cli/*` URL (typo, stale
 * bookmark, GC'd session id, deleted rule id) collapsed to the
 * router's default fallback and killed the CLI shell instead of
 * showing a scoped, retryable "not found" inside `<Outlet />` with
 * contextual copy the operator can act on.
 *
 * Presentation-only. Reuses `EmptyState` primitive (Step 128) so the
 * empty and not-found states share shape and token vocabulary.
 * Callers pass domain glyph + contextual body copy. The CTA slot
 * always deep-links back to `/cli/sessions` (the operator landing).
 */
import { Link } from "@tanstack/react-router";
import { Compass, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/cli/EmptyState";

export interface CliRouteNotFoundProps {
  /** Domain glyph. Defaults to `Compass` (generic wayfinding). */
  icon?: LucideIcon;
  /** e.g. "Session not found". */
  title: string;
  /** Contextual sentence, e.g. "It may have been GC'd after 14 days." */
  body?: React.ReactNode;
}

export function CliRouteNotFound({
  icon = Compass,
  title,
  body,
}: CliRouteNotFoundProps): React.JSX.Element | null {
  return (
    <div className="p-hmi-4">
      <EmptyState
        icon={icon}
        title={title}
        body={body}
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/cli/sessions">Back to sessions</Link>
          </Button>
        }
        testId="cli-route-not-found"
      />
    </div>
  );
}
