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
  { label: "Rule sets", to: "/projects/$projectId/rulesets", key: "rulesets" },
  { label: "Categories", to: "/projects/$projectId/categories", key: "categories" },
  { label: "Runs", to: "/projects/$projectId/runs", key: "runs" },
  { label: "Trial run", to: "/projects/$projectId/trial-run", key: "trial-run" },
  { label: "AI testing", to: "/projects/$projectId/ai-testing", key: "ai-testing" },
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

  if (!isHydrated) {
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-ca-panel">
          <nav
            aria-label="Project workspace tabs"
            className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-ca-border bg-ca-panel px-4 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {PROJECT_STANDARD_TABS.map((tab) => {
              const isActive = getProjectActive(pathname) === tab.key;

              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  params={{ projectId }}
                  className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-ca-ink text-ca-bg shadow-sm"
                      : "text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink"
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
  const [isHydrated, setIsHydrated] = useState(false);
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
      <div className="flex flex-1 items-center justify-center p-hmi-6 text-hmi-body text-ca-ink-muted">
        Loading project...
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
        <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
          This project didn't load
        </h1>
        <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">{error.message}</p>
        <div className="mt-hmi-4 flex gap-hmi-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
          >
            Try again
          </button>
          <Link
            to="/projects"
            className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-ink hover:border-ca-select"
          >
            All projects
          </Link>
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
        <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
          Project not found
        </h1>
        <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
          No project matches <span className="font-mono">{projectId}</span> in this browser.
        </p>
        <Link
          to="/projects"
          className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
        >
          All projects
        </Link>
      </div>
    </HmiShell>
  );
}
