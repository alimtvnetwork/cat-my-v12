/**
 * Plan 90 Step 129 - Agent logo mark for the CLI UI header.
 *
 * Mounted globally in `src/routes/__root.tsx` as a fixed top-left brand
 * chip that deep-links to `/cli/sessions` (the operator's default
 * landing surface). Uses `currentColor` on the SVG so the mark inherits
 * `text-ca-ink` and respects light/dark theme without hardcoded hex.
 *
 * Deliberately NOT a lucide `Sparkles` / generic AI mark: this is a
 * machine-vision inspection agent, not a chatbot. The glyph is an
 * aperture + reticle + scan-line underscore (see agent-logo.svg
 * doc-block).
 */
import { Link } from "@tanstack/react-router";
import agentLogoUrl from "../../assets/agent-logo.svg?url";
import { cn } from "../../lib/utils";

export interface AgentLogoProps {
  className?: string;
  /** Show the wordmark next to the glyph. Defaults to true. */
  showWordmark?: boolean;
  testId?: string;
}

export function AgentLogo({
  className,
  showWordmark = true,
  testId = "agent-logo",
}: AgentLogoProps): React.JSX.Element | null {
  
  return (
    <Link
      to="/cli/sessions"
      aria-label="Cat-my-UI CLI agent, go to sessions"
      title="Cat-my-UI CLI agent"
      data-testid={testId}
      className={cn(
        "agent-logo-fixed fixed top-2 left-2 z-40 pointer-events-auto",
        "inline-flex items-center gap-hmi-1",
        "rounded-hmi-sm px-hmi-1 py-hmi-1",
        "text-ca-ink hover:bg-ca-surface/70 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-focus",
        className,
      )}
    >
      <img src={agentLogoUrl} alt="" aria-hidden width={24} height={24} className="h-6 w-6" />
      {showWordmark ? (
        <span className="hidden sm:inline text-hmi-caption font-mono tracking-tight text-ca-ink">
          cat-my-ui
        </span>
      ) : null}
    </Link>
  );
}
