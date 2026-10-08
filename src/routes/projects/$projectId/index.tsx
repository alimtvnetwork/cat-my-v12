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
  ScanSearch,
  Plus,
} from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import { resolveAllCategories } from "@/lib/projects/category-resolver";
import { RulesetPicker } from "@/components/projects/RulesetPicker";
import { ProjectEditorSections } from "@/components/projects/ProjectEditorSections";

import { WorkpieceAnalyzeWorkspace } from "@/components/vision/workpiece";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { runProject } from "@/lib/run-project.functions";
import { useRunning } from "@/hooks/useRunning";
import { evaluateCurrentVision } from "@/hooks/useAutoEvaluate";
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
  const [activeTab, setActiveTab] = useState<"analysis" | "overview">("analysis");

  const [activeRulesetId, setActiveRulesetId] = useState<string | null>(null);

  if (!project) {
    console.warn("[projects/$projectId/index] project not found", { projectId });

    throw notFound();
  }

  const created = new Date(project.createdAt).toLocaleString();
  const isRunnable = rulesets.length > 0 && !running;
  const activeRuleset =
    (activeRulesetId ? rulesets.find((r) => r.id === activeRulesetId) : null) ??
    rulesets[0];
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
      console.warn(
        "[projects/$projectId/index] Cloud run unavailable, falling back to local vision evaluation",
        e,
      );
      try {
        await evaluateCurrentVision();
        setConfirmOpen(false);
      } catch (localErr) {
        setRunErr(localErr instanceof Error ? localErr.message : String(localErr));
      }
    } finally {
      stop(opId);
      setRunning(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto p-4">
      <div className="mx-auto w-full max-w-[1720px]">
        <header className="mb-hmi-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#22252a]/60 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ca-ink-muted">
                Project
              </span>
              <span className="rounded bg-[#1a1c23] px-1.5 py-0.5 font-mono text-[10px] text-cyan-400 border border-cyan-800/50">
                Device: {project.deviceId || "Circuit IC (DUT)"}
              </span>
              <span className="font-mono text-[10px] text-ca-ink-muted">{project.id}</span>
            </div>
            <h1 className="mt-0.5 text-2xl font-bold uppercase tracking-widest text-[#f5a623]">
              {project.name}
            </h1>
          </div>

          {/* View Mode Switcher Tabs */}
          <div className="flex items-center gap-1 rounded-md border border-[#22252a]/70 bg-[#1a1c23] p-1">
            <button
              type="button"
              onClick={() => setActiveTab("analysis")}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "analysis"
                  ? "bg-[#f5a623] text-white shadow-sm"
                  : "text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              <ScanSearch size={14} />
              Inspection Analysis
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === "overview"
                  ? "bg-[#f5a623] text-white shadow-sm"
                  : "text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              <Layers size={14} />
              Overview & Exports
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "overview" && (
              <>
                <button
                  type="button"
                  onClick={handleExport}
                  aria-label="Export project as JSON"
                  className="inline-flex items-center gap-2 rounded-sm border border-[#22252a] bg-[#1a1c23] px-3 py-2 text-xs text-ca-ink font-mono hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                >
                  <Download aria-hidden size={16} />
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={handleExportYaml}
                  aria-label="Export project as YAML"
                  className="inline-flex items-center gap-2 rounded-sm border border-[#22252a] bg-[#1a1c23] px-3 py-2 text-xs text-ca-ink font-mono hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                >
                  <FileDown aria-hidden size={16} />
                  YAML
                </button>
                <button
                  type="button"
                  onClick={handleExportZip}
                  aria-label="Export project as zip bundle"
                  className="inline-flex items-center gap-2 rounded-sm border border-[#22252a] bg-[#1a1c23] px-3 py-2 text-xs text-ca-ink font-mono hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                >
                  <Archive aria-hidden size={16} />
                  Zip
                </button>
              </>
            )}
          </div>
        </header>

        {activeTab === "analysis" ? (
          rulesets.length === 0 ? (
            <div className="flex w-full items-center gap-3 rounded border border-[#22252a] bg-[#111318] p-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <span className="font-mono text-sm uppercase text-amber-200">
                SYSTEM IDLE: No inspection rule sets configured
              </span>
              <div className="ml-auto flex items-center gap-2">
                <span className="font-mono text-[10px] text-ca-ink-muted">Awaiting configuration</span>
                <Link
                  to="/projects/$projectId/rulesets/new"
                  params={{ projectId }}
                  className="rounded border border-amber-500/50 bg-amber-950/30 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-900/50"
                >
                  [ Initialize Rule Set ]
                </Link>
              </div>
            </div>
          ) : (
            <WorkpieceAnalyzeWorkspace
              key={activeRuleset.id}
              project={project}
              ruleset={activeRuleset}
              rulesets={rulesets}
              onSelectRuleset={(rid) => setActiveRulesetId(rid)}
            />
          )
        ) : (
          <div className="mx-auto w-full max-w-5xl">
            <ProjectEditorSections project={project} rulesets={rulesets} />

            <section
              aria-label="Project actions"
              className="mb-hmi-6 grid grid-cols-1 gap-3 md:grid-cols-3"
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
              className="mb-hmi-6 rounded-sm border border-[#22252a] bg-[#111318] p-4"
            >
              <h2 className="text-sm font-bold uppercase tracking-widest text-ca-ink">
                Categories
              </h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">
                Auto-apply resolver (Plan 67 PR-05): rule sets matched to each category, plus
                uncategorized globals.
              </p>
              {categoryEntries.length === 0 ? (
                <p className="mt-3 text-xs font-mono text-ca-ink-muted">
                  No categories defined. Add categories on the Categories tab to auto-apply rule sets.
                </p>
              ) : (
                <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {categoryEntries.map(([name, res]) => (
                    <li key={name} className="rounded-md border border-[#22252a] bg-[#1a1c23] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-hmi-body font-semibold uppercase tracking-wide text-ca-ink">
                          {name}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">
                          {res.matched.length} matched, {res.uncategorized.length} global
                        </span>
                      </div>
                      {res.applied.length > 0 ? (
                        <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">
                          {res.applied.map((r) => r.name).join(", ")}
                        </p>
                      ) : (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">
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
              className="mb-hmi-6 rounded-sm border border-[#22252a] bg-[#111318] p-4"
            >
              <h2 className="text-sm font-bold uppercase tracking-widest text-ca-ink">
                Rule sets in Run
              </h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">
                Multi-select rule sets to hand off to the Run picker. Reference/snapshot chains are
                surfaced so you know which ruleset ultimately drives the run.
              </p>
              <div className="mt-3">
                <RulesetPicker projectId={projectId} rulesets={rulesets} />
              </div>
            </section>

            <section
              aria-label="AI Testing settings"
              className="mb-hmi-6 rounded-sm border border-[#22252a] bg-[#111318] p-4"
            >
              <h2 className="text-sm font-bold uppercase tracking-widest text-ca-ink">
                AI Testing settings
              </h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">
                Placeholder (Plan 67 PR-03). Persisted per-project; consumed by upcoming AI runs.
              </p>
              <form
                className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3"
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
                <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">
                  Model
                  <input
                    name="model"
                    defaultValue={ai.model ?? ""}
                    placeholder="google/gemini-2.5-flash"
                    className="rounded-sm border border-[#22252a] bg-[#1a1c23] px-2 py-1 text-xs text-ca-ink font-mono"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">
                  Temperature
                  <input
                    name="temperature"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    defaultValue={ai.temperature ?? 0.2}
                    className="rounded-sm border border-[#22252a] bg-[#1a1c23] px-2 py-1 text-xs text-ca-ink font-mono"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted md:col-span-3">
                  System prompt
                  <textarea
                    name="systemPrompt"
                    rows={3}
                    defaultValue={ai.systemPrompt ?? ""}
                    placeholder="Optional guidance to prepend before every AI evaluation."
                    className="rounded-sm border border-[#22252a] bg-[#1a1c23] px-2 py-1 text-xs text-ca-ink font-mono"
                  />
                </label>
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-sm bg-[#f5a623] px-4 py-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                  >
                    Save AI settings
                  </button>
                </div>
              </form>
            </section>

            <section
              aria-label="Operator"
              className="rounded-sm border border-[#22252a] bg-[#111318] p-4"
            >
              <h2 className="text-sm font-bold uppercase tracking-widest text-ca-ink">
                Operator
              </h2>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">
                Legacy inspection surfaces. Not scoped to this project yet.
              </p>
              <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                <OperatorLink to="/setup" Icon={Settings} label="Setup" />
                <OperatorLink to="/run" Icon={Gauge} label="Run" />
                <OperatorLink to="/results" Icon={ListChecks} label="Results" />
                <OperatorLink to="/errors" Icon={AlertTriangle} label="NG events" />
              </ul>
            </section>
          </div>
        )}
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
      className="group flex items-start gap-3 rounded-sm border border-[#22252a] bg-[#111318] p-4 shadow-2xl transition hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-[#22252a] bg-[#1a1c23] text-[#f5a623]">
        <Icon aria-hidden size={20} />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-bold uppercase tracking-widest text-ca-ink">
          {label}
        </h3>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">{desc}</p>
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
        className="flex items-center gap-2 rounded-md border border-[#22252a] bg-[#1a1c23] px-3 py-2 text-xs text-ca-ink font-mono hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
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
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold uppercase tracking-widest text-[#f5a623]">
        Overview didn't load
      </h1>
      <p className="mt-2 text-xs font-mono text-ca-ink-muted">{error.message}</p>
      <button
        type="button"
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="mt-4 rounded-sm bg-[#f5a623] px-4 py-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}

function OverviewNotFound() {
  const { projectId } = Route.useParams();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold uppercase tracking-widest text-[#f5a623]">
        Project not found
      </h1>
      <p className="mt-2 text-xs font-mono text-ca-ink-muted">
        No project matches <span className="font-mono">{projectId}</span>.
      </p>
      <Link
        to="/projects"
        className="mt-4 rounded-sm bg-[#f5a623] px-4 py-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        All projects
      </Link>
    </div>
  );
}
