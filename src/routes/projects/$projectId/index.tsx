import { RunningOpKindType } from "@/lib/stores/running-ops-store";
// Project overview index (Plan 34, step 11). Renders inside the
// projects.$projectId layout's <Outlet />, so it does NOT re-mount
// HmiShell or SectionTopBar. Shows project name, ruleset count, quick
// links to the plan's project sub-surfaces, and a legacy operator group.
import { useEffect, useState } from "react";
import { Link, createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Layers,
  PlayCircle,
  Sparkles,
  Gauge,
  ListChecks,
  AlertTriangle,
  Settings,
  Play,
  Download,
  FileDown,
  Archive,
} from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import { resolveAllCategories } from "@/lib/projects/category-resolver";
import { RulesetPicker } from "@/components/projects/RulesetPicker";
import { ProjectEditorSections } from "@/components/projects/ProjectEditorSections";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { runProject } from "@/lib/run-project.functions";
import { useRunning } from "@/hooks/useRunning";
import {
  downloadProjectExport,
  downloadProjectExportYaml,
  downloadProjectExportZip,
} from "@/lib/export-project";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectOverview,
  errorComponent: OverviewError,
  notFoundComponent: OverviewNotFound,
});

function ProjectOverview() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const updateProjectAiSettings = useProjectStore((s) => s.updateProjectAiSettings);
  const runProjectFn = useServerFn(runProject);
  const { start, stop } = useRunning();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  if (!project) {
    console.warn("[projects/$projectId/index] project not found", { projectId });

    throw notFound();
  }

  const created = new Date(project.createdAt).toLocaleString();
  const canRun = rulesets.length > 0 && !running;
  const categoryResolutions = resolveAllCategories(project, rulesets);
  const categoryEntries = Object.entries(categoryResolutions).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const ai = project.aiSettings ?? {};

  function handleExport() {
    if (!project) return;
    try {
      downloadProjectExport(project, rulesets);
    } catch (e) {
      console.error("[projects/$projectId/index] export failed", e);
    }
  }

  function handleExportYaml() {
    if (!project) return;
    try {
      downloadProjectExportYaml(project, rulesets);
    } catch (e) {
      console.error("[projects/$projectId/index] export yaml failed", e);
    }
  }

  async function handleExportZip() {
    if (!project) return;
    try {
      await downloadProjectExportZip(project, rulesets);
    } catch (e) {
      console.error("[projects/$projectId/index] export zip failed", e);
    }
  }

  async function handleRunConfirmed() {
    setRunErr(null);
    setRunning(true);
    const opId = `run-${Date.now().toString(36)}`;
    start({ id: opId, kind: RunningOpKindType.Run, label: `Run ${project?.name ?? projectId}` });
    try {
      const res = await runProjectFn({
        data: {
          projectId,
          rulesetIds: rulesets.map((r) => r.id),
        },
      });
      console.info("[projects/$projectId/index] run queued", res);
      setConfirmOpen(false);
    } catch (e) {
      console.error("[projects/$projectId/index] run failed", e);
      setRunErr(e instanceof Error ? e.message : String(e));
    } finally {
      stop(opId);
      setRunning(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto p-hmi-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-hmi-5 flex items-start justify-between gap-hmi-4">
          <div className="min-w-0">
            <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">Project</p>
            <h1 className="mt-hmi-1 font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
              {project.name}
            </h1>
            <p className="mt-hmi-1 text-hmi-body text-ca-ink-muted">
              {rulesets.length} {rulesets.length === 1 ? "rule set" : "rule sets"}, created{" "}
              {created}
            </p>
            <p className="mt-hmi-1 font-mono text-hmi-caption text-ca-ink-muted">{project.id}</p>
          </div>
          <div className="flex items-center gap-hmi-2">
            <button
              type="button"
              onClick={handleExport}
              aria-label="Export project as JSON"
              className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            >
              <Download aria-hidden size={16} />
              Export JSON
            </button>
            <button
              type="button"
              onClick={handleExportYaml}
              aria-label="Export project as YAML"
              className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            >
              <FileDown aria-hidden size={16} />
              YAML
            </button>
            <button
              type="button"
              onClick={handleExportZip}
              aria-label="Export project as zip bundle"
              className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            >
              <Archive aria-hidden size={16} />
              Zip
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!canRun}
              aria-label="Run project"
              className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--color-ca-select)_60%,transparent)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play aria-hidden size={16} />
              {running ? "Running..." : "Run"}
            </button>
          </div>
        </header>

        <ProjectEditorSections project={project} rulesets={rulesets} />

        <section
          aria-label="Project actions"
          className="mb-hmi-6 grid grid-cols-1 gap-hmi-3 md:grid-cols-3"
        >
          <QuickLink
            to="/projects/$projectId/rulesets"
            params={{ projectId }}
            Icon={Layers}
            label="Rule sets"
            desc={`${rulesets.length} authored from images`}
          />
          <QuickLink
            to="/projects/$projectId/trial-run"
            params={{ projectId }}
            Icon={PlayCircle}
            label="Trial run"
            desc="Run a ruleset on an uploaded image"
          />
          <QuickLink
            to="/projects/$projectId/ai-testing"
            params={{ projectId }}
            Icon={Sparkles}
            label="AI testing"
            desc="Batch metrics across a dataset"
          />
        </section>

        <section
          aria-label="Category rules"
          className="mb-hmi-6 rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
        >
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Categories
          </h2>
          <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
            Auto-apply resolver (Plan 67 PR-05): rule sets matched to each category, plus
            uncategorized globals.
          </p>
          {categoryEntries.length === 0 ? (
            <p className="mt-hmi-3 text-hmi-body text-ca-ink-muted">
              No categories defined. Add categories on the Categories tab to auto-apply rule sets.
            </p>
          ) : (
            <ul className="mt-hmi-3 grid grid-cols-1 gap-hmi-2 md:grid-cols-2">
              {categoryEntries.map(([name, res]) => (
                <li key={name} className="rounded-md border border-ca-border bg-ca-panel-2 p-hmi-3">
                  <div className="flex items-center justify-between gap-hmi-2">
                    <span className="font-display text-hmi-body font-semibold uppercase tracking-wide text-ca-ink">
                      {name}
                    </span>
                    <span className="text-hmi-caption text-ca-ink-muted">
                      {res.matched.length} matched, {res.uncategorized.length} global
                    </span>
                  </div>
                  {res.applied.length > 0 ? (
                    <p className="mt-hmi-1 truncate text-hmi-caption text-ca-ink-muted">
                      {res.applied.map((r) => r.name).join(", ")}
                    </p>
                  ) : (
                    <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
                      No rule sets applied yet.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-label="AI Testing settings"
          className="mb-hmi-6 rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
        >
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Rule sets in Run
          </h2>
          <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
            Multi-select rule sets to hand off to the Run picker. Reference/snapshot chains are
            surfaced so you know which ruleset ultimately drives the run.
          </p>
          <div className="mt-hmi-3">
            <RulesetPicker projectId={projectId} rulesets={rulesets} />
          </div>
        </section>

        <section
          aria-label="AI Testing settings"
          className="mb-hmi-6 rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
        >
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            AI Testing settings
          </h2>
          <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
            Placeholder (Plan 67 PR-03). Persisted per-project; consumed by upcoming AI runs.
          </p>
          <form
            className="mt-hmi-3 grid grid-cols-1 gap-hmi-3 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              const raw = {
                model: String(fd.get("model") ?? ""),
                temperature: Number(fd.get("temperature") ?? 0),
                systemPrompt: String(fd.get("systemPrompt") ?? ""),
              };
              try {
                updateProjectAiSettings(project.id, raw);
                console.info("[projects/$projectId/index] AI settings saved", {
                  projectId: project.id,
                });
              } catch (err) {
                console.error("[projects/$projectId/index] AI settings save failed", err);
              }
            }}
          >
            <label className="flex flex-col gap-hmi-1 text-hmi-caption text-ca-ink-muted">
              Model
              <input
                name="model"
                defaultValue={ai.model ?? ""}
                placeholder="google/gemini-2.5-flash"
                className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
              />
            </label>
            <label className="flex flex-col gap-hmi-1 text-hmi-caption text-ca-ink-muted">
              Temperature
              <input
                name="temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                defaultValue={ai.temperature ?? 0.2}
                className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
              />
            </label>
            <label className="flex flex-col gap-hmi-1 text-hmi-caption text-ca-ink-muted md:col-span-3">
              System prompt
              <textarea
                name="systemPrompt"
                rows={3}
                defaultValue={ai.systemPrompt ?? ""}
                placeholder="Optional guidance to prepend before every AI evaluation."
                className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
              />
            </label>
            <div className="md:col-span-3">
              <button
                type="submit"
                className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
              >
                Save AI settings
              </button>
            </div>
          </form>
        </section>

        <section
          aria-label="Operator"
          className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
        >
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Operator
          </h2>
          <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
            Legacy inspection surfaces. Not scoped to this project yet.
          </p>
          <ul className="mt-hmi-3 grid grid-cols-2 gap-hmi-2 md:grid-cols-4">
            <OperatorLink to="/setup" Icon={Settings} label="Setup" />
            <OperatorLink to="/run" Icon={Gauge} label="Run" />
            <OperatorLink to="/results" Icon={ListChecks} label="Results" />
            <OperatorLink to="/errors" Icon={AlertTriangle} label="NG events" />
          </ul>
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => (running ? null : setConfirmOpen(o))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run project?</DialogTitle>
            <DialogDescription>
              Queues a run of {rulesets.length} rule {rulesets.length === 1 ? "set" : "sets"} on "
              {project.name}". A run row is inserted immediately; the pipeline flips it to running /
              succeeded / failed as it progresses.
            </DialogDescription>
          </DialogHeader>
          {runErr ? (
            <p role="alert" className="text-sm text-destructive">
              {runErr}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={running}>
              Cancel
            </Button>
            <Button onClick={handleRunConfirmed} disabled={running || rulesets.length === 0}>
              {running ? "Queuing..." : "Run now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickLink({
  to,
  params,
  Icon,
  label,
  desc,
}: {
  to:
    | "/projects/$projectId"
    | "/projects/$projectId/rulesets"
    | "/projects/$projectId/trial-run"
    | "/projects/$projectId/ai-testing";
  params: { projectId: string };
  Icon: typeof Layers;
  label: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      params={params}
      className="group flex items-start gap-hmi-3 rounded-lg border border-ca-border bg-ca-panel p-hmi-4 shadow-hmi-panel transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-ca-border bg-ca-panel-2 text-ca-select">
        <Icon aria-hidden size={20} />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
          {label}
        </h3>
        <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">{desc}</p>
      </div>
    </Link>
  );
}

function OperatorLink({
  to,
  Icon,
  label,
}: {
  to: "/setup" | "/run" | "/results" | "/errors";
  Icon: typeof Layers;
  label: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
      >
        <Icon aria-hidden size={16} className="text-ca-ink-muted" />
        {label}
      </Link>
    </li>
  );
}

function OverviewError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[projects/$projectId/index] error boundary", error);
    reportLovableError(error, { boundary: "projects_$projectId_index_error_component" });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        Overview didn't load
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

function OverviewNotFound() {
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
