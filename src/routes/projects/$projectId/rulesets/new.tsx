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
  const isGuidedSimulation =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("guided") === "1"
      : false;

  const [name, setName] = useState(isGuidedSimulation ? "demoset" : "");
  const [category, setCategory] = useState(isGuidedSimulation ? "Inspection category" : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!project) {
    if (typeof window === "undefined") {
      return null;
    }

    console.warn("[rulesets/new] project not found", { projectId });

    return <NewRulesetNotFound />;
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
        search: { ruleset: rulesetId },
      });
    } catch (err) {
      console.error("[rulesets/new] create failed", err);
      setError(err instanceof Error ? err.message : "Could not create rule set.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#06080d] text-slate-100 font-sans antialiased">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center border-b border-white/[0.08] bg-[#0a0d14]/80 backdrop-blur-xl px-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">{project.name} // RECIPES</span>
          <h1 className="text-sm font-mono font-bold text-slate-100 tracking-wider flex items-center gap-2">
            <Sparkles size={14} className="text-cyan-400" /> INITIALIZE INSPECTION RULESET
          </h1>
        </div>
      </header>

      {/* Main Panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div
          data-tour="simulation-ruleset-create-panel"
          className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0a0d14]/90 backdrop-blur-2xl p-7 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_20px_50px_-12px_rgba(0,0,0,0.8)]"
        >
          <p className="mb-6 text-xs text-slate-400 leading-relaxed font-sans">
            Configure a new inspection ruleset group. Sample workpieces, optical lighting parameters, and vision tools can be assigned after creation.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Rule Set Name</span>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. QFN ALIGNMENT"
                className="rounded-xl border border-white/[0.1] bg-[#07090e] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] font-mono"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Category (Optional)
              </span>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. TOP-SIDE-INSPECT"
                className="rounded-xl border border-white/[0.1] bg-[#07090e] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] font-mono"
              />
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-400 font-mono">
                <X size={14} />
                {error}
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-white/[0.08] pt-5">
              <Link
                to="/projects/$projectId"
                params={{ projectId }}
                className="px-4 py-2 text-xs font-mono font-bold uppercase text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                data-tour="simulation-ruleset-create-submit"
                disabled={submitting || name.trim().length === 0}
                className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4),inset_0_1px_0_0_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 transition-all cursor-pointer"
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
