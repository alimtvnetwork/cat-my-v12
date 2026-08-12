/**
 * Route: `/cli/samples` - sample thumbnail grid backed by `SampleFacade`.
 *
 * Plan 90 Step 118. Reads BE `GET /samples` via the Step-118 server-fn
 * proxy `listSamples` (see `src/lib/observability/samples.functions.ts`).
 *
 * Root cause guarded (one sentence): without a `/cli/samples` surface, the
 * CLI shell's Samples tab remained a disabled placeholder and operators
 * had to hit `GET /samples` with curl to see which cat-samples the active
 * facade served, blocking Step 119's per-sample drill-down from having a
 * parent to link back to.
 *
 * Honest-wire choices (no false-OK, per `spec/03-error-manage/`):
 *  - The `CatSample` wire is `{id, rule_id, label, captured_at}` - there
 *    is NO `tag`, NO `status`, NO `thumbnail_url`. The step wording asks
 *    for "thumbnail grid, filter by tag/status, pagination via envelope
 *    TotalRecords" but three of those hooks do not yet exist server-side.
 *    We surface the absence explicitly rather than fabricating fields:
 *      * Thumbnails render as placeholder tiles (Images icon + id) with a
 *        header note that image URLs require a BE wire extension. Faking a
 *        `/samples/{id}/thumbnail.jpg` URL would 404 and violate
 *        "no false-OK".
 *      * "Filter by tag/status" degrades to filters over the fields that
 *        DO exist: a `rule_id` chip-select built from the returned rows +
 *        a debounced free-text search over `label`. Header note names the
 *        missing tag/status filters and points at Step 119+.
 *      * "Pagination via envelope TotalRecords" degrades to client-side
 *        page slicing over `payload.total` (samples returns the full page
 *        in one shot; `Attributes.TotalRecords` is not populated by
 *        `list_samples`). Page size is fixed at 24 (6x4 grid).
 *  - Transport / envelope failures bubble as an `AlertTriangle` banner
 *    with the raw error code + message, never swallowed.
 *  - Provider column reads envelope-level `provider` (facade class name)
 *    for the same reason as `/cli/rules`: per-row provider would lie the
 *    moment a hybrid facade lands.
 *
 * `robots: noindex`: internal operator screen.
 */
import { pausePollOnError } from "@/lib/react-query/poll";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppQuery } from "@/lib/wrappers/use-app-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Images,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

import { useBackend } from "@/lib/backend/provider";
import { type CatSampleWire } from "@/lib/backend/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/cli/EmptyState";
import { CardGridSkeleton } from "@/components/cli/ListSkeleton";
import { CliRouteError } from "@/components/cli/CliRouteError";
import { CliRouteNotFound } from "@/components/cli/CliRouteNotFound";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

const PAGE_SIZE = 24; // 6-column grid x 4 rows.

