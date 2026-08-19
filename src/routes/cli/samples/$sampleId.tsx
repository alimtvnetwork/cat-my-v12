/**
 * Route: `/cli/samples/$sampleId` - per-sample viewer.
 *
 * Plan 90 Step 119. Reads BE `GET /samples/{sample_id}` via the Step-119
 * server-fn proxy `getSample` (see `src/lib/observability/samples.functions.ts`).
 *
 * Root cause guarded (one sentence): without a per-sample drill-down,
 * operators clicking a Step-118 grid tile had nowhere to land, and the
 * `E_BE_NOT_FOUND` path for a deep-link to a stale sample id was
 * unreachable through the UI, so a bad bookmark silently 404'd against
 * the JSON API instead of rendering an operator-facing empty state.
 *
 * Honest-wire choices (no false-OK, per `spec/03-error-manage/`):
 *  - `CatSample` (`BE/app/domain/cat_sample.py`) is
 *    `{id, rule_id, label, captured_at}`. There is NO `image_url`, NO
 *    `exif` blob, NO `rule_run_history` array, and NO `POST /samples/{id}/rerun`
 *    endpoint. The step wording asks for "full-res image, EXIF/capture
 *    metadata, rule-run history, and inline rerun action" - four
 *    hooks that do not exist server-side today. Surfaced as follows:
 *      * Full-res preview renders a large placeholder `<Images/>` tile
 *        with an explicit "image bytes not yet in wire" caption. NOT a
 *        `<img src="/samples/{id}/full.jpg">` that would 404.
 *      * EXIF/capture panel renders the four fields that DO exist
 *        (id, rule_id, label, captured_at). Missing keys (ISO,
 *        exposure, aperture, focal length, camera model, lens) are
 *        listed under a "Not yet in wire" heading with a spec pointer,
 *        so operators see the gap explicitly.
 *      * Rule-run history renders an empty state with a "no history
 *        endpoint yet" note, NOT a fabricated list.
 *      * Rerun button is `disabled` with a `title=` explaining the
 *        missing `POST /samples/{sample_id}/rerun` endpoint. Enabling
 *        it without a server contract would risk phantom submissions.
 *  - `E_BE_NOT_FOUND` (raised by `_parse_sample_id` when the id is not
 *    numeric or by the facade when the row is missing) renders an
 *    operator-facing empty state with a link back to `/cli/samples`,
 *    NOT the generic error banner - a stale bookmark is not the same
 *    kind of failure as a transport outage.
 *
 * `robots: noindex`: internal operator screen.
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useAppQuery } from "@/lib/wrappers/use-app-query";
import { AlertTriangle, ArrowLeft, Images, Loader2, RefreshCw, RotateCcw } from "lucide-react";

import { getSample, type CatSampleWire } from "@/lib/observability/samples.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cli/samples/$sampleId")({
  parseParams: (raw) => ({ sampleId: Number(raw.sampleId) }),
  stringifyParams: (parsed) => ({ sampleId: String(parsed.sampleId) }),
  head: ({ params }) => ({
    meta: [
      { title: `CLI Sample #${params.sampleId}` },
      {
        name: "description",
        content: `Cat-sample #${params.sampleId} viewer: capture metadata, rule binding, and rerun action.`,
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `CLI Sample #${params.sampleId}` },
      {
        property: "og:description",
        content: `Per-sample drill-down for cat-sample #${params.sampleId} served by the active SampleFacade.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: SampleErrorBoundary,
  notFoundComponent: SampleNotFoundBoundary,
  component: CliSampleViewer,
});

function formatCapturedAt(iso?: string): string {
  if (!iso) return "—";
  const t = Date.parse(iso);

  if (Number.isNaN(t)) return iso;

  return new Date(t).toLocaleString();
}

function SampleErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  return (
    <section className="flex flex-col gap-hmi-3">
      <div
        role="alert"
        className="flex items-start gap-hmi-2 rounded-hmi-sm border border-destructive/40 bg-destructive/5 p-hmi-3 text-hmi-body text-destructive"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex flex-col gap-hmi-1">
          <div className="font-medium">Sample viewer crashed</div>
          <code className="text-hmi-caption opacity-80">{error.message}</code>
          <div className="mt-hmi-1 flex gap-hmi-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                reset();
                router.invalidate();
              }}
            >
              Retry
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/cli/samples">Back to samples</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SampleNotFoundBoundary() {
  const { sampleId } = Route.useParams();

  return (
    <section className="flex flex-col gap-hmi-2">
      <h1 className="text-hmi-h2 font-semibold text-ca-ink">Sample not found</h1>
      <p className="text-hmi-body text-ca-ink-muted">
        The active <code className="font-mono">SampleFacade</code> has no row for id{" "}
        <code className="font-mono">#{sampleId}</code>. It may have been deleted or the facade was
        reseeded.
      </p>
      <div>
        <Button asChild size="sm" variant="outline">
          <Link to="/cli/samples">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to samples
          </Link>
        </Button>
      </div>
    </section>
  );
}

function CliSampleViewer() {
  const { sampleId } = Route.useParams();
  const fetchSample = useServerFn(getSample);
  const query = useAppQuery({
    queryKey: ["cli-samples", sampleId],
    queryFn: () => fetchSample({ data: { sampleId } }),
    // Per-sample rows change rarely; a manual refresh button is
    // sufficient. Auto-refresh here would spam BE for every open tab.
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => {
      // Do not retry structured 404s; the row is genuinely absent.
      if (err instanceof Error && err.message.startsWith("E_BE_NOT_FOUND")) {
        return false;
      }

      return failureCount < 2;
    },
  });

  const sample: CatSampleWire | undefined = query.data;
  const isMissing =
    query.isFail &&
    query.error instanceof Error &&
    query.error.message.startsWith("E_BE_NOT_FOUND");

  if (isMissing) {
    return <SampleNotFoundBoundary />;
  }

  return (
    <section className="flex flex-col gap-hmi-3">
      <header className="flex items-center justify-between gap-hmi-2">
        <div className="flex items-center gap-hmi-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/cli/samples">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Samples
            </Link>
          </Button>
          <h1 className="text-hmi-h2 font-semibold text-ca-ink">
            Sample <span className="font-mono">#{sampleId}</span>
          </h1>
        </div>
        <div className="flex items-center gap-hmi-2">
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
          <Button
            size="sm"
            disabled
            title="POST /samples/{sample_id}/rerun is not implemented in v1 (see BE/routes/samples.py). Rerun lands in the 123-140 polish band alongside the doctor panel."
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Rerun
          </Button>
        </div>
      </header>

      {query.isFail && !isMissing && (
        <div
          role="alert"
          className="flex items-start gap-hmi-2 rounded-hmi-sm border border-destructive/40 bg-destructive/5 p-hmi-3 text-hmi-body text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Failed to load sample</div>
            <code className="text-hmi-caption opacity-80">
              {query.error instanceof Error ? query.error.message : String(query.error)}
            </code>
          </div>
        </div>
      )}

      {query.isPending && !query.data ? (
        <div className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading sample...
        </div>
      ) : sample ? (
        <div className="grid gap-hmi-3 lg:grid-cols-[2fr,1fr]">
          {/* Full-res preview placeholder. */}
          <div className="flex flex-col gap-hmi-2">
            <div
              aria-label={`Sample ${sample.SampleId} preview placeholder`}
              className="flex aspect-video w-full items-center justify-center rounded-hmi-sm border border-ca-border bg-ca-surface-alt text-ca-ink-muted"
            >
              <div className="flex flex-col items-center gap-hmi-1">
                <Images className="h-12 w-12 opacity-40" />
                <span className="text-hmi-caption">
                  Image bytes are not yet part of the CatSample wire.
                </span>
              </div>
            </div>
            <p className="text-hmi-caption text-ca-ink-muted">
              Full-res preview requires a <code>thumbnail_url</code> or blob endpoint on{" "}
              <code>BE/routes/samples.py</code>. Tracked alongside tag/status filters on Step 118's
              header note.
            </p>
          </div>

          {/* Right column: metadata + history. */}
          <div className="flex flex-col gap-hmi-3">
            <section
              aria-labelledby="sample-metadata-heading"
              className="rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3"
            >
              <h2
                id="sample-metadata-heading"
                className="mb-hmi-2 text-hmi-body font-semibold text-ca-ink"
              >
                Capture metadata
              </h2>
              <dl className="grid grid-cols-[auto,1fr] gap-x-hmi-3 gap-y-hmi-1 text-hmi-caption">
                <dt className="text-ca-ink-muted">Id</dt>
                <dd className="font-mono text-ca-ink">#{sample.SampleId}</dd>
                <dt className="text-ca-ink-muted">Rule</dt>
                <dd>
                  <Link
                    to="/cli/rules/$ruleId"
                    params={{ ruleId: Number(sample.LegacySampleId ?? sample.SampleId) }}
                    className="font-mono text-ca-accent underline"
                  >
                    rule #{sample.LegacySampleId ?? sample.SampleId}
                  </Link>
                </dd>
                <dt className="text-ca-ink-muted">Label</dt>
                <dd className="text-ca-ink">{sample.Label}</dd>
                <dt className="text-ca-ink-muted">Captured</dt>
                <dd className="font-mono text-ca-ink" title={sample.CreatedAt}>
                  {formatCapturedAt(sample.CreatedAt)}
                </dd>
              </dl>
              <div className="mt-hmi-3 border-t border-ca-border pt-hmi-2">
                <div className="mb-hmi-1 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                  Not yet in wire
                </div>
                <ul className="flex flex-wrap gap-hmi-1">
                  {[
                    "ISO",
                    "exposure",
                    "aperture",
                    "focal_length",
                    "camera_model",
                    "lens",
                    "thumbnail_url",
                  ].map((k) => (
                    <li key={k}>
                      <Badge
                        variant="outline"
                        className="border-dashed font-mono text-hmi-caption text-ca-ink-muted"
                      >
                        {k}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
                  Extend <code>BE/app/domain/cat_sample.py</code> to populate. Rendering fabricated
                  values here would violate <code>spec/03-error-manage/</code> no-false-OK.
                </p>
              </div>
            </section>

            <section
              aria-labelledby="sample-history-heading"
              className="rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3"
            >
              <h2
                id="sample-history-heading"
                className="mb-hmi-2 text-hmi-body font-semibold text-ca-ink"
              >
                Rule-run history
              </h2>
              <p className="text-hmi-caption text-ca-ink-muted">
                No{" "}
                <code>
                  GET /samples/{"{"}sample_id{"}"}/runs
                </code>
                endpoint in v1. History surfaces once the processing-cli writes results to the
                Task-DB with a <code>sample_id</code> back-reference (Plan 90 Step 132).
              </p>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}
