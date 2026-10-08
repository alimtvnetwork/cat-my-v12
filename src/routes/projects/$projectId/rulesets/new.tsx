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
    <div className="flex h-full w-full flex-col bg-[#0b0c10] text-ca-ink font-hmi antialiased">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center border-b border-[#22252a] bg-[#111318] px-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-ca-ink-muted uppercase tracking-wider">{project.name}</span>
          <h1 className="text-sm font-bold text-ca-ink tracking-wide">INITIALIZE NEW RULESET</h1>
        </div>
      </header>

      {/* Main Panel */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-lg rounded border border-[#22252a] bg-[#111318] p-6">
          <p className="mb-6 text-xs text-ca-ink-muted leading-relaxed">
            Configure a new inspection ruleset group. Images and tools are assigned after creation.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ca-ink">Rule Set Name</span>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. QFN ALIGNMENT"
                className="rounded border border-[#333] bg-[#0b0c10] px-3 py-2 text-sm text-ca-ink placeholder:text-[#444] focus:border-ca-primary focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ca-ink-muted">
                Category (Optional)
              </span>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. TOP-SIDE-INSPECT"
                className="rounded border border-[#333] bg-[#0b0c10] px-3 py-2 text-sm text-ca-ink placeholder:text-[#444] focus:border-ca-primary focus:outline-none"
              />
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                <X size={14} />
                {error}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#22252a] pt-5">
              <Link
                to="/projects/$projectId"
                params={{ projectId }}
                className="px-4 py-2 text-xs font-bold uppercase text-ca-ink-muted hover:text-ca-ink transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || name.trim().length === 0}
                className="flex items-center gap-2 rounded bg-ca-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#000] hover:brightness-110 disabled:opacity-50 transition-colors"
              >
                <Sparkles size={14} className="fill-current" />
                {submitting ? "Creating..." : "Create Ruleset"}
              </button>
            </div>
          </form>
        </div>
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