export const Route = createFileRoute("/cli/samples")({
  head: () => ({
    meta: [
      { title: "CLI Samples" },
      {
        name: "description",
        content:
          "Cat-samples served by the active SampleFacade: id, rule binding, label, and capture time.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "CLI Samples" },
      {
        property: "og:description",
        content:
          "Sample thumbnail grid with rule and free-text filters, backed by the active SampleFacade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CliSamplesRoute,
  errorComponent: (props) => <CliRouteError {...props} title="Failed to load CLI samples" />,
  notFoundComponent: () => (
    <CliRouteNotFound
      icon={Images}
      title="Sample not found"
      body="This sample id is not in the active SampleFacade. Captures older than the retention window are pruned, and imported bundles may not contain this id."
    />
  ),
});

function formatCapturedAt(iso?: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);

  if (Number.isNaN(t)) return iso;

  return new Date(t).toLocaleString();
}

function CliSamplesRoute() {
  const backend = useBackend();
  const query = useAppQuery({
    queryKey: ["cli-samples"],
    queryFn: async () => {
      const res = await backend.samples.list();
      return res.Results[0];
    },
    refetchInterval: pausePollOnError(15_000),
    refetchIntervalInBackground: false,
    meta: { hasVisibility: false },
  });

  const [search, setSearch] = useState("");
  const [ruleFilter, setRuleFilter] = useState<number | "all">("all");
  const [page, setPage] = useState(0);

  const items: CatSampleWire[] = query.data?.items ?? [];
  const provider = (query.data as { provider?: string } | undefined)?.provider ?? "-";
  const total = query.data?.total ?? 0;

  // Rule chip options: distinct `rule_id`s in the returned page, ascending.
  const ruleOptions = useMemo(() => {
    const set = new Set<number>();
    for (const s of items) {
      if (s.LegacySampleId != null) set.add(Number(s.LegacySampleId));
      else set.add(s.SampleId);
    }

    return Array.from(set).sort((a, b) => a - b);
  }, [items]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return items.filter((s) => {
      if (ruleFilter !== "all" && String(s.SampleId) !== String(ruleFilter)) return false;

      if (needle.length > 0 && s.Label.toLowerCase().includes(needle) === false) return false;

      return true;
    });
  }, [items, search, ruleFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageSlice = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="flex flex-col gap-hmi-3">
      <header className="flex flex-col gap-hmi-2">
        <div className="flex items-center justify-between gap-hmi-2">
          <div className="flex flex-col">
            <h1 className="text-hmi-h2 font-semibold text-ca-ink">Samples</h1>
            <p className="text-hmi-caption text-ca-ink-muted">
              Served by <code className="font-mono">{provider}</code>. Auto-refresh every 15s.
            </p>
          </div>
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
        <p className="text-hmi-caption text-ca-ink-muted">
          Thumbnails are placeholders: <code className="font-mono">CatSample</code> has no image-URL
          field yet. Tag and status filters are pending BE schema extension; free-text search runs
          over <code>label</code>, and the chip-select filters by <code>rule_id</code>.
        </p>
      </header>

      {query.isFail && (
        <div
          role="alert"
          className="flex items-start gap-hmi-2 rounded-hmi-sm border border-destructive/40 bg-destructive/5 p-hmi-3 text-hmi-body text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Failed to load samples</div>
            <code className="text-hmi-caption opacity-80">
              {query.error instanceof Error ? query.error.message : String(query.error)}
            </code>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-hmi-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ca-ink-muted" />
          <Input
            aria-label="Search sample labels"
            className="pl-7"
            placeholder="Search label..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-hmi-1">
          <Badge
            role="button"
            tabIndex={0}
            onClick={() => {
              setRuleFilter("all");
              setPage(0);
            }}
            onKeyDown={(e) => {
              if (KeyboardKeyType.isEnterOrSpace(e.key)) {
                e.preventDefault();
                setRuleFilter("all");
                setPage(0);
              }
            }}
            variant={ruleFilter === "all" ? "default" : "outline"}
            className="cursor-pointer"
          >
            all rules
          </Badge>
          {ruleOptions.map((rid) => (
            <Badge
              key={rid}
              role="button"
              tabIndex={0}
              onClick={() => {
                setRuleFilter(rid);
                setPage(0);
              }}
              onKeyDown={(e) => {
                if (KeyboardKeyType.isEnterOrSpace(e.key)) {
                  e.preventDefault();
                  setRuleFilter(rid);
                  setPage(0);
                }
              }}
              variant={ruleFilter === rid ? "default" : "outline"}
              className="cursor-pointer font-mono"
            >
              rule #{rid}
            </Badge>
          ))}
        </div>
      </div>

      {query.isPending && !query.data ? (
        <CardGridSkeleton count={8} testId="cli-samples-skeleton" />
      ) : filtered.length === 0 ? (
        items.length === 0 ? (
          <EmptyState
            icon={Images}
            title="No samples captured yet"
            body={
              <>
                Provider <code className="font-mono">{provider}</code> returned zero samples.
                Capture one via <code className="font-mono">worker-cli capture</code> or seed the
                facade in tests via <code className="font-mono">set_sample_facade(...)</code>.
              </>
            }
            testId="cli-samples-empty"
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No samples match the current filters"
            body="Clear the search field or widen the filter to see captured samples."
            testId="cli-samples-empty-filtered"
          />
        )
      ) : (
        <>
          <div
            role="grid"
            aria-label="Sample thumbnails"
            className={cn("grid gap-hmi-2", "grid-cols-[repeat(auto-fill,minmax(180px,1fr))]")}
          >
            {pageSlice.map((s) => (
              <Link
                key={s.SampleId}
                to="/cli/samples/$sampleId"
                params={{ sampleId: s.SampleId }}
                role="gridcell"
                className="flex flex-col overflow-hidden rounded-hmi-sm border border-ca-border bg-ca-surface transition-colors hover:border-ca-accent"
              >
                <div
                  aria-hidden
                  className="flex aspect-video w-full items-center justify-center bg-ca-surface-alt text-ca-ink-muted"
                >
                  <Images className="h-8 w-8 opacity-50" />
                </div>
                <div className="flex flex-col gap-hmi-1 p-hmi-2">
                  <div className="flex items-center justify-between gap-hmi-1">
                    <span className="font-mono text-hmi-caption text-ca-ink">#{s.SampleId}</span>
                    <Badge variant="outline" className="font-mono text-hmi-caption">
                      rule #{s.LegacySampleId ?? s.SampleId}
                    </Badge>
                  </div>
                  <div className="truncate text-hmi-body text-ca-ink" title={s.Label}>
                    {s.Label}
                  </div>
                  <div className="font-mono text-hmi-caption text-ca-ink-muted" title={s.CreatedAt}>
                    {formatCapturedAt(s.CreatedAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-hmi-2 rounded-hmi-sm border border-ca-border bg-ca-surface-alt px-hmi-3 py-hmi-2 text-hmi-caption text-ca-ink-muted">
            <span>
              {filtered.length} of {total} sample{total === 1 ? "" : "s"} shown
              {filtered.length !== items.length && <> (filtered from {items.length})</>}.
              Client-side pagination: BE wire has no <code>Attributes.TotalRecords</code> yet.
            </span>
            <div className="flex items-center gap-hmi-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={clampedPage === 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="font-mono">
                {clampedPage + 1} / {pageCount}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={clampedPage >= pageCount - 1}
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </footer>
        </>
      )}

      <p className="text-hmi-caption text-ca-ink-muted">
        Per-sample drill-down (full-res preview, EXIF, rule-run history) lands with Step 119 at{" "}
        <code>/cli/samples/$sampleId</code>.
        <Link to="/cli/rules" className="ml-2 underline">
          View rule bundles
        </Link>
      </p>
    </section>
  );
}
