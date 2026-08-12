/**
 * Route: `/cli/rules` - rule bundles table backed by `RuleFacade`.
 *
 * Plan 90 Step 115. Reads BE `GET /rules` via the Step-115 server-fn proxy
 * `listRules` (see `src/lib/observability/rules.functions.ts`). Columns per
 * step wording: Name, Version, UpdatedAt, Provider, Actions.
 *
 * Root cause guarded (one sentence): without a `/cli/rules` surface, the
 * CLI shell's Rules tab remained a disabled placeholder and Step 116
 * (`cli.rules.$ruleId.tsx` editor) had nothing to `<Link>` from, so
 * operators had to hit `GET /rules` with curl to see which bundles the
 * active facade served.
 *
 * Design notes:
 *  - `UpdatedAt` is intentionally rendered as `"-"`: the `CatRule` wire
 *    (`BE/app/domain/cat_rule.py`) is currently `{id, name, version,
 *    enabled}` with no `updated_at` field. Fabricating a timestamp
 *    would violate the "no false-OK" rule in `spec/03-error-manage/`,
 *    so we surface the absence honestly and add a header note.
 *  - `Provider` reads from the envelope-level `provider` (facade class
 *    name) rather than a per-row field, because the facade owns every
 *    row in the returned page - synthesizing per-row provider would
 *    lie the moment a hybrid facade lands.
 *  - Actions column renders a placeholder `View` button that links to
 *    `/cli/rules/$ruleId` when Step 116 lands; until then it is
 *    disabled with a title explaining why (avoids TanStack type-safe
 *    router breakage on a non-existent route).
 *  - Transport / envelope failures bubble as an `AlertTriangle` banner
 *    with the raw error message (E_* code + Message), never swallowed.
 *  - Empty state distinguishes "facade returned no bundles" from
 *    "transport failed" so operators can tell provider silence from
 *    outage.
 *
 * `robots: noindex`: internal operator screen.
 */
import { pausePollOnError } from "@/lib/react-query/poll";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useAppQuery } from "@/lib/wrappers/use-app-query";
import { AlertTriangle, Loader2, RefreshCw, ScrollText } from "lucide-react";

import { useBackend } from "@/lib/backend/provider";
import { type CatRuleWire } from "@/lib/backend/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/cli/EmptyState";
import { TableSkeleton } from "@/components/cli/ListSkeleton";
import { CliRouteError } from "@/components/cli/CliRouteError";
import { CliRouteNotFound } from "@/components/cli/CliRouteNotFound";

export const Route = createFileRoute("/cli/rules")({
  head: () => ({
    meta: [
      { title: "CLI Rules" },
      {
        name: "description",
        content:
          "Rule bundles served by the active RuleFacade: name, version, enabled state, and provider.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "CLI Rules" },
      {
        property: "og:description",
        content: "Rule bundles served by the active RuleFacade with version and provider.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CliRulesRoute,
  errorComponent: (props) => <CliRouteError {...props} title="Failed to load CLI rules" />,
  notFoundComponent: () => (
    <CliRouteNotFound
      icon={ScrollText}
      title="Rule bundle not found"
      body="This rule id is not registered with the active RuleFacade. It may have been deleted, renamed, or replaced by a newer version - reload the rules list to see the current bundles."
    />
  ),
});

function EnabledBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
      >
        enabled
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-ca-border text-ca-ink-muted">
      disabled
    </Badge>
  );
}

function CliRulesRoute() {
  const backend = useBackend();
  const query = useAppQuery({
    queryKey: ["cli-rules"],
    queryFn: async () => {
      const res = await backend.rules.list();
      return res.Results[0];
    },
    refetchInterval: pausePollOnError(10_000),
    refetchIntervalInBackground: false,
    meta: { hasVisibility: false },
  });

  const items: CatRuleWire[] = query.data?.items ?? [];
  const provider = (query.data as { provider?: string } | undefined)?.provider ?? "-";
  const total = query.data?.total ?? 0;

  return (
    <section className="flex flex-col gap-hmi-3">
      <header className="flex items-center justify-between gap-hmi-2">
        <div className="flex flex-col">
          <h1 className="text-hmi-h2 font-semibold text-ca-ink">Rule Bundles</h1>
          <p className="text-hmi-caption text-ca-ink-muted">
            Served by <code className="font-mono">{provider}</code>. Auto-refresh every 10s.
            <span className="ml-2 opacity-70">
              UpdatedAt is not yet part of the CatRule wire; rendered as
              <code className="mx-1 font-mono">-</code>until BE adds it.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-hmi-2">
          <Button asChild size="sm">
            <Link to="/cli/rules/import">Import bundle</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </header>

      {query.isFail && (
        <div
          role="alert"
          className="flex items-start gap-hmi-2 rounded-hmi-sm border border-destructive/40 bg-destructive/5 p-hmi-3 text-hmi-body text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Failed to load rule bundles</div>
            <code className="text-hmi-caption opacity-80">
              {query.error instanceof Error ? query.error.message : String(query.error)}
            </code>
          </div>
        </div>
      )}

      {query.isPending && !query.data ? (
        <TableSkeleton columns={5} rows={5} testId="cli-rules-skeleton" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No rule bundles served"
          body={
            <>
              Provider <code className="font-mono">{provider}</code> returned zero bundles. Import a
              bundle via <code className="font-mono">processing-cli rules import</code> or seed the
              facade in tests via <code className="font-mono">set_rule_facade(...)</code>.
            </>
          }
          testId="cli-rules-empty"
        />
      ) : (
        <div className={cn("overflow-x-auto rounded-hmi-sm border border-ca-border bg-ca-surface")}>
          <table className="w-full text-hmi-body">
            <thead className="bg-ca-surface-alt text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              <tr>
                <th className="px-hmi-3 py-hmi-2 text-left">Name</th>
                <th className="px-hmi-3 py-hmi-2 text-left">Version</th>
                <th className="px-hmi-3 py-hmi-2 text-left">State</th>
                <th className="hidden px-hmi-3 py-hmi-2 text-left md:table-cell">UpdatedAt</th>
                <th className="hidden px-hmi-3 py-hmi-2 text-left md:table-cell">Provider</th>
                <th className="px-hmi-3 py-hmi-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.RuleId} className="border-t border-ca-border">
                  <td className="px-hmi-3 py-hmi-2 font-mono text-hmi-caption text-ca-ink">
                    {r.RuleKind}
                  </td>
                  <td className="px-hmi-3 py-hmi-2 font-mono text-hmi-caption">-</td>
                  <td className="px-hmi-3 py-hmi-2">
                    <EnabledBadge enabled={r.IsActive} />
                  </td>
                  <td className="hidden px-hmi-3 py-hmi-2 font-mono text-hmi-caption text-ca-ink-muted md:table-cell">
                    {r.UpdatedAt ?? "-"}
                  </td>
                  <td className="hidden px-hmi-3 py-hmi-2 font-mono text-hmi-caption text-ca-ink-muted md:table-cell">
                    {provider}
                  </td>
                  <td className="px-hmi-3 py-hmi-2 text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/cli/rules/$ruleId" params={{ ruleId: r.RuleId }}>
                        View
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-ca-border bg-ca-surface-alt px-hmi-3 py-hmi-2 text-hmi-caption text-ca-ink-muted">
            {total} bundle{total === 1 ? "" : "s"}
          </div>
        </div>
      )}
    </section>
  );
}
