// Create rule set without image requirement (Plan 34, step 14, SS-03 modernized).
// Calls `createRuleset`, then navigates into the per-ruleset editor route.
import { useState } from "react";
import { Link, createFileRoute, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { X, Sparkles } from "lucide-react";
import { useProjectStore, selectProject } from "@/lib/projects/store";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { toIntParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";

export const Route = createFileRoute("/projects/$projectId/rulesets/new")({
  component: NewRuleset,
  errorComponent: NewRulesetError,
  notFoundComponent: NewRulesetNotFound,
});

function NewRuleset() {
  const { projectId } = Route.useParams();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const createRuleset = useProjectStore((s) => s.createRuleset);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!project) {
    console.warn("[rulesets/new] project not found", { projectId });
    throw notFound();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      setError("Name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Do not pass an image; ruleset doesn't dictate image state anymore
      const rulesetId = createRuleset(projectId, trimmedName, undefined);
      
      // If a category was provided, we could update it. 
      // We would need to call updateRulesetCategory, which is on the store.
      if (category.trim()) {
        useProjectStore.getState().updateRulesetCategory(rulesetId, category.trim());
      }
      
      const intRulesetParam = toIntParam(IntAliasNamespaceType.Ruleset, rulesetId);
      console.info("[rulesets/new] created", {
        projectId,
        rulesetId,
        intRulesetParam,
        name: trimmedName,
      });
      // Route back to project index which hosts the HMI setup screen for the active ruleset
      await navigate({
        to: "/projects/$projectId",
        params: { projectId },
      });
    } catch (err) {
      console.error("[rulesets/new] create failed", err);
      setError(err instanceof Error ? err.message : "Could not create rule set.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto p-hmi-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-hmi-5">
          <p className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
            {project.name}
          </p>
          <h1 className="mt-hmi-1 font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
            New Rule Set / Group
          </h1>
          <p className="mt-hmi-1 text-hmi-body text-ca-ink-muted">
            Create a logical group for your inspection rules.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-hmi-4">
          <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
            Name
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Flaw Detection Group"
              className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-hmi-1 text-hmi-body text-ca-ink">
            Category / Description (Optional)
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Surface Inspection"
              className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink focus:border-ca-select focus:outline-none"
            />
          </label>

          {error ? (
            <p role="alert" className="text-hmi-caption text-ca-ng">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-hmi-2">
            <Link
              to="/projects/$projectId"
              params={{ projectId }}
              className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-ink hover:border-ca-select focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || name.trim().length === 0}
              className="rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            >
              {submitting ? "Creating..." : "Create rule set"}
            </button>
          </div>
        </form>
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
