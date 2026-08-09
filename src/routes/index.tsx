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
import { HmiShell } from "@/components/hmi";
import { HomeError, HomePending, HomeErrorBoundary } from "@/components/home/HomeBoundaries";
import { useRouter } from "@tanstack/react-router";
import { RecentProjectsChip } from "@/components/home/RecentProjectsChip";
import { DataSourceToggle } from "@/components/data-source/DataSourceToggle";
import { GettingStarted } from "@/components/home/GettingStarted";
import { useRecentProjects } from "@/lib/recent-projects-store";
import { ArrowRight, FolderPlus as FolderPlusIcon } from "lucide-react";

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

  // Preference: sync the progress bar + aria-live announcements to
  // mouse-wheel and touchpad scrolling as well. Off by default so mouse
  // users never hear announcements they didn't ask for; persisted in
  // localStorage so the choice survives reloads. Keyboard scrolling is
  // always tracked, regardless of this toggle.
  const PREF_KEY = "home.scrollSync.pointer";
  const [pointerSync, setPointerSync] = useState<boolean>(false);
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
    // Track when either (a) the user is scrolling by keyboard, or (b) the
    // pointer-sync preference is on. Same measurement + announcement path.
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
        // Update the role="status" live region instead of firing an
        // ad-hoc announce() event. Because the text only changes when the
        // bucket key changes (top / 10% steps / near-bottom / bottom),
        // assistive tech reads a stable, non-spammy stream of updates
        // that the polite live region politely queues.
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

  return (
    <HomeErrorBoundary>
      <HmiShell title="Home" hideHeader>
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {/*
           * Keyboard scroll progress indicator.
           * Mirrors the aria-live announcements: same bucket source, same
           * percentage value, so screen-reader users hear "Scrolled 40
           * percent" while sighted keyboard users see the bar fill to 40%.
           * Hidden until a scroll key is pressed, then fades out ~1.4s
           * after the last update. Pointer / wheel scrolling leaves it
           * hidden by design so it never distracts during mouse use.
           */}
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
            {/*
             * Dedicated status live region for the scroll progress.
             * role="status" implies aria-live="polite" + aria-atomic="true"
             * in every major AT, so updates announce the whole phrase in
             * order without interrupting the user. Text is only written
             * when the bucket key changes (see handleScroll), which
             * naturally throttles announcements to top / 10% steps /
             * near-bottom / bottom and prevents spam even during long
             * uninterrupted scrolls.
             */}
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

/**
 * Plan 65 step 15: Primary CTA on Home.
 *
 * Resolves to the most recent project's landing page when the operator has
 * opened one before; falls back to "Create a project" when the recent
 * store is empty. This makes "keep going" a single click instead of a
 * dropdown -> row -> route chain.
 */
function PrimaryCta() {
  const recent = useRecentProjects(1);
  const navigate = useNavigate();
  const top = recent[0];
  const label = top ? `Continue ${top.name}` : "Create your first project";
  const onClick = () => {
    if (top) {
      navigate({ to: "/projects/$projectId", params: { projectId: top.projectId } });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: "/projects?new=1" as any });
    }
  };

  return (
    <div className="mt-hmi-3 flex flex-wrap items-center item-row-gap sm:mt-hmi-4">
      <button
        type="button"
        onClick={onClick}
        data-testid="home-primary-cta"
        className="hmi-focus-ring item-inline gap-hmi-2 rounded-lg bg-ca-primary item-pad-btn text-hmi-body font-semibold text-ca-on-primary shadow-hmi-panel transition hover:bg-ca-primary/90"
      >
        <span>{label}</span>
        <ArrowRight size={16} aria-hidden strokeWidth={2} className="shrink-0" />
      </button>
      {top ? (
        <button
          type="button"
          data-testid="home-create-project"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={() => navigate({ to: "/projects?new=1" as any })}
          className="hmi-focus-ring item-inline gap-hmi-2 rounded-lg border border-ca-border bg-ca-panel item-pad-btn text-hmi-body font-medium text-ca-ink transition hover:border-ca-primary/60 hover:bg-ca-panel-2"
        >
          <FolderPlusIcon size={16} aria-hidden strokeWidth={1.75} className="shrink-0" />
          <span>Create project</span>
        </button>
      ) : null}

      {top ? (
        <span className="item-inline text-hmi-caption text-ca-ink-muted">
          Last opened {new Date(top.openedAt).toLocaleDateString()}
        </span>
      ) : (
        <>
          <h2 className="sr-only">Pick a workflow</h2>
          <span className="item-inline text-hmi-caption text-ca-ink-muted">
            Or pick a workflow below to jump straight to a screen.
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Plan 87 step 21: Home hero utility strip.
 *
 * Surfaces discoverable entry points to the newly-shipped Shortcuts route
 * (v3.895) and the Settings density preference (v3.896) directly from the
 * front door, so operators don't have to hunt for them from an editor tab.
 */
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={it.to as any}
            preload="intent"
            className="hmi-focus-ring hmi-chip-hover group item-inline gap-hmi-2 rounded-lg border border-ca-border bg-ca-panel item-pad-chip text-hmi-caption text-ca-ink hover:bg-ca-panel-2"
          >
            <Icon
              size={14}
              strokeWidth={1.75}
              aria-hidden
              className="shrink-0 text-ca-ink-muted transition group-hover:text-ca-ink"
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

  return (
    // Requested change: the card itself is a passive container, not a link.
    // Only the QuickAction pills below navigate. Using the default cursor
    // over the card body signals "nothing happens here"; the pills keep
    // the pointer cursor via their <button> semantics.
    <div
      role="group"
      aria-label={workflow.label}
      className="group relative flex cursor-default flex-col justify-between overflow-hidden bg-ca-panel p-hmi-4 sm:p-hmi-5 transition duration-300 hover:bg-ca-panel-2"
      style={{
        minHeight: "var(--home-card-min-h)",
        borderRadius: "var(--home-card-radius)",
        border: "1px solid var(--home-card-border)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--home-card-border-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--home-card-border)")}
    >
      {/* corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-40 blur-3xl transition-opacity duration-500 group-hover:opacity-80"
        style={{ background: `radial-gradient(circle at center, ${t.glow} 0%, transparent 70%)` }}
      />
      {/* top row */}
      <div className="relative flex items-start justify-between">
        <span
          className="flex h-10 w-10 items-center justify-center bg-ca-panel-2 ring-1"
          style={
            {
              borderRadius: "var(--home-icon-radius)",
              color: t.ink,
              "--tw-ring-color": t.ring,
            } as CSSProperties
          }
        >
          <Icon size={20} aria-hidden strokeWidth={1.75} />
        </span>
        <ArrowUpRight
          size={18}
          className="text-ca-ink-muted opacity-40 transition duration-300"
          aria-hidden
        />
      </div>

      {/* bottom text */}
      <div className="relative mt-hmi-3">
        <h2
          className="font-display font-black uppercase tracking-tight leading-none text-ca-ink"
          style={{ fontSize: "var(--home-title-size)" }}
        >
          {workflow.label}
        </h2>
        <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">{workflow.description}</p>
        {workflow.quickActions.length > 0 ? (
          <div className="mt-hmi-3 flex flex-wrap gap-hmi-2">
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={action.to as any}
      preload="intent"
      aria-label={action.label}
      onClick={(e) => e.stopPropagation()}
      className="hmi-focus-ring hmi-chip-hover group/qa relative inline-flex cursor-pointer items-center gap-hmi-2 overflow-hidden rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-1.5 text-hmi-caption font-medium text-ca-ink shadow-sm hover:bg-ca-panel"
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
      <span className="relative text-ca-ink">{action.label}</span>
      <ArrowUpRight
        size={12}
        aria-hidden
        className="relative -ml-0.5 opacity-0 -translate-x-1 transition-all duration-200 group-hover/qa:opacity-100 group-hover/qa:translate-x-0"
      />
    </Link>
  );
}
