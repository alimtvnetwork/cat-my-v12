import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
// Trial-run route (Plan 34, step 17, SS-04). Operator picks a ruleset,
// drops an image (or reuses the ruleset's reference image), and runs
// `runRuleset` from `@/lib/projects/trials`. Every run appends to the
// per-ruleset history (FIFO cap TRIAL_HISTORY_CAP). No backend.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { Play, Upload, X } from "lucide-react";
import {
  useProjectStore,
  selectProject,
  selectRulesetsForProject,
  selectRuleset,
} from "@/lib/projects/store";
import {
  runRuleset,
  useTrialStore,
  selectRunsForRuleset,
  type TrialRun,
} from "@/lib/projects/trials";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { toIntParam } from "@/lib/ids/int-alias";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const Route = createFileRoute("/projects/$projectId/trial-run")({
  component: TrialRunPage,
  errorComponent: TrialRunError,
  notFoundComponent: TrialRunNotFound,
});

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") return reject(new Error("Unexpected FileReader result"));
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

function TrialRunPage() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const appendRun = useTrialStore((s) => s.appendRun);

  if (!project) {
    console.warn("[trial-run] project not found", { projectId });

    throw notFound();
  }

  const [rulesetId, setRulesetId] = useState<string>(rulesets[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const activeRuleset = useProjectStore((s) =>
    rulesetId ? selectRuleset(s, rulesetId) : undefined,
  );
  const runs = useTrialStore((s) => selectRunsForRuleset(s, rulesetId));
  const isNonFile = !file;

  useEffect(() => {
    if (isNonFile) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canRun = useMemo(
    () => Boolean(activeRuleset) && (file !== null || Boolean(activeRuleset?.imageRef)),
    [activeRuleset, file],
  );

  function pickFile(f: File | null) {
    setError(null);

    if (!f) return setFile(null);

    if (f.type.startsWith("image/") === false) {
      console.warn("[trial-run] rejected file, mime", { name: f.name, type: f.type });
      setError(`Not an image file (${f.type || "unknown"}).`);

      return;
    }

    if (f.size > MAX_IMAGE_BYTES) {
      console.warn("[trial-run] rejected file, size", { name: f.name, size: f.size });
      setError(
        `Image too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
      );

      return;
    }

    setFile(f);
  }

  async function handleRun() {
    if (!activeRuleset) {
      setError("Choose a rule set first.");

      return;
    }

    setRunning(true);
    setError(null);
    try {
      const imageRef = file ? await readAsDataUrl(file) : (activeRuleset.imageRef ?? "");

      if (!imageRef) throw new Error("No image available for this run.");
      const run = runRuleset({
        rulesetId: activeRuleset.id,
        imageRef,
        rules: activeRuleset.rules,
      });
      appendRun(run);
      console.info("[trial-run] completed", {
        rulesetId: activeRuleset.id,
        runId: run.id,
        verdict: run.verdict,
      });
    } catch (err) {
      console.error("[trial-run] run failed", err);
      reportLovableError(err instanceof Error ? err : new Error(String(err)), {
        boundary: "projects_$projectId_trial_run_handle_run",
      });
      setError(err instanceof Error ? err.message : "Could not run the rule set.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto p-hmi-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-hmi-5">
          <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
            {project.name}
          </p>
          <h1 className="mt-hmi-1 font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
            Trial run
          </h1>
          <p className="mt-hmi-1 text-hmi-body text-ca-ink-muted">
            Score a rule set against an image. Runs are saved per rule set (last {20}).
          </p>
        </header>

        {rulesets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ca-border bg-ca-panel p-hmi-6 text-center">
            <p className="text-hmi-body text-ca-ink-muted">No rule sets in this project yet.</p>
            <Link
              to="/projects/$projectId/rulesets/new"
              params={{ projectId }}
              className="mt-hmi-3 inline-block rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
            >
              Create your first rule set
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-hmi-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="flex flex-col gap-hmi-4">
              <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
                Rule set
                <select
                  value={rulesetId}
                  onChange={(e) => {
                    setRulesetId(e.currentTarget.value);
                    setError(null);
                  }}
                  className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
                >
                  {rulesets.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.rules.length} rules)
                    </option>
                  ))}
                </select>
              </label>

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInput.current?.click()}
                onKeyDown={(e) => {
                  if (KeyboardKeyType.isEnterOrSpace(e.key)) {
                    e.preventDefault();
                    fileInput.current?.click();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pickFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-hmi-2 rounded-lg border border-dashed border-ca-border bg-ca-panel p-hmi-5 text-center transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
              >
                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt="Trial image preview"
                      className="max-h-64 max-w-full rounded-sm border border-ca-border object-contain"
                    />
                    <p className="text-hmi-caption text-ca-ink-muted">
                      {file?.name}, {file ? (file.size / 1024).toFixed(0) : "0"} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        pickFile(null);
                      }}
                      className="mt-hmi-1 inline-flex items-center gap-hmi-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select"
                    >
                      <X aria-hidden size={14} />
                      Remove
                    </button>
                  </>
                ) : activeRuleset?.imageRef ? (
                  <>
                    <img
                      src={activeRuleset.imageRef}
                      alt="Rule set reference"
                      className="max-h-64 max-w-full rounded-sm border border-ca-border object-contain opacity-80"
                    />
                    <p className="text-hmi-caption text-ca-ink-muted">
                      Using rule set reference. Drop an image to override.
                    </p>
                  </>
                ) : (
                  <>
                    <Upload aria-hidden size={32} className="text-ca-ink-muted" />
                    <p className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
                      Drop an image or click to choose
                    </p>
                    <p className="text-hmi-caption text-ca-ink-muted">
                      PNG or JPEG, up to {MAX_IMAGE_BYTES / 1024 / 1024} MB.
                    </p>
                  </>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => pickFile(e.currentTarget.files?.[0] ?? null)}
                />
              </div>

              {error ? (
                <p role="alert" className="text-hmi-caption text-ca-ng">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={!canRun || running}
                  className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                >
                  <Play aria-hidden size={18} />
                  {running ? "Running..." : "Run"}
                </button>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col rounded-lg border border-ca-border bg-ca-panel">
              <header className="flex items-center justify-between border-b border-ca-border px-hmi-3 py-hmi-2 text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                <span>History</span>
                <span>{runs.length}</span>
              </header>
              {runs.length === 0 ? (
                <div className="p-hmi-4 text-hmi-body text-ca-ink-muted">
                  No runs yet for this rule set.
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-ca-border">
                  {runs.map((run) => (
                    <TrialRunRow key={run.id} run={run} projectId={projectId} />
                  ))}
                </ul>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function TrialRunRow({ run, projectId }: { run: TrialRun; projectId: string }) {
  const okCount = run.results.filter((r) => r.verdict === "OK").length;

  return (
    <li>
      <Link
        to="/projects/$projectId/trial-run/$runId"
        params={{ projectId, runId: toIntParam(IntAliasNamespaceType.Run, run.id) }}
        className="flex flex-col gap-hmi-1 p-hmi-3 transition hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
      >
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-sm px-hmi-2 py-hmi-1 text-hmi-caption font-semibold ${
              run.verdict === "OK" ? "bg-ca-ok/10 text-ca-ok" : "bg-ca-ng/10 text-ca-ng"
            }`}
          >
            {run.verdict}
          </span>
          <span className="text-hmi-caption text-ca-ink-muted">
            {new Date(run.createdAt).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-hmi-caption text-ca-ink-muted">
          {okCount} / {run.results.length} rules passed · View details
        </p>
      </Link>
    </li>
  );
}

function TrialRunError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[trial-run] error boundary", error);
    reportLovableError(error, { boundary: "projects_$projectId_trial_run_error_component" });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        Trial run didn't load
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

function TrialRunNotFound() {
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
