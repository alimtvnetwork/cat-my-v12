// AI testing route (Plan 34, step 20, SS-05). Operators build a session
// dataset, run a selected rule set across every image, inspect aggregate
// metrics, and keep only compact summaries in persisted history.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { BarChart3, Clock4, PackagePlus, Play, Upload, X, type LucideIcon } from "lucide-react";
import {
  selectProject,
  selectRuleset,
  selectRulesetsForProject,
  useProjectStore,
} from "@/lib/projects/store";
import { runRuleset, type TrialRun } from "@/lib/projects/trials";
import {
  aggregateAiTestingResults,
  selectAiTestingHistoryForRuleset,
  useAiTestingStore,
  type AiTestingAggregateSummary,
  type AiTestingDatasetImage,
} from "@/lib/ai-testing/aggregate";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export const MAX_DATASET_IMAGE_BYTES = 4 * 1024 * 1024;

interface DatasetImage extends AiTestingDatasetImage {
  size: number;
  type: string;
}

interface ProgressState {
  done: number;
  total: number;
}

export const Route = createFileRoute("/projects/$projectId/ai-testing")({
  component: AiTestingPage,
  errorComponent: AiTestingError,
  notFoundComponent: AiTestingNotFound,
  validateSearch: (search: Record<string, unknown>) => ({
    rulesetId: typeof search.rulesetId === "string" ? search.rulesetId : undefined,
  }),
});

function readDatasetFile(file: File): Promise<DatasetImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") return reject(new Error("Unexpected FileReader result"));
      resolve({
        id: newClientId(),
        name: file.name,
        size: file.size,
        type: file.type,
        imageRef: result,
      });
    };
    reader.readAsDataURL(file);
  });
}

