// Create rule set without image requirement (Plan 34, step 14, SS-03 modernized).
// The form itself lives in AddRulesetPanel so ruleset creation opens inline
// in the overview workspace; this route is a thin standalone wrapper kept
// for deep links.
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useProjectStore, selectProject } from "@/lib/projects/store";
import { AddRulesetPanel } from "@/components/vision/workpiece/AddRulesetPanel";

export const Route = createFileRoute("/projects/$projectId/rulesets/new")({
  component: NewRuleset,
  errorComponent: NewRulesetError,
  notFoundComponent: NewRulesetNotFound,
});

function NewRuleset() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const navigate = useNavigate();
  const isGuidedSimulation =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("guided") === "1"
      : false;

  if (!project) {
    if (typeof window === "undefined") {
      return null;
    }

    console.warn("[rulesets/new] project not found", { projectId });

    return <NewRulesetNotFound />;
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#06080d] text-slate-100 font-sans antialiased">
      <div className="min-h-0 flex-1">
        <AddRulesetPanel
          projectId={projectId}
          projectName={project.name}
          defaultName={isGuidedSimulation ? "demoset" : undefined}
          onCreated={(rulesetId) => {
            // Route back to project index which hosts the HMI setup screen for the active ruleset
            void navigate({
              to: "/projects/$projectId",
              params: { projectId },
              search: { ruleset: rulesetId },
            });
          }}
          onExit={() => {
            void navigate({ to: "/projects/$projectId", params: { projectId } });
          }}
        />
      </div>
    </div>
  );
}

function NewRulesetError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        New rule set didn't load
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

function NewRulesetNotFound() {
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
