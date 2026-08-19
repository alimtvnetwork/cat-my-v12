/**
 * Route: `/cli` (index) - landing panel for the CLI operator console.
 *
 * Plan 90 Step 106. Rendered inside the `/cli` layout (`cli.tsx`) when
 * no tab is selected. Lists which child routes are live vs pending so
 * operators know what is coming without staring at an empty <Outlet />.
 * Once Step 107 lands `/cli/sessions`, `cli.tsx` will `redirect(...)`
 * from this index into Sessions (that redirect is deliberately NOT
 * added yet because the target route does not resolve today and would
 * break the TanStack router type-check).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";

export const Route = createFileRoute("/cli/")({
  head: () => ({
    meta: [
      { title: "CLI Operator Console, Overview" },
      {
        name: "description",
        content:
          "Overview of the CLI operator console: pick a tab to inspect sessions, live logs, IPC, rules, samples, or settings.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "CLI Operator Console, Overview" },
      {
        property: "og:description",
        content:
          "Landing panel for the CLI operator console with deep-links to sessions, IPC, rules, samples, and settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),

  component: CliIndex,
});

function CliIndex() {
  return (
    <section aria-labelledby="cli-index-title" className="flex flex-col gap-hmi-3">
      <header>
        <h1 id="cli-index-title" className="text-hmi-h2 text-ca-ink">
          CLI Console
        </h1>
        <p className="text-hmi-body text-ca-ink-muted">
          Inspect worker-cli and processing-cli runs. Only Sessions is wired today; the remaining
          tabs land in Plan 90 Steps 109-119.
        </p>
      </header>

      <div className="rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3">
        <div className="flex items-center gap-hmi-2 text-hmi-body">
          <Radio aria-hidden className="size-4" />
          <span className="font-medium text-ca-ink">Sessions</span>
          <span className="text-ca-ink-muted">Disk-backed enumerator for CLI JSONL sessions.</span>
        </div>
        <div className="mt-hmi-2">
          <Link
            to="/cli-sessions"
            className="inline-flex items-center min-h-10 rounded-hmi-sm border border-ca-border px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hover:bg-ca-surface-alt"
          >
            Open Sessions
          </Link>
        </div>
      </div>
    </section>
  );
}
