import { AnnouncePriorityType } from "@/lib/a11y/announcer";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { announce } from "@/lib/a11y/announcer";
import {
  Settings as SettingsIcon,
  FolderKanban,
  PlayCircle,
  Sparkles,
  ArrowUpRight,
  Camera,
  Sun,
  Sliders,
  FolderPlus,
  FolderOpen,
  Image as ImageIcon,
  ListChecks,
  FlaskConical,
  BarChart3,
  Tags,
  Keyboard,
  SlidersHorizontal,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { HomeError, HomePending, HomeErrorBoundary } from "@/components/home/HomeBoundaries";
import { useRouter } from "@tanstack/react-router";
import { RecentProjectsChip } from "@/components/home/RecentProjectsChip";
import { DataSourceToggle } from "@/components/data-source/DataSourceToggle";
import { GettingStarted } from "@/components/home/GettingStarted";
import { useRecentProjects } from "@/lib/stores/recent-projects-store";
import { ArrowRight, FolderPlus as FolderPlusIcon } from "lucide-react";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardHomeView } from "@/components/home/StandardHomeView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Control Automation, Pick a workflow" },
      {
        name: "description",
        content:
          "Configure the line, open a project, run a trial, or batch-test a ruleset with AI. Every screen is one click away.",
      },
      { property: "og:title", content: "Control Automation, Pick a workflow" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content:
          "Configure the line, open a project, run a trial, or batch-test a ruleset with AI. Every screen is one click away.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
  pendingComponent: HomePending,
  pendingMs: 200,
  errorComponent: HomeErrorComponent,
  notFoundComponent: () => (
    <HomeError error={new Error("Home content not found")} reset={() => window.location.reload()} />
  ),
});

function HomeErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  const retry = () => {
    router.invalidate();
    reset();
  };

  return <HomeError error={error as Error} reset={retry} />;
}

export enum ToneType {
  Cyan = "cyan",
  Amber = "amber",
  Green = "green",
  Violet = "violet",
}
export type Tone = ToneType;

interface Workflow {
  id: string;
  label: string;
  description: string;
  to: "/setup" | "/projects" | "/run" | "/ai-testing";
  icon: LucideIcon;
  tone: Tone;
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
    description: "Camera, lighting and ROI.",
    to: "/setup",
    icon: SettingsIcon,
    tone: ToneType.Cyan,
    quickActions: [
      { label: "Camera", to: "/settings/camera", icon: Camera },
      { label: "Rules", to: "/setup/rules", icon: Tags },
      { label: "Lighting", to: "/settings/lighting", icon: Sun },
      { label: "ROI", to: "/setup/roi", icon: Sliders },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    description: "Create or open a project.",
    to: "/projects",
    icon: FolderKanban,
    tone: ToneType.Amber,
    quickActions: [
      { label: "New", to: "/projects?new=1", icon: FolderPlus },
      { label: "Open", to: "/projects", icon: FolderOpen },
    ],
  },
  {
    id: "trial",
    label: "Trial run",
    description: "Run rules on an image.",
    to: "/run",
    icon: PlayCircle,
    tone: ToneType.Green,
    quickActions: [
      { label: "Image", to: "/run", icon: ImageIcon },
      { label: "Results", to: "/results", icon: ListChecks },
    ],
  },
  {
    id: "ai",
    label: "AI testing",
    description: "Batch test a ruleset.",
    to: "/ai-testing",
    icon: Sparkles,
    tone: ToneType.Violet,
    quickActions: [
      { label: "Batch", to: "/ai-testing", icon: FlaskConical },
      { label: "Report", to: "/results", icon: BarChart3 },
    ],
  },
] as const;

const TONE: Record<Tone, { ink: string; ring: string; glow: string }> = {
  cyan: {
    ink: "var(--home-tone-cyan-ink)",
    ring: "var(--home-tone-cyan-ring)",
    glow: "var(--home-tone-cyan-glow)",
  },
  amber: {
    ink: "var(--home-tone-amber-ink)",
    ring: "var(--home-tone-amber-ring)",
    glow: "var(--home-tone-amber-glow)",
  },
  green: {
    ink: "var(--home-tone-green-ink)",
    ring: "var(--home-tone-green-ring)",
    glow: "var(--home-tone-green-glow)",
  },
  violet: {
    ink: "var(--home-tone-violet-ink)",
    ring: "var(--home-tone-violet-ring)",
    glow: "var(--home-tone-violet-glow)",
  },
};

function Index() {
  const { mode } = useUiMode();
  const recentProjects = useRecentProjects();

  if (mode === UiModeType.Standard) {
    return <StandardHomeView recentProjects={recentProjects} />;
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0c10] text-ca-ink font-mono antialiased overflow-hidden">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center border-b border-[#22252a] bg-[#111318] px-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[#f5a623] uppercase tracking-wider">SYSTEM STATUS</span>
          <h1 className="text-sm font-bold text-ca-ink tracking-wide">HMI MAIN CONSOLE</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff00]"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ca-ink-muted">VISION ENGINE ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-2">
          
          {/* Workflows */}
          {WORKFLOWS.map((wf) => (
            <div key={wf.id} className="flex flex-col border border-[#22252a] bg-[#111318] transition-colors hover:border-[#444]">
              <div className="flex items-center justify-between border-b border-[#22252a] bg-[#15171e] px-4 py-3">
                <div className="flex items-center gap-3">
                  <wf.icon size={16} className={wf.tone === "amber" ? "text-[#f5a623]" : wf.tone === "cyan" ? "text-cyan-400" : wf.tone === "green" ? "text-[#00ff00]" : "text-purple-400"} />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-ca-ink">{wf.label}</h2>
                </div>
                <Link
                  to={wf.to}
                  className="inline-flex items-center gap-2 border border-[#444] bg-[#0b0c10] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ca-ink transition hover:border-[#f5a623] hover:text-[#f5a623]"
                >
                  ENTER <ArrowRight size={12} />
                </Link>
              </div>
              <div className="flex-1 p-4">
                <p className="mb-6 text-xs text-ca-ink-muted">{wf.description}</p>
                <div className="grid grid-cols-2 gap-3">
                  {wf.quickActions.map((qa) => (
                    <Link
                      key={qa.label}
                      to={qa.to as any}
                      className="flex items-center justify-between border border-[#333] bg-[#0b0c10] px-3 py-2 transition-colors hover:border-[#666] hover:bg-[#1a1c23]"
                    >
                      <div className="flex items-center gap-2">
                        <qa.icon size={14} className="text-ca-ink-muted" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ca-ink">{qa.label}</span>
                      </div>
                      <ArrowRight size={10} className="text-[#333]" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