function newClientId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };

  if (g.crypto?.randomUUID) return g.crypto.randomUUID();

  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function AiTestingPage() {
  const { projectId } = Route.useParams();
  const searchRulesetId = Route.useSearch({ select: (s) => s.rulesetId });
  const project = useProjectStore((state) => selectProject(state, projectId));
  const rulesets = useProjectStore((state) => selectRulesetsForProject(state, projectId));
  const appendSummary = useAiTestingStore((state) => state.appendSummary);
  const [rulesetId, setRulesetId] = useState<string>(
    searchRulesetId && rulesets.some((r) => r.id === searchRulesetId)
      ? searchRulesetId
      : (rulesets[0]?.id ?? ""),
  );
  const [dataset, setDataset] = useState<DatasetImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({ done: 0, total: 0 });
  const [lastSummary, setLastSummary] = useState<AiTestingAggregateSummary | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  const activeRuleset = useProjectStore((state) =>
    rulesetId ? selectRuleset(state, rulesetId) : undefined,
  );
  const history = useAiTestingStore((state) => selectAiTestingHistoryForRuleset(state, rulesetId));

  useEffect(() => {
    if (
      searchRulesetId &&
      rulesets.some((r) => r.id === searchRulesetId) &&
      searchRulesetId !== rulesetId
    ) {
      setRulesetId(searchRulesetId);

      return;
    }

    if (rulesetId && rulesets.some((ruleset) => ruleset.id === rulesetId)) return;
    setRulesetId(rulesets[0]?.id ?? "");
  }, [rulesetId, rulesets, searchRulesetId]);

  if (!project) {
    console.warn("[ai-testing] project not found", { projectId });

    throw notFound();
  }

  const canRun = useMemo(
    () => Boolean(activeRuleset) && dataset.length > 0 && !running,
    [activeRuleset, dataset.length, running],
  );
  const runDisabledReason = useMemo(() => {
    if (running) return "A run is already in progress.";

    if (!activeRuleset) return "Pick a rule set to enable Run tests.";

    if (dataset.length === 0) return "Add at least one image to the dataset first.";

    return null;
  }, [activeRuleset, dataset.length, running]);
  const progressPercent =
    progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);

  // Plan 87 Step 8: merged timeline for the middle pane. Prepend `lastSummary`
  // (this session's most recent run) and dedupe against persisted `history`.
  // Chronological ascending so the newest dot sits on the right.
  const timelineSummaries = useMemo<AiTestingAggregateSummary[]>(() => {
    const seen = new Set<string>();
    const merged: AiTestingAggregateSummary[] = [];

    if (lastSummary) {
      merged.push(lastSummary);
      seen.add(lastSummary.id);
    }

    for (const item of history) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }

    return merged.sort((a, b) => a.createdAt - b.createdAt);
  }, [lastSummary, history]);

  const activeSummary = useMemo<AiTestingAggregateSummary | null>(() => {
    if (selectedSummaryId) {
      const match = timelineSummaries.find((s) => s.id === selectedSummaryId);

      if (match) return match;
    }

    return lastSummary ?? history[0] ?? null;
  }, [selectedSummaryId, timelineSummaries, lastSummary, history]);

  async function addFiles(files: FileList | File[]) {
    setError(null);
    const accepted: File[] = [];
    const messages: string[] = [];
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/") === false) {
        console.warn("[ai-testing] rejected file, mime", { name: file.name, type: file.type });
        messages.push(`${file.name}: not an image file.`);
        continue;
      }

      if (file.size > MAX_DATASET_IMAGE_BYTES) {
        console.warn("[ai-testing] rejected file, size", { name: file.name, size: file.size });
        messages.push(`${file.name}: larger than ${MAX_DATASET_IMAGE_BYTES / 1024 / 1024} MB.`);
        continue;
      }

      accepted.push(file);
    }

    try {
      const images = await Promise.all(accepted.map(readDatasetFile));

      if (images.length > 0) {
        setDataset((current) => [...current, ...images]);
        console.info("[ai-testing] dataset images added", { count: images.length });
      }

      setError(messages.length > 0 ? messages.join(" ") : null);
    } catch (err) {
      console.error("[ai-testing] dataset file read failed", err);
      reportLovableError(err instanceof Error ? err : new Error(String(err)), {
        boundary: "projects_$projectId_ai_testing_dataset_read",
      });
      setError(err instanceof Error ? err.message : "Could not read one or more images.");
    }
  }

  async function handleRun() {
    if (!activeRuleset) {
      setError("Choose a rule set first.");

      return;
    }

    if (dataset.length === 0) {
      setError("Add dataset images first.");

      return;
    }

    setRunning(true);
    setError(null);
    setProgress({ done: 0, total: dataset.length });
    try {
      const batchId = newClientId();
      const now = Date.now();
      const runs: TrialRun[] = [];
      for (let index = 0; index < dataset.length; index++) {
        const image = dataset[index];
        runs.push(
          runRuleset({
            rulesetId: activeRuleset.id,
            imageRef: image.imageRef,
            rules: activeRuleset.rules,
            id: `${batchId}-${image.id}`,
            now: now + index,
          }),
        );
        setProgress({ done: index + 1, total: dataset.length });
        await nextFrame();
      }

      const summary = aggregateAiTestingResults({
        id: batchId,
        now,
        rulesetId: activeRuleset.id,
        rules: activeRuleset.rules,
        images: dataset,
        runs,
      });
      appendSummary(summary);
      setLastSummary(summary);
      setSelectedSummaryId(summary.id);

      console.info("[ai-testing] completed", {
        rulesetId: activeRuleset.id,
        summaryId: summary.id,
        imageCount: summary.imageCount,
        totalChecks: summary.totalChecks,
        verdict: summary.verdict,
      });
    } catch (err) {
      console.error("[ai-testing] run failed", err);
      reportLovableError(err instanceof Error ? err : new Error(String(err)), {
        boundary: "projects_$projectId_ai_testing_handle_run",
      });
      setError(err instanceof Error ? err.message : "Could not run AI testing.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto">
      <div className="p-hmi-6">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mb-hmi-5">
            <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              {project.name}
            </p>
            <h1 className="mt-hmi-1 font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
              AI testing
            </h1>
            <p className="mt-hmi-1 text-hmi-body text-ca-ink-muted">
              Run one rule set across a session dataset. Summary history keeps the last 10 runs.
            </p>
          </header>

          {rulesets.length === 0 ? (
            <EmptyState
              icon={PackagePlus}
              title="No rule sets in this project yet"
              description="AI testing runs one rule set across a session dataset. Create your first rule set to start collecting pass/fail metrics."
              action={
                <Link
                  to="/projects/$projectId/rulesets/new"
                  params={{ projectId }}
                  className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                >
                  Create your first rule set
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-hmi-5 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,360px)]">
              {/* Plan 87 Step 7: 3-pane layout. Pane 1 = Dataset builder, pane 2 = Run controls + Metrics, pane 3 = History. Landmarks are role="region" with aria-label so Playwright and screen readers see three distinct panes. */}
              <section
                role="region"
                aria-label="Dataset"
                className="flex min-w-0 flex-col gap-hmi-4"
              >
                <section className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4">
                  <div className="mb-hmi-3 flex items-center justify-between gap-hmi-3">
                    <div>
                      <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
                        Dataset
                      </h2>
                      <p className="text-hmi-caption text-ca-ink-muted">
                        {dataset.length} images loaded for this session.
                      </p>
                    </div>
                    {dataset.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDataset([]);
                          setLastSummary(null);
                        }}
                        className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInput.current?.click()}
                    onKeyDown={(event) => {
                      if (KeyboardKeyType.isEnterOrSpace(event.key)) {
                        event.preventDefault();
                        fileInput.current?.click();
                      }
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      void addFiles(event.dataTransfer.files);
                    }}
                    className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-hmi-2 rounded-lg border border-dashed border-ca-border bg-ca-panel-2 p-hmi-5 text-center transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                  >
                    <Upload aria-hidden size={32} className="text-ca-ink-muted" />
                    <p className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
                      Drop images or click to choose
                    </p>
                    <p className="text-hmi-caption text-ca-ink-muted">
                      Multiple PNG or JPEG files, up to {MAX_DATASET_IMAGE_BYTES / 1024 / 1024} MB
                      each.
                    </p>
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        if (event.currentTarget.files) void addFiles(event.currentTarget.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </div>

                  {dataset.length > 0 ? (
                    <ul className="mt-hmi-4 grid grid-cols-1 gap-hmi-3 md:grid-cols-2">
                      {dataset.map((image) => (
                        <li
                          key={image.id}
                          className="flex min-w-0 items-center gap-hmi-3 rounded-sm border border-ca-border bg-ca-panel-2 p-hmi-2"
                        >
                          <img
                            src={image.imageRef}
                            alt={image.name}
                            className="h-16 w-20 flex-none rounded-sm border border-ca-border object-contain bg-ca-panel"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-hmi-body font-semibold text-ca-ink">
                              {image.name}
                            </p>
                            <p className="text-hmi-caption text-ca-ink-muted">
                              {(image.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label={`Remove ${image.name}`}
                            onClick={() =>
                              setDataset((current) =>
                                current.filter((item) => item.id !== image.id),
                              )
                            }
                            className="rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-2 text-ca-ink-muted hover:border-ca-select hover:text-ca-ink"
                          >
                            <X aria-hidden size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              </section>

              <main
                role="region"
                aria-label="Run and metrics"
                className="flex min-w-0 flex-col gap-hmi-4"
              >
                <section className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4">
                  <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
                    Run tests
                  </h2>
                  <div className="mt-hmi-3 grid grid-cols-1 gap-hmi-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
                      Rule set
                      <select
                        value={rulesetId}
                        onChange={(event) => {
                          setRulesetId(event.currentTarget.value);
                          setError(null);
                          setLastSummary(null);
                        }}
                        className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
                      >
                        {rulesets.map((ruleset) => (
                          <option key={ruleset.id} value={ruleset.id}>
                            {ruleset.name} ({ruleset.rules.length} rules)
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={handleRun}
                      disabled={!canRun}
                      title={runDisabledReason ?? "Run this rule set across every dataset image"}
                      aria-describedby={runDisabledReason ? "run-disabled-reason" : undefined}
                      className="inline-flex items-center justify-center gap-hmi-2 self-end rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                    >
                      <Play aria-hidden size={18} />
                      {running ? "Running..." : "Run tests"}
                    </button>
                  </div>
                  {runDisabledReason ? (
                    <p
                      id="run-disabled-reason"
                      className="mt-hmi-2 text-hmi-caption text-ca-ink-muted"
                    >
                      {runDisabledReason}
                    </p>
                  ) : null}

                  <div className="mt-hmi-3">
                    <div className="flex items-center justify-between text-hmi-caption text-ca-ink-muted">
                      <span>Progress</span>
                      <span>
                        {progress.done}/{progress.total}
                      </span>
                    </div>
                    <div className="mt-hmi-1 h-2 overflow-hidden rounded-sm bg-ca-panel-2">
                      <div
                        className="h-full bg-ca-select transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {error ? (
                    <p role="alert" className="mt-hmi-3 text-hmi-caption text-ca-ng">
                      {error}
                    </p>
                  ) : null}
                </section>

                {running && !activeSummary ? (
                  <TimelineSkeleton progress={progress} />
                ) : (
                  <>
                    <MetricsPanel summary={activeSummary} />
                    <ResultTimeline
                      summaries={timelineSummaries}
                      activeId={activeSummary?.id ?? null}
                      onSelect={setSelectedSummaryId}
                    />
                  </>
                )}
              </main>

              <aside
                role="region"
                aria-label="History"
                className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-ca-border bg-ca-panel"
              >
                <header className="sticky top-0 z-[1] flex items-center justify-between gap-hmi-2 border-b border-ca-border bg-ca-panel/95 px-hmi-3 py-hmi-1 text-hmi-caption uppercase tracking-wide text-ca-ink-muted backdrop-blur">
                  <span className="inline-flex items-center gap-hmi-1">
                    History
                    <span className="rounded-sm bg-ca-panel-2 px-hmi-1 font-mono text-[10px] normal-case text-ca-ink">
                      {history.length}
                    </span>
                  </span>
                  <Link
                    to="/projects/$projectId/ai-testing-history"
                    params={{ projectId }}
                    className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-[2px] text-[11px] normal-case tracking-normal text-ca-ink hover:border-ca-select"
                  >
                    Compare / rerun
                  </Link>
                </header>
                {history.length === 0 ? (
                  <div className="p-hmi-3">
                    <EmptyState
                      icon={Clock4}
                      title="No AI testing runs yet"
                      description="Finished runs land here so you can compare pass rates and re-open past results."
                      compact
                    />
                  </div>
                ) : (
                  <ul className="flex min-h-0 flex-1 flex-col divide-y divide-ca-border overflow-auto">
                    {history.map((summary) => (
                      <HistoryRow key={summary.id} summary={summary} />
                    ))}
                  </ul>
                )}
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Plan 87 Step 8: compact dot-strip timeline of past runs, click to select.
function ResultTimeline({
  summaries,
  activeId,
  onSelect,
}: {
  summaries: AiTestingAggregateSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (summaries.length === 0) return null;

  return (
    <section
      data-testid="ai-test-timeline"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-3"
    >
      <div className="mb-hmi-2 flex items-center justify-between">
        <h3 className="font-display text-hmi-caption font-extrabold uppercase tracking-wide text-ca-ink-muted">
          Result timeline
        </h3>
        <span className="text-hmi-caption text-ca-ink-muted">
          {summaries.length} run{summaries.length === 1 ? "" : "s"}
        </span>
      </div>
      <ol
        className="flex flex-wrap items-center gap-hmi-2"
        aria-label="Past run results, oldest first"
      >
        {summaries.map((summary, index) => {
          const isActive = summary.id === activeId;
          const rate = Math.round(summary.passRate * 100);
          const stamp = new Date(summary.createdAt).toLocaleString();
          const color =
            summary.verdict === "OK"
              ? "bg-ca-ok/70 hover:bg-ca-ok border-ca-ok"
              : "bg-ca-ng/70 hover:bg-ca-ng border-ca-ng";

          return (
            <li key={summary.id}>
              <button
                type="button"
                onClick={() => onSelect(summary.id)}
                aria-pressed={isActive}
                aria-label={`Run ${index + 1}: ${summary.verdict}, ${rate}% pass, ${stamp}`}
                title={`${summary.verdict} · ${rate}% · ${stamp}`}
                className={`h-4 w-4 rounded-full border transition ${color} ${
                  isActive
                    ? "ring-2 ring-ca-select ring-offset-2 ring-offset-ca-panel"
                    : "opacity-80"
                } focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus`}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Plan 87 step 26: skeleton shown while a run is in flight and no summary
// is available yet. Root cause it addresses: the metrics + timeline
// sections rendered their "No run yet" empty state during the very first
// run, which read as "nothing is happening" while worker aggregation was
// still in progress. Skeleton bars pulse at the ca-skeleton token cadence
// (respects prefers-reduced-motion) and echo the progress counter so the
// operator sees forward motion without a fake spinner.
function TimelineSkeleton({ progress }: { progress: ProgressState }) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label="Aggregating run results"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4 motion-panel-in"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
          Metrics
        </h2>
        <span className="text-hmi-caption text-ca-ink-muted">
          Aggregating {progress.done}/{progress.total} ({pct}%)
        </span>
      </div>
      <div className="mt-hmi-3 grid grid-cols-3 gap-hmi-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="ca-skeleton h-16 rounded-md" aria-hidden />
        ))}
      </div>
      <div className="mt-hmi-4 space-y-hmi-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="ca-skeleton h-6 rounded-sm"
            aria-hidden
            style={{ width: `${90 - i * 12}%` }}
          />
        ))}
      </div>
    </section>
  );
}

function MetricsPanel({ summary }: { summary: AiTestingAggregateSummary | null }) {
  if (!summary) {
    return (
      <section className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4">
        <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
          Metrics
        </h2>
        <div className="mt-hmi-3">
          <EmptyState
            icon={BarChart3}
            title="No run yet"
            description="Pass rate, per-rule metrics, and per-image details appear here after the first run finishes."
            compact
          />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4">
      <div className="flex flex-wrap items-start justify-between gap-hmi-3">
        <div>
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Metrics
          </h2>
          <p className="text-hmi-caption text-ca-ink-muted">
            {new Date(summary.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusPill verdict={summary.verdict} />
      </div>

      <div className="mt-hmi-4 grid grid-cols-2 gap-hmi-3 md:grid-cols-4">
        <MetricBox label="Pass rate" value={`${Math.round(summary.passRate * 100)}%`} />
        <MetricBox label="Images" value={String(summary.imageCount)} />
        <MetricBox label="Rules" value={String(summary.ruleCount)} />
        <MetricBox label="Checks" value={`${summary.okChecks}/${summary.totalChecks}`} />
      </div>

      <div className="mt-hmi-5 overflow-hidden rounded-sm border border-ca-border">
        <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
          <span>Rule</span>
          <span>Pass</span>
          <span>Rate</span>
        </div>
        {summary.perRule.length === 0 ? (
          <p className="px-hmi-3 py-hmi-3 text-hmi-body text-ca-ink-muted">
            No visible rules were checked.
          </p>
        ) : (
          <ul className="divide-y divide-ca-border">
            {summary.perRule.map((rule) => (
              <li
                key={rule.ruleId}
                className="grid grid-cols-[minmax(0,1fr)_90px_90px] px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink"
              >
                <span className="truncate">{rule.ruleName}</span>
                <span>
                  {rule.okCount}/{rule.totalChecks}
                </span>
                <span>{Math.round(rule.passRate * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-hmi-4 flex flex-col gap-hmi-2">
        {summary.perImage.map((image) => (
          <details
            key={image.imageId}
            className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2"
          >
            <summary className="cursor-pointer text-hmi-body text-ca-ink">
              {image.imageName} ({image.okCount}/{image.totalChecks})
            </summary>
            <ul className="mt-hmi-2 flex flex-col gap-hmi-1">
              {image.results.map((result) => (
                <li
                  key={result.ruleId}
                  className="flex items-center justify-between gap-hmi-2 text-hmi-caption text-ca-ink-muted"
                >
                  <span className="truncate">{result.ruleName}</span>
                  <span>
                    {result.verdict} · {Math.round(result.score * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-ca-border bg-ca-panel-2 p-hmi-3">
      <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">{label}</p>
      <p className="mt-hmi-1 font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ verdict }: { verdict: "OK" | "NG" }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-hmi-1 py-0 text-[10px] font-bold leading-4 ${verdict === "OK" ? "bg-ca-ok/15 text-ca-ok" : "bg-ca-ng/15 text-ca-ng"}`}
    >
      {verdict}
    </span>
  );
}

function HistoryRow({ summary }: { summary: AiTestingAggregateSummary }) {
  const pct = Math.round(summary.passRate * 100);
  const stamp = new Date(summary.createdAt);

  return (
    <li className="flex items-center gap-hmi-2 px-hmi-3 py-hmi-1 text-hmi-caption hover:bg-ca-panel-2/60">
      <StatusPill verdict={summary.verdict} />
      <span className="min-w-0 flex-1 truncate text-ca-ink-muted" title={stamp.toLocaleString()}>
        {stamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="font-mono text-ca-ink" title={`${summary.imageCount} images`}>
        {summary.imageCount}
        <span className="text-ca-ink-muted">img</span>
      </span>
      <span
        className={`font-mono ${pct >= 100 ? "text-ca-ok" : pct >= 80 ? "text-ca-ink" : "text-ca-ng"}`}
        title="Pass rate"
      >
        {pct}%
      </span>
    </li>
  );
}

function AiTestingError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[ai-testing] error boundary", error);
    reportLovableError(error, { boundary: "projects_$projectId_ai_testing_error_component" });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        AI testing didn't load
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">{error.message}</p>
      <button
        type="button"
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}

function AiTestingNotFound() {
  const { projectId } = Route.useParams();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        Project not found
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
        No project matches <span className="font-mono">{projectId}</span>.
      </p>
      <Link
        to="/projects"
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        All projects
      </Link>
    </div>
  );
}

// Plan 87 Step 9: Local EmptyState primitive shared across the AI Test route's
// empty surfaces (no rulesets, no history, no metrics yet). Kept in-file so
// Step 14/18 can promote it later without a premature abstraction.
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-hmi-2 rounded-lg border border-dashed border-ca-border bg-ca-panel-2 text-center ${
        compact ? "p-hmi-4" : "p-hmi-6"
      }`}
    >
      <span
        aria-hidden
        className="flex h-10 w-10 items-center justify-center rounded-full border border-ca-border bg-ca-panel text-ca-ink-muted"
      >
        <Icon size={20} />
      </span>
      <p className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
        {title}
      </p>
      <p className="max-w-md text-hmi-body text-ca-ink-muted">{description}</p>
      {action ? <div className="mt-hmi-2">{action}</div> : null}
    </div>
  );
}
