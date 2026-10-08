import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
  type LucideIcon,
} from "lucide-react";
import { StandardAppShell } from "@/components/layout/StandardAppShell";

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
      { label: "Lighting", to: "/settings/lighting", icon: Sun },
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
      { label: "Image", to: "/run", icon: ImageIcon },
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

const TONE_CLASS: Record<Workflow["tone"], { icon: string; border: string; glow: string }> = {
  cyan: {
    icon: "text-cyan-300",
    border: "hover:border-cyan-400/70",
    glow: "from-cyan-400/10",
  },
  amber: {
    icon: "text-amber-300",
    border: "hover:border-amber-400/70",
    glow: "from-amber-400/10",
  },
  green: {
    icon: "text-emerald-300",
    border: "hover:border-emerald-400/70",
    glow: "from-emerald-400/10",
  },
  violet: {
    icon: "text-violet-300",
    border: "hover:border-violet-400/70",
    glow: "from-violet-400/10",
  },
};

export function StandardHomeView({
  recentProjects = [],
}: StandardHomeViewProps): React.JSX.Element {
  const navigate = useNavigate();

  const primaryProject = recentProjects[0];
  const handlePrimary = () => {
    if (primaryProject) {
      navigate({ to: "/projects/$projectId", params: { projectId: primaryProject.projectId } });

      return;
    }

    navigate({ to: "/projects?new=1" as any });
  };

  return (
    <StandardAppShell
      activeNav="home"
      title="HMI Main Console"
      subtitle="Workflow launch and program status"
    >
      <div className="flex-1 overflow-auto bg-[#080b0e] p-4 text-ca-ink">
        <div className="grid min-h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-w-0 flex-col gap-4">
            <div className="rounded border border-ca-border bg-[#11161b] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]" />
                    System Status
                  </div>
                  <h1 className="text-lg font-black uppercase tracking-wide text-ca-ink">
                    HMI Main Console
                  </h1>
                  <p className="mt-1 text-xs text-ca-ink-muted">
                    Select a workflow, continue the last program, or start a new inspection setup.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrimary}
                  className="inline-flex items-center gap-2 rounded border border-ca-primary/50 bg-ca-primary px-4 py-2 text-xs font-bold uppercase text-ca-on-primary shadow-sm transition hover:brightness-110"
                >
                  {primaryProject ? `Continue ${primaryProject.name}` : "Create Project"}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {WORKFLOWS.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-4">
            <section className="rounded border border-ca-border bg-[#11161b]">
              <div className="border-b border-ca-border px-3 py-2">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-ca-ink">
                  Recent Programs
                </h2>
              </div>
              <div className="space-y-2 p-3">
                {recentProjects.length === 0 ? (
                  <div className="rounded border border-dashed border-ca-border/70 bg-[#0b0f12] p-6 text-center">
                    <FolderKanban size={24} className="mx-auto mb-3 text-ca-ink-muted" />
                    <p className="text-xs font-semibold uppercase text-ca-ink">No program loaded</p>
                    <p className="mt-1 text-xs text-ca-ink-muted">
                      Create a project to start inspection setup.
                    </p>
                  </div>
                ) : (
                  recentProjects.slice(0, 5).map((project) => (
                    <ProjectRow key={project.projectId} project={project} />
                  ))
                )}
              </div>
            </section>

            <section className="rounded border border-ca-border bg-[#11161b]">
              <div className="border-b border-ca-border px-3 py-2">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-ca-ink">
                  Line Readiness
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-px bg-ca-border">
                <StatusCell label="Vision Engine" value="Active" tone="good" />
                <StatusCell label="Camera Link" value="Ready" tone="good" />
                <StatusCell label="Lighting" value="Standby" tone="neutral" />
                <StatusCell label="Recipe" value={primaryProject ? "Loaded" : "None"} tone="neutral" />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </StandardAppShell>
  );
}

function WorkflowCard({ workflow }: { workflow: Workflow }): React.JSX.Element {
  const tone = TONE_CLASS[workflow.tone];
  const Icon = workflow.icon;

  return (
    <article
      className={`group relative min-h-[220px] overflow-hidden rounded border border-ca-border bg-[#11161b] transition ${tone.border}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow} to-transparent opacity-70`}
      />
      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded border border-ca-border bg-[#0b0f12]">
            <Icon size={20} className={tone.icon} />
          </div>
          <Link
            to={workflow.to}
            className="inline-flex items-center gap-2 rounded border border-ca-border bg-[#0b0f12] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ca-ink transition hover:border-ca-primary hover:text-ca-primary"
          >
            Enter
            <ArrowRight size={12} />
          </Link>
        </div>

        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-ca-ink">
            {workflow.label}
          </h2>
          <p className="mt-1 text-xs text-ca-ink-muted">{workflow.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {workflow.quickActions.map((action) => {
              const ActionIcon = action.icon;

              return (
                <Link
                  key={action.label}
                  to={action.to as any}
                  className="flex items-center justify-between rounded border border-ca-border bg-[#0b0f12] px-3 py-2 text-xs font-semibold text-ca-ink transition hover:border-ca-primary/60 hover:bg-ca-panel-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ActionIcon size={14} className="shrink-0 text-ca-ink-muted" />
                    <span className="truncate uppercase">{action.label}</span>
                  </span>
                  <ArrowRight size={11} className="shrink-0 text-ca-ink-muted" />
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
      className="block rounded border border-ca-border bg-[#0b0f12] p-3 transition hover:border-ca-primary/60 hover:bg-ca-panel-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-bold uppercase text-ca-ink">{project.name}</span>
        <ArrowRight size={13} className="shrink-0 text-ca-ink-muted" />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-mono uppercase text-ca-ink-muted">
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
}: {
  label: string;
  value: string;
  tone: "good" | "neutral";
}): React.JSX.Element {
  return (
    <div className="bg-[#0b0f12] p-3">
      <div className="text-[10px] font-mono uppercase text-ca-ink-muted">{label}</div>
      <div
        className={`mt-1 text-sm font-bold uppercase ${
          tone === "good" ? "text-emerald-400" : "text-ca-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
