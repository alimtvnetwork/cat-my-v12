import React, { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Camera,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  ListChecks,
  PlayCircle,
  Settings as SettingsIcon,
  Sliders,
  Sparkles,
  Sun,
  Tags,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { useProjectStore } from "@/lib/projects/store";
import { DEFAULT_SMT_PROJECT_ID } from "@/lib/projects/default-smt-seed";

export interface StandardHomeViewProps {
  recentProjects?: Array<{ projectId: string; name: string; openedAt: number }>;
}

interface Workflow {
  id: string;
  label: string;
  description: string;
  to: "/setup" | "/projects" | "/run" | "/ai-testing";
  icon: LucideIcon;
  tone: "cyan" | "amber" | "green" | "violet";
  quickActions: readonly QuickAction[];
}

interface QuickAction {
  label: string;
  to: string;
  icon: LucideIcon;
}

const WORKFLOWS: readonly Workflow[] = [
  {
    id: "setup",
    label: "Setup",
    description: "Camera, lighting and ROI recipe preparation.",
    to: "/setup",
    icon: SettingsIcon,
    tone: "cyan",
    quickActions: [
      { label: "Camera", to: "/settings/camera", icon: Camera },
      { label: "Rules", to: "/setup/rules", icon: Tags },
      { label: "Analyzer", to: "/analyze", icon: Zap },
      { label: "ROI", to: "/setup/roi", icon: Sliders },
    ],
  },
  {
    id: "projects",
    label: "Project",
    description: "Create, open, and maintain inspection programs.",
    to: "/projects",
    icon: FolderKanban,
    tone: "amber",
    quickActions: [
      { label: "New", to: "/projects?new=1", icon: FolderPlus },
      { label: "Open", to: "/projects", icon: FolderOpen },
    ],
  },
  {
    id: "trial",
    label: "Trial run",
    description: "Run a recipe against a sample image before production.",
    to: "/run",
    icon: PlayCircle,
    tone: "green",
    quickActions: [
      { label: "Analyzer", to: "/analyze", icon: Zap },
      { label: "Results", to: "/results", icon: ListChecks },
    ],
  },
  {
    id: "ai",
    label: "AI testing",
    description: "Batch-test rulesets and compare inspection results.",
    to: "/ai-testing",
    icon: Sparkles,
    tone: "violet",
    quickActions: [
      { label: "Batch", to: "/ai-testing", icon: FlaskConical },
      { label: "Report", to: "/results", icon: BarChart3 },
    ],
  },
] as const;

const TONE_CLASS: Record<
  Workflow["tone"],
  { icon: string; border: string; glow: string; pip: string }
> = {
  cyan: {
    icon: "text-cyan-300",
    border: "hover:border-cyan-400/70",
    glow: "from-cyan-400/10",
    pip: "bg-cyan-400 shadow-[0_0_6px_#22d3ee]",
  },
  amber: {
    icon: "text-amber-300",
    border: "hover:border-amber-400/70",
    glow: "from-amber-400/10",
    pip: "bg-amber-400 shadow-[0_0_6px_#f59e0b]",
  },
  green: {
    icon: "text-emerald-300",
    border: "hover:border-emerald-400/70",
    glow: "from-emerald-400/10",
    pip: "bg-emerald-400 shadow-[0_0_6px_#10b981]",
  },
  violet: {
    icon: "text-violet-300",
    border: "hover:border-violet-400/70",
    glow: "from-violet-400/10",
    pip: "bg-violet-400 shadow-[0_0_6px_#8b5cf6]",
  },
};

export function StandardHomeView({
  recentProjects = [],
}: StandardHomeViewProps): React.JSX.Element {
  const projectsInStore = useProjectStore((s) => s.projects);
  const smtDefaultProject = projectsInStore[DEFAULT_SMT_PROJECT_ID];
  const allStoreProjects = Object.values(projectsInStore);

  const displayProjects = useMemo(() => {
    if (recentProjects.length > 0) return recentProjects;

    return allStoreProjects.map((p) => ({
      projectId: p.id,
      name: p.name,
      openedAt: p.createdAt,
    }));
  }, [recentProjects, allStoreProjects]);

  const primaryProject = displayProjects[0] || (smtDefaultProject ? {
    projectId: smtDefaultProject.id,
    name: smtDefaultProject.name,
    openedAt: smtDefaultProject.createdAt,
  } : undefined);

  return (
    <StandardAppShell activeNav="home">
      <div className="flex-1 overflow-auto hmi-cad-grid-bg p-4 text-[#f8fafc]">
        <div className="grid min-h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-w-0 flex-col gap-4">
            <h1 className="sr-only">Home</h1>
            <h2 className="sr-only">Pick a workflow</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {WORKFLOWS.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-4">
            <section className="rounded-xl hmi-machined-card bg-[#0e1420]/95 overflow-hidden">
              <div className="border-b border-white/[0.08] bg-[#121927] px-3.5 py-2.5">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#f8fafc]">
                  Active & Recent Programs
                </h2>
              </div>
              <div className="space-y-2 p-3">
                {displayProjects.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#222938] bg-[#0c1017] p-6 text-center">
                    <FolderKanban size={24} className="mx-auto mb-3 text-[#64748b]" />
                    <p className="text-xs font-semibold uppercase text-[#f8fafc]">No program loaded</p>
                    <p className="mt-1 text-xs text-[#94a3b8]">
                      Create a project to start inspection setup.
                    </p>
                  </div>
                ) : (
                  displayProjects.slice(0, 5).map((project) => (
                    <ProjectRow key={project.projectId} project={project} />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl hmi-machined-card bg-[#0e1420]/95 overflow-hidden">
              <div className="border-b border-white/[0.08] bg-[#121927] px-3.5 py-2.5">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[#f8fafc]">
                  Line Readiness
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-px bg-[#1e293b]/70">
                <StatusCell label="Vision Engine" value="Active (60 FPS)" tone="good" variant="cyan" />
                <StatusCell label="Camera Link" value="Basler Ace 4K" tone="good" variant="cyan" />
                <StatusCell label="Lighting Matrix" value="Strobe 80%" tone="good" />
                <StatusCell
                  label="Active Recipe"
                  value={primaryProject ? primaryProject.name.slice(0, 16) : "None"}
                  tone={primaryProject ? "good" : "neutral"}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </StandardAppShell>
  );
}

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const tone = TONE_CLASS[workflow.tone];
  const Icon = workflow.icon;

  return (
    <article
      data-tour={workflow.id === "projects" ? "home-project-workflow" : undefined}
      className={`group relative min-h-[220px] overflow-hidden rounded-xl hmi-machined-card bg-[#0e1420]/95 p-4 backdrop-blur-md transition-all duration-200 hover:border-[#334460] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_12px_32px_-8px_rgba(0,0,0,0.7)] ${tone.border}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow} to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-80`}
      />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-[#141b2b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-transform duration-200 group-hover:scale-105">
            <Icon size={20} className={tone.icon} />
          </div>
          <Link
            to={workflow.to}
            data-testid="standard-home-workflow-enter"
            className="group/enter item-pad-cta inline-flex items-center gap-2 rounded-md border border-white/[0.12] bg-gradient-to-b from-[#182335] to-[#101724] text-[10px] font-bold uppercase leading-none tracking-wider text-[#f8fafc] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_2px_6px_rgba(0,0,0,0.5)] transition-all hover:border-[oklch(0.76_0.145_210/0.8)] hover:text-[oklch(0.76_0.145_210)] hover:shadow-[0_0_12px_rgba(34,211,238,0.25)] active:scale-[0.98]"
          >
            <span className="leading-none">Enter</span>
            <ArrowRight size={12} className="transition-transform duration-150 group-hover/enter:translate-x-1" />
          </Link>
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-black uppercase tracking-wider text-[#f8fafc]">
            {workflow.label}
          </h2>
          <p className="mt-1 text-xs text-[#94a3b8] leading-relaxed">{workflow.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-2" data-testid="standard-home-quick-actions">
            {workflow.quickActions.map((action) => {
              const ActionIcon = action.icon;

              return (
                <Link
                  key={action.label}
                  to={action.to as any}
                  className="group/qa item-pad-chip relative flex items-center justify-between rounded-md border border-white/[0.07] bg-[#131a29]/90 text-xs font-semibold leading-none text-[#f8fafc] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition hover:border-[oklch(0.76_0.145_210/0.6)] hover:bg-[#1a2337] hover:shadow-[0_2px_12px_-2px_oklch(0.76_0.145_210/0.3)]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`h-2.5 w-0.5 rounded-full shrink-0 ${tone.pip}`} />
                    <ActionIcon size={14} className="shrink-0 text-[#94a3b8]" />
                    <span className="truncate uppercase font-medium">{action.label}</span>
                  </span>
                  <ArrowRight size={11} className="shrink-0 text-[#94a3b8] transition-transform group-hover/qa:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}

function ProjectRow({
  project,
}: {
  project: { projectId: string; name: string; openedAt: number };
}): React.JSX.Element {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.projectId }}
      className="block rounded-lg border border-white/[0.06] bg-[#0c121c] p-3 transition hover:border-[oklch(0.76_0.145_210/0.6)] hover:bg-[#131b2a]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          </span>
          <span className="truncate text-sm font-bold uppercase text-[#f8fafc]">{project.name}</span>
        </div>
        <ArrowRight size={13} className="shrink-0 text-[#94a3b8]" />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 pl-4 text-[10px] font-mono uppercase text-[#94a3b8]">
        <span>ID {project.projectId.slice(0, 6)}</span>
        <span>{new Date(project.openedAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}

function StatusCell({
  label,
  value,
  tone,
  variant = "emerald",
}: {
  label: string;
  value: string;
  tone: "good" | "neutral";
  variant?: "emerald" | "cyan";
}): React.JSX.Element {
  const isGood = tone === "good";
  const isCyan = variant === "cyan";

  return (
    <div className="bg-[#0b1018] p-3 transition-colors hover:bg-[#0e1420]">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8]">{label}</div>
      <div className="mt-1.5 flex items-center gap-2">
        {isGood ? (
          <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                isCyan ? "bg-cyan-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-block h-1.5 w-1.5 rounded-full ${
                isCyan
                  ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                  : "bg-emerald-400 shadow-[0_0_8px_#10b981]"
              }`}
            />
          </span>
        ) : (
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500 shadow-[0_0_4px_rgba(148,163,184,0.3)]" />
        )}
        <span
          className={`text-xs font-mono font-bold uppercase tracking-tight truncate ${
            isGood
              ? isCyan
                ? "text-cyan-300"
                : "text-emerald-400"
              : "text-[#cbd5e1]"
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
