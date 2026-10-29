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
  Activity,
  Cpu,
  Radio,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { HmiShell } from "@/components/hmi";
import { HomeError, HomePending, HomeErrorBoundary } from "@/components/home/HomeBoundaries";
import { useRouter } from "@tanstack/react-router";
import { RecentProjectsChip } from "@/components/home/RecentProjectsChip";
import { DataSourceToggle } from "@/components/data-source/DataSourceToggle";
import { GettingStarted } from "@/components/home/GettingStarted";
import { useRecentProjects } from "@/lib/stores/recent-projects-store";
import { ArrowRight, FolderPlus as FolderPlusIcon } from "lucide-react";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardHomeView } from "@/components/home/StandardHomeView";
import { MissionControlDashboard } from "@/components/cyber/MissionControlDashboard";

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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastBucketRef = useRef<string>("");
  const rafRef = useRef<number | null>(null);
  const keyboardScrollRef = useRef<boolean>(false);
  const clearKeyboardTimerRef = useRef<number | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const progressWrapRef = useRef<HTMLDivElement | null>(null);
  const progressLabelRef = useRef<HTMLSpanElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const hideProgressTimerRef = useRef<number | null>(null);
  const PREF_KEY = "home.scrollSync.pointer";
  const [pointerSync, setPointerSync] = useState<boolean>(false);
  const { mode } = useUiMode();
  const recentProjects = useRecentProjects(5);

  useEffect(() => {
    try {
      setPointerSync(window.localStorage.getItem(PREF_KEY) === "1");
    } catch {
      /* storage unavailable, keep default */
    }
  }, []);

  const togglePointerSync = useCallback(() => {
    setPointerSync((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(PREF_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / privacy-mode errors */
      }

      announce(
        next
          ? "Scroll progress announcements on for mouse and touchpad"
          : "Scroll progress announcements limited to keyboard",
        AnnouncePriorityType.Polite,
      );

      return next;
    });
  }, []);

  const pointerSyncRef = useRef(pointerSync);
  useEffect(() => {
    pointerSyncRef.current = pointerSync;
  }, [pointerSync]);

  const bucketFor = useCallback((el: HTMLDivElement): { key: string; msg: string; pct: number } => {
    const max = Math.max(0, el.scrollHeight - el.clientHeight);

    if (max <= 0) return { key: "none", msg: "Nothing to scroll", pct: 0 };
    const top = el.scrollTop;
    const pct = Math.round((top / max) * 100);

    if (top <= 4) return { key: "top", msg: "Scrolled to top", pct: 0 };

    if (max - top <= 4) return { key: "bottom", msg: "Scrolled to bottom", pct: 100 };

    if (pct >= 90) return { key: "near-bottom", msg: `Near bottom, ${pct} percent`, pct };
    const bucket = Math.round(pct / 10) * 10;

    return { key: `pct-${bucket}`, msg: `Scrolled ${bucket} percent`, pct };
  }, []);

  const showProgress = useCallback(() => {
    const wrap = progressWrapRef.current;

    if (!wrap) return;
    wrap.dataset.visible = "true";

    if (hideProgressTimerRef.current !== null) window.clearTimeout(hideProgressTimerRef.current);
    hideProgressTimerRef.current = window.setTimeout(() => {
      if (progressWrapRef.current) progressWrapRef.current.dataset.visible = "false";
    }, 1400);
  }, []);

  const handleScroll = useCallback(() => {
    if (!keyboardScrollRef.current && !pointerSyncRef.current) return;
    const el = scrollRef.current;

    if (!el) return;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const { key, msg, pct } = bucketFor(el);
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      const exactPct = max > 0 ? (el.scrollTop / max) * 100 : 0;

      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${(exactPct / 100).toFixed(4)})`;
      }

      if (progressLabelRef.current) {
        progressLabelRef.current.textContent = `${pct}%`;
      }

      if (progressWrapRef.current) {
        progressWrapRef.current.setAttribute("aria-valuenow", String(pct));
      }

      showProgress();

      if (key !== lastBucketRef.current) {
        lastBucketRef.current = key;
        if (statusRef.current) statusRef.current.textContent = msg;
      }
    });
  }, [bucketFor, showProgress]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const keys = ["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"];

      if (keys.includes(e.key) === false) return;
      keyboardScrollRef.current = true;
      showProgress();

      if (clearKeyboardTimerRef.current !== null)
        window.clearTimeout(clearKeyboardTimerRef.current);
      clearKeyboardTimerRef.current = window.setTimeout(() => {
        keyboardScrollRef.current = false;
      }, 400);
    },
    [showProgress],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

      if (clearKeyboardTimerRef.current !== null)
        window.clearTimeout(clearKeyboardTimerRef.current);

      if (hideProgressTimerRef.current !== null) window.clearTimeout(hideProgressTimerRef.current);
    };
  }, []);

  if (mode === UiModeType.Standard) {
    return <StandardHomeView recentProjects={recentProjects} />;
  }

  return (
    <HomeErrorBoundary>
      <HmiShell title="Home" hideHeader>
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={progressWrapRef}
            role="progressbar"
            aria-label="Home scroll progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            data-visible="false"
            data-testid="home-scroll-progress"
            className="absolute inset-x-0 top-0 z-20 flex items-center gap-hmi-2 px-hmi-3 pt-hmi-1 opacity-60 transition-opacity duration-200 data-[visible=true]:opacity-100 motion-reduce:transition-none"
          >
            <div className="pointer-events-none relative h-1 flex-1 overflow-hidden rounded-full bg-ca-border/60">
              <div
                ref={progressFillRef}
                className="h-full w-full origin-left rounded-full bg-ca-primary transition-transform duration-150 ease-out motion-reduce:transition-none"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
            <span
              ref={progressLabelRef}
              className="min-w-[2.5rem] text-right tabular-nums text-hmi-caption text-ca-ink-muted"
            >
              0%
            </span>
            <button
              type="button"
              onClick={togglePointerSync}
              aria-pressed={pointerSync}
              aria-label={
                pointerSync
                  ? "Disable mouse and touchpad scroll progress announcements"
                  : "Enable mouse and touchpad scroll progress announcements"
              }
              title={
                pointerSync
                  ? "Mouse & touchpad sync: on"
                  : "Mouse & touchpad sync: off (keyboard only)"
              }
              data-testid="home-scroll-progress-toggle"
              className="hmi-focus-ring pointer-events-auto inline-flex items-center gap-hmi-1 rounded-md border border-ca-border bg-ca-panel px-hmi-2 py-0.5 text-hmi-caption font-medium text-ca-ink-muted hover:bg-ca-panel-2 aria-pressed:border-ca-primary/60 aria-pressed:bg-ca-primary/10 aria-pressed:text-ca-ink"
            >
              <span aria-hidden>{pointerSync ? "🖱︎ On" : "🖱︎ Off"}</span>
            </button>
            <div
              ref={statusRef}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-testid="home-scroll-progress-status"
              className="sr-only"
            />
          </div>

          <div
            ref={scrollRef}
            tabIndex={0}
            role="region"
            aria-label="Home content, scrollable. Use arrow keys, Page Up, Page Down, Home, and End to scroll."
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            className="hmi-focus-ring-inset flex min-w-0 flex-1 flex-col overflow-auto"
          >
            <div className="mx-auto w-full max-w-6xl px-hmi-6 pb-hmi-6 pt-hmi-4">
              <h1 className="sr-only">Home</h1>
              <div className="flex flex-wrap items-center gap-hmi-3">
                <RecentProjectsChip />
                <DataSourceToggle />
              </div>

              <ExecutiveTelemetryHero />

              <PrimaryCta />

              <div className="mt-hmi-6 grid grid-cols-1 gap-hmi-3 sm:mt-hmi-8 sm:gap-hmi-4 md:grid-cols-2">
                {WORKFLOWS.map((w) => (
                  <WorkflowCard key={w.id} workflow={w} />
                ))}
              </div>

              <div className="mt-hmi-4 sm:mt-hmi-3">
                <GettingStarted />
              </div>

              <HeroUtilityStrip />
            </div>
          </div>
        </div>
      </HmiShell>
    </HomeErrorBoundary>
  );
}

function ExecutiveTelemetryHero(): React.JSX.Element {
  return (
    <div className="relative mt-hmi-4 overflow-hidden rounded-2xl border border-ca-border/80 bg-gradient-to-br from-ca-panel/95 via-ca-panel/75 to-ca-bg/95 p-5 shadow-[0_12px_36px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-ca-primary/15 blur-3xl"
      />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-ca-primary/50 bg-ca-primary/10 text-ca-primary shadow-[0_0_20px_color-mix(in_oklab,var(--ca-primary)_35%,transparent),inset_0_1px_0_0_rgba(255,255,255,0.2)]">
            <Activity size={24} strokeWidth={2} />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ca-ok opacity-75" />
              <span className="relative inline-block h-3 w-3 rounded-full bg-ca-ok shadow-[0_0_8px_var(--ca-ok)]" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-ca-ok/40 bg-ca-ok/10 px-1.5 py-[1px] text-[10px] font-mono font-bold uppercase tracking-widest text-ca-ok shadow-[0_0_8px_color-mix(in_oklab,var(--ca-ok)_25%,transparent)]">
                SYSTEM OK
              </span>
              <span className="text-ca-border/80">·</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-ca-ink-muted">
                STATION-A1 // LINE 04 // SMT VISION
              </span>
            </div>

            <h2 className="mt-1 font-display text-lg font-black uppercase tracking-tight text-ca-ink">
              Optical Vision Inspection System
            </h2>

            <p className="mt-0.5 text-xs text-ca-ink-muted font-medium">
              Continuous multi-spectral defect classification & micron-scale tolerance verification
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
          <div className="flex items-center gap-2 rounded-lg border border-ca-border/80 bg-ca-bg/90 px-3 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <Radio size={13} className="text-ca-primary" />
            <span className="text-[11px] font-mono font-semibold text-ca-ink-muted">FPS</span>
            <span className="font-mono text-xs font-bold text-ca-ink">59.9</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-ca-border/80 bg-ca-bg/90 px-3 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <Cpu size={13} className="text-ca-primary" />
            <span className="text-[11px] font-mono font-semibold text-ca-ink-muted">LATENCY</span>
            <span className="font-mono text-xs font-bold text-ca-ok">14.2ms</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-ca-ok/40 bg-ca-ok/15 px-3 py-1.5 shadow-[0_0_14px_color-mix(in_oklab,var(--ca-ok)_25%,transparent)]">
            <ShieldCheck size={14} className="text-ca-ok" />
            <span className="text-[11px] font-mono font-bold text-ca-ok">PASS 99.8%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrimaryCta() {
  const recent = useRecentProjects(1);
  const navigate = useNavigate();
  const top = recent[0];
  const label = top ? `Continue ${top.name}` : "Create your first project";
  const onClick = () => {
    if (top) {
      navigate({ to: "/projects/$projectId", params: { projectId: top.projectId } });
    } else {
      navigate({ to: "/projects?new=1" as any });
    }
  };

  return (
    <div className="mt-hmi-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        data-testid="home-primary-cta"
        className="hmi-focus-ring group relative inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-ca-primary via-ca-primary to-ca-primary/90 px-5 py-2.5 text-hmi-body font-bold text-ca-on-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_0_24px_-2px_color-mix(in_oklab,var(--ca-primary)_45%,transparent)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_32px_color-mix(in_oklab,var(--ca-primary)_60%,transparent)] active:scale-[0.99]"
      >
        <span>{label}</span>
        <ArrowRight
          size={16}
          aria-hidden
          strokeWidth={2.5}
          className="shrink-0 transition-transform duration-200 group-hover:translate-x-1"
        />
      </button>

      {top ? (
        <button
          type="button"
          data-testid="home-create-project"
          onClick={() => navigate({ to: "/projects?new=1" as any })}
          className="hmi-focus-ring group inline-flex items-center gap-2 rounded-xl border border-ca-border/80 bg-ca-panel/80 px-4 py-2.5 text-hmi-body font-semibold text-ca-ink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_2px_8px_-2px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-200 hover:border-ca-primary/50 hover:bg-ca-panel-2 active:scale-[0.99]"
        >
          <FolderPlusIcon
            size={16}
            aria-hidden
            strokeWidth={2}
            className="shrink-0 text-ca-ink-muted transition-colors group-hover:text-ca-primary"
          />
          <span>Create project</span>
        </button>
      ) : null}

      {top ? (
        <>
          <h2 className="sr-only">Pick a workflow</h2>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-ca-border/50 bg-ca-panel/40 px-2.5 py-1 font-mono text-[11px] text-ca-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-ca-ink-muted/50" />
            <span suppressHydrationWarning>
              Last opened {new Date(top.openedAt).toISOString().slice(0, 10)}
            </span>
          </span>
        </>
      ) : (
        <>
          <h2 className="sr-only">Pick a workflow</h2>
          <span className="text-hmi-caption text-ca-ink-muted font-medium">
            Or pick a workflow below to jump straight to a screen.
          </span>
        </>
      )}
    </div>
  );
}

const WORKFLOW_STATUS_BADGES: Record<string, string> = {
  setup: "HARDWARE READY",
  projects: "14 ACTIVE",
  trial: "LIVE ENGINE",
  ai: "AI INFERENCE",
};

function HeroUtilityStrip() {
  const items: readonly { to: string; label: string; hint: string; icon: LucideIcon }[] = [
    { to: "/shortcuts", label: "Shortcuts", hint: "Keyboard reference", icon: Keyboard },
    {
      to: "/settings",
      label: "Density & theme",
      hint: "Compact or comfortable",
      icon: SlidersHorizontal,
    },
    { to: "/projects", label: "All projects", hint: "Browse the workspace", icon: BookOpen },
  ];

  return (
    <div
      className="mt-hmi-6 sm:mt-hmi-8 flex flex-wrap item-row-gap"
      data-testid="home-utility-strip"
    >
      {items.map((it) => {
        const Icon = it.icon;

        return (
          <Link
            key={it.to}
            to={it.to as any}
            preload="intent"
            className="hmi-focus-ring hmi-chip-hover group item-inline gap-hmi-2 rounded-xl border border-ca-border/80 bg-ca-panel/85 item-pad-chip text-hmi-caption text-ca-ink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md hover:border-ca-primary/40 hover:bg-ca-panel-2 hover:shadow-[0_0_12px_color-mix(in_oklab,var(--ca-primary)_20%,transparent)]"
          >
            <Icon
              size={14}
              strokeWidth={1.75}
              aria-hidden
              className="shrink-0 text-ca-ink-muted transition group-hover:text-ca-primary"
            />
            <span className="font-medium">{it.label}</span>
            <span aria-hidden className="hidden sm:inline text-ca-ink-muted/60">
              ·
            </span>
            <span className="hidden sm:inline text-ca-ink-muted">{it.hint}</span>
          </Link>
        );
      })}
    </div>
  );
}

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const { icon: Icon, tone } = workflow;
  const t = TONE[tone];
  const statusBadge = WORKFLOW_STATUS_BADGES[workflow.id] ?? "READY";

  return (
    <div
      role="group"
      aria-label={workflow.label}
      data-tour={workflow.id === "projects" ? "home-project-workflow" : undefined}
      className="group relative flex cursor-default flex-col justify-between overflow-hidden rounded-2xl border border-ca-border/80 bg-gradient-to-b from-ca-panel/95 via-ca-panel/75 to-ca-bg/95 p-5 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:border-ca-primary/50 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_16px_48px_-8px_rgba(0,0,0,0.8),0_0_24px_-4px_color-mix(in_oklab,var(--ca-primary)_25%,transparent)]"
      style={{
        minHeight: "var(--home-card-min-h)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
        style={{ background: `radial-gradient(circle at center, ${t.glow} 0%, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-ca-panel/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_8px_-2px_rgba(0,0,0,0.4)] ring-1 transition-all duration-200 group-hover:scale-105"
          style={
            {
              color: t.ink,
              "--tw-ring-color": t.ring,
            } as CSSProperties
          }
        >
          <Icon size={22} aria-hidden strokeWidth={2} />
        </span>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-ca-border/80 bg-ca-panel/90 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ca-ink-muted transition-colors group-hover:border-ca-primary/40 group-hover:text-ca-primary">
            {statusBadge}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ca-border/60 bg-ca-panel/60 text-ca-ink-muted/70 opacity-60 transition-all duration-300 group-hover:border-ca-primary/50 group-hover:text-ca-ink group-hover:opacity-100 group-hover:shadow-[0_0_12px_color-mix(in_oklab,var(--ca-primary)_30%,transparent)]">
            <ArrowUpRight
              size={16}
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </div>
      </div>

      <div className="relative mt-5">
        <h2
          className="font-display font-black uppercase tracking-wider leading-none text-ca-ink"
          style={{ fontSize: "var(--home-title-size)" }}
        >
          {workflow.label}
        </h2>

        <p className="mt-2 text-hmi-caption text-ca-ink-muted font-medium leading-relaxed">
          {workflow.description}
        </p>

        {workflow.quickActions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {workflow.quickActions.map((qa) => (
              <QuickActionButton key={qa.label} action={qa} tone={t} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function QuickActionButton({
  action,
  tone,
}: {
  action: QuickAction;
  tone: { ink: string; ring: string; glow: string };
}) {
  const Icon = action.icon;

  return (
    <Link
      to={action.to as any}
      preload="intent"
      aria-label={action.label}
      onClick={(e) => e.stopPropagation()}
      className="hmi-focus-ring group/qa relative inline-flex cursor-pointer items-center gap-hmi-2 overflow-hidden rounded-lg border border-ca-border/80 bg-ca-panel/90 px-3 py-1.5 text-hmi-caption font-semibold text-ca-ink shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-all duration-150 hover:border-ca-primary/60 hover:bg-ca-panel-2 hover:shadow-[0_4px_16px_-2px_color-mix(in_oklab,var(--ca-primary)_35%,transparent)] active:scale-[0.98]"
      style={{ color: tone.ink, ["--chip-glow-tone" as string]: tone.glow } as CSSProperties}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover/qa:opacity-100"
        style={{
          background: `radial-gradient(120% 120% at 0% 0%, ${tone.glow} 0%, transparent 60%)`,
        }}
      />
      <Icon
        size={14}
        strokeWidth={2}
        aria-hidden
        className="relative transition-transform duration-200 group-hover/qa:scale-110 group-hover/qa:-rotate-3"
      />
      <span className="relative text-ca-ink font-medium">{action.label}</span>
      <ArrowUpRight
        size={12}
        aria-hidden
        className="relative -ml-0.5 opacity-0 -translate-x-1 transition-all duration-200 group-hover/qa:opacity-100 group-hover/qa:translate-x-0"
      />
    </Link>
  );
}
