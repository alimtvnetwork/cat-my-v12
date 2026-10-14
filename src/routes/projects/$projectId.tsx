import { SectionIdType } from "@/components/nav/SectionTopBar";
// Project layout (Plan 34, step 10). Reads project by id, throws notFound
// if the store has no entry (route unblocks step 9 create-and-navigate and
// steps 11-16 that mount project children under this segment).
import { useEffect, useState } from "react";
import {
  Outlet,
  createFileRoute,
  notFound,
  useRouter,
  Link,
  useLocation,
} from "@tanstack/react-router";
import { HmiShell } from "@/components/hmi";
import { SectionTopBar } from "@/components/nav/SectionTopBar";
import { useProjectStore, selectProject } from "@/lib/projects/store";
import { reportLovableError } from "@/lib/lovable-error-reporting";

import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardAppShell } from "@/components/layout/StandardAppShell";

const PROJECT_STANDARD_TABS = [
  { label: "Overview", to: "/projects/$projectId", key: "overview" },
  { label: "Camera", to: "/projects/$projectId/camera", key: "camera" },
  { label: "Rulesets", to: "/projects/$projectId/rulesets", key: "rulesets" },
  { label: "Categories", to: "/projects/$projectId/categories", key: "categories" },
  { label: "Runs", to: "/projects/$projectId/runs", key: "runs" },
  { label: "Trial Run", to: "/projects/$projectId/trial-run", key: "trial-run" },
  { label: "AI Testing", to: "/projects/$projectId/ai-testing", key: "ai-testing" },
] as const;

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectLayout,
  errorComponent: ProjectError,
  notFoundComponent: ProjectNotFound,
});

function ProjectLayout() {
  const { projectId } = Route.useParams();
  const pathname = useLocation({ select: (location) => location.pathname });
  const isHydrated = useProjectStoreHydrated();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const { mode } = useUiMode();

  if (!isHydrated && !project) {
    return <ProjectLoading />;
  }

  if (!project) {
    // Surface (not swallow) the miss; TanStack renders notFoundComponent.
    console.warn("[projects/$projectId] project not found in store", { projectId });

    throw notFound();
  }

  if (mode === UiModeType.Standard) {
    return (
      <StandardAppShell
        activeNav="projects"
        title={project.name}
        subtitle={`Project ID: ${projectId}`}
      >
        <div
          data-tour="project-created-page"
          className="flex min-h-0 flex-1 flex-col overflow-hidden bg-ca-panel"
        >
          <nav
            aria-label="Project workspace tabs"
            className="flex h-8 shrink-0 items-center gap-1 overflow-x-auto border-b border-white/10 bg-[#0c1017]/95 px-3 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden backdrop-blur-md"
          >
            {PROJECT_STANDARD_TABS.map((tab) => {
              const isActive = getProjectActive(pathname) === tab.key;

              return (
                <Link
                  key={tab.key}
                  data-tour={tab.key === "overview" ? "project-overview-tab" : undefined}
                  to={tab.to}
                  params={{ projectId }}
                  className={`inline-flex items-center rounded-md px-2.5 py-0.5 font-sans text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 shadow-sm"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white border border-transparent"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <Outlet />
        </div>
      </StandardAppShell>
    );
  }

  return (
    <HmiShell title={project.name}>
      <SectionTopBar
        section={SectionIdType.Project}
        active={getProjectActive(pathname)}
        params={{ projectId }}
      />
      <Outlet />
    </HmiShell>
  );
}

function getProjectActive(pathname: string): string {
  if (pathname.endsWith("/camera")) return "camera";

  if (pathname.endsWith("/categories")) return "categories";

  if (pathname.endsWith("/runs")) return "runs";

  if (pathname.includes("/rulesets")) return "rulesets";

  if (pathname.endsWith("/trial-run")) return "trial-run";

  if (pathname.endsWith("/ai-testing") || pathname.endsWith("/ai-testing-history"))
    return "ai-testing";

  return "overview";
}

function useProjectStoreHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(
    () => useProjectStore.persist?.hasHydrated?.() ?? true,
  );
  useEffect(() => {
    const persistApi = useProjectStore.persist;

    if (!persistApi) {
      setIsHydrated(true);

      return;
    }

    if (persistApi.hasHydrated()) {
      setIsHydrated(true);

      return;
    }

    return persistApi.onFinishHydration(() => setIsHydrated(true));
  }, []);

  return isHydrated;
}

function ProjectLoading() {
  return (
    <HmiShell title="Project">
      <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ca-primary border-t-transparent shadow-[0_0_15px_color-mix(in_oklab,var(--ca-primary)_40%,transparent)]" />
        <span className="font-mono text-xs uppercase tracking-widest text-ca-ink-muted animate-pulse">
          Loading project telemetry...
        </span>
      </div>
    </HmiShell>
  );
}

function ProjectError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[projects/$projectId] error boundary", error);
    reportLovableError(error, { boundary: "projects_$projectId_error_component" });
  }, [error]);

  return (
    <HmiShell title="Project">
      <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
        <div className="rounded-2xl border border-rose-500/20 bg-black/40 p-8 backdrop-blur-xl shadow-2xl max-w-md w-full">
          <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-rose-400">
            This project didn't load
          </h1>
          <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">{error.message}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="rounded-lg bg-ca-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:brightness-110"
            >
              Try again
            </button>
            <Link
              to="/projects"
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ca-ink hover:bg-white/10"
            >
              All projects
            </Link>
          </div>
        </div>
      </div>
    </HmiShell>
  );
}

function ProjectNotFound() {
  const { projectId } = Route.useParams();

  return (
    <HmiShell title="Project not found">
      <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl shadow-2xl max-w-md w-full">
          <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
            Project not found
          </h1>
          <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
            No project matches <span className="font-mono text-ca-primary">{projectId}</span> in this browser.
          </p>
          <Link
            to="/projects"
            className="mt-6 inline-flex rounded-lg bg-ca-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-ca-primary/20 transition hover:brightness-110"
          >
            All projects
          </Link>
        </div>
      </div>
    </HmiShell>
  );
}
