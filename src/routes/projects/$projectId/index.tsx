import { HmiShell } from "@/components/hmi/HmiShell";
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
    <HmiShell>
      <div className="flex flex-col h-full bg-[#0b0c10]">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#22252a] bg-[#111318] px-6 py-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ca-ink-muted">PROJECT</span>
              <span className="text-[10px] font-mono text-ca-ink-muted">{project.id}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ca-ink">{project.name}</h1>
            <div className="mt-1 flex items-center gap-4 text-xs text-ca-ink-muted">
              <span>{rulesets.length} rule sets</span>
              <span>�</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportZip}
              className="flex h-8 items-center gap-2 rounded border border-[#333] bg-[#1a1c23] px-3 text-xs font-bold text-ca-ink hover:bg-[#22252a] transition-colors"
            >
              <Download size={14} />
              JSON
            </button>
            <button
              onClick={handleExportZip}
              className="flex h-8 items-center gap-2 rounded border border-[#333] bg-[#1a1c23] px-3 text-xs font-bold text-ca-ink hover:bg-[#22252a] transition-colors"
            >
              <FileCode size={14} />
              YAML
            </button>
            <button
              onClick={handleExportZip}
              className="flex h-8 items-center gap-2 rounded border border-[#333] bg-[#1a1c23] px-3 text-xs font-bold text-ca-ink hover:bg-[#22252a] transition-colors"
            >
              <Archive size={14} />
              Zip
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex h-8 items-center gap-2 rounded bg-ca-primary px-4 text-xs font-bold uppercase tracking-wider text-[#000] transition-colors hover:brightness-110"
            >
              <Play size={14} className="fill-current" />
              Run
            </button>
          </div>
        </header>
        
        {/* Project Tabs */}
        <div className="flex w-full items-center gap-6 border-b border-[#22252a] bg-[#111318] px-6">
          {["Overview", "Camera", "Rule sets", "Categories", "Runs", "Trial run", "AI testing"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`border-b-2 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === tab
                  ? "border-ca-primary text-ca-primary"
                  : "border-transparent text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Panel */}
        <div className="flex min-h-0 flex-1 bg-[#0b0c10]">
          {activeTab !== "Overview" && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-ca-ink-muted text-sm">The {activeTab} view is not yet implemented.</p>
            </div>
          )}
          {activeTab === "Overview" && (
            <>
              {/* Left Side: Viewport */}
              <div className="flex flex-1 flex-col border-r border-[#22252a] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button className="flex h-7 w-7 items-center justify-center rounded bg-[#1a1c23] text-ca-ink hover:bg-[#22252a]">
                      <Image size={14} />
                    </button>
                    <button className="flex h-7 w-7 items-center justify-center rounded bg-[#1a1c23] text-ca-ink hover:bg-[#22252a]">
                      <SplitSquareHorizontal size={14} />
                    </button>
                    <button className="flex h-7 w-7 items-center justify-center rounded bg-[#1a1c23] text-ca-ink hover:bg-[#22252a]">
                      <Camera size={14} />
                    </button>
                  </div>
                  <button className="rounded bg-[#22252a] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ca-ink transition-colors hover:bg-[#333]">
                    Evaluate Inspection
                  </button>
                </div>
                
                {/* Viewport Area */}
                <div className="relative flex min-h-0 flex-1 items-center justify-center rounded border border-[#22252a] bg-black overflow-hidden">
                  <span className="font-mono text-xs text-ca-ink-muted">NO IMAGE SELECTED</span>
                  
                  {/* Zoom Tool */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded border border-[#22252a] bg-[#111318]/90 p-1 backdrop-blur">
                    <button className="flex h-6 w-6 items-center justify-center rounded text-ca-ink-muted hover:bg-[#22252a] hover:text-ca-ink">
                      -
                    </button>
                    <span className="w-12 text-center font-mono text-[10px] text-ca-ink">100%</span>
                    <button className="flex h-6 w-6 items-center justify-center rounded text-ca-ink-muted hover:bg-[#22252a] hover:text-ca-ink">
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side: Panels */}
              <div className="flex w-[380px] shrink-0 flex-col overflow-y-auto bg-[#111318]">
                
                {/* Rules Panel */}
                <div className="flex flex-col border-b border-[#22252a]">
                  <div className="flex items-center justify-between border-b border-[#22252a] bg-[#1a1c23] px-4 py-2">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-ca-ink">Rules</h2>
                    <Link 
                      to="/projects/$projectId/rulesets/new"
                      params={{ projectId: project.id }}
                      className="text-ca-ink-muted transition-colors hover:text-ca-primary"
                      title="Create Ruleset"
                    >
                      <Plus size={16} />
                    </Link>
                  </div>
                  <div className="bg-[#111318] px-4 py-2">
                    <p className="leading-relaxed text-[10px] text-ca-ink-muted">
                      {rulesets.length} rulesets in evaluation order. Use up/down to reorder, trash to remove.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2 p-3 pt-0">
                    {rulesets.length === 0 ? (
                      <div className="flex items-center justify-center rounded border border-dashed border-[#333] py-6">
                        <span className="text-xs text-ca-ink-muted">No rulesets defined</span>
                      </div>
                    ) : (
                      rulesets.map((rs, idx) => (
                        <div key={rs.id} className="group flex items-center gap-2 rounded border border-[#22252a] bg-[#15171d] p-2 hover:border-[#444]">
                          <div className="flex flex-col items-center justify-center px-1 text-[10px] font-bold text-ca-ink-muted">
                            {String(idx + 1).padStart(2, "0")}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-xs font-bold text-ca-ink">{rs.name}</span>
                              <span className="rounded bg-[#22252a] px-1.5 py-0.5 text-[9px] font-bold text-ca-ink-muted">
                                {rs.rules.length} RULES
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {rs.rules.slice(0, 15).map((r) => (
                                <Link
                                  key={r.id}
                                  to="/projects/$projectId/rulesets/$rulesetId/tune/$ruleId"
                                  params={{ projectId: project.id, rulesetId: rs.id, ruleId: r.id }}
                                  className="flex h-5 w-5 items-center justify-center rounded bg-[#22252a] text-[10px] font-bold text-ca-ink transition-colors hover:bg-ca-primary hover:text-black"
                                  title={r.name}
                                >
                                  {r.name.charAt(0).toUpperCase()}
                                </Link>
                              ))}
                              {rs.rules.length > 15 && (
                                <span className="text-[9px] text-ca-ink-muted">+{rs.rules.length - 15}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100">
                            <Link
                              to="/projects/$projectId/rulesets/$rulesetId/add-rule"
                              params={{ projectId: project.id, rulesetId: rs.id }}
                              className="p-1 text-ca-ink-muted hover:text-ca-primary"
                              title="Add Rule"
                            >
                              <Plus size={12} />
                            </Link>
                            <button className="p-1 text-ca-ink-muted hover:text-red-400"><Archive size={12} /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Image Samples Panel */}
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center justify-between border-b border-[#22252a] border-t border-t-transparent bg-[#1a1c23] px-4 py-2">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-ca-ink">Image Samples</h2>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#22252a] px-1.5 py-0.5 text-[9px] font-bold text-ca-ink-muted">0</span>
                      <button className="text-ca-ink-muted transition-colors hover:text-ca-primary">
                        <FileDown size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 p-3">
                    <button className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded border border-dashed border-[#333] bg-[#15171d] transition-colors hover:border-ca-primary hover:bg-ca-primary/5">
                      <FileDown size={20} className="text-ca-ink-muted" />
                      <span className="text-[10px] font-bold uppercase text-ca-ink-muted">Upload</span>
                    </button>
                    <button className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded border border-dashed border-[#333] bg-[#15171d] transition-colors hover:border-ca-primary hover:bg-ca-primary/5">
                      <ScanSearch size={20} className="text-ca-ink-muted" />
                      <span className="text-[10px] font-bold uppercase text-ca-ink-muted">Camera</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
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
            <Button onClick={handleRunConfirmed} disabled={running}>
              {running ? "Starting..." : "Confirm Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HmiShell>
  );
}
