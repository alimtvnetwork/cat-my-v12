import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useProjectStore } from "@/lib/projects/store";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export interface AddRulesetPanelProps {
  projectId: string;
  projectName: string;
  /** Prefilled ruleset name. Defaults to an empty field. */
  defaultName?: string;
  /** Called with the new ruleset id and name after creation. */
  onCreated: (rulesetId: string, name: string) => void;
  /** When provided, an Exit button is shown in the header. */
  onExit?: () => void;
}

/**
 * Ruleset creation form that can live anywhere: the analyze workspace shows
 * it inline in the viewport, and the legacy `/rulesets/new` route renders it
 * as a standalone page.
 */
export function AddRulesetPanel({
  projectId,
  projectName,
  defaultName = "",
  onCreated,
  onExit,
}: AddRulesetPanelProps) {
  const createRuleset = useProjectStore((s) => s.createRuleset);
  const [name, setName] = useState(defaultName);
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      setError("Name is required.");

      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const rulesetId = createRuleset(projectId, trimmedName, undefined);

      if (category.trim()) {
        useProjectStore.getState().updateRulesetCategory(rulesetId, category.trim());
      }

      onCreated(rulesetId, trimmedName);
    } catch (err) {
      reportLovableError(err, { source: "AddRulesetPanel.handleSubmit", projectId });
      setError(err instanceof Error ? err.message : "Could not create rule set.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#06080d] font-sans text-slate-100 antialiased">
      {/* 1. Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#222938] bg-[#0a0d14]/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-slate-950">
            <Sparkles size={15} className="fill-current" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold uppercase tracking-wider text-white">
              New Ruleset
            </h2>
            <p className="truncate text-[11px] text-white/50">
              {projectName} // RECIPES — define a new inspection ruleset
            </p>
          </div>
        </div>

        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-95"
          >
            <X size={12} />
            Exit
          </button>
        ) : null}
      </div>

      {/* 2. Form card */}
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-6">
        <div
          data-tour="simulation-ruleset-create-panel"
          className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0a0d14]/90 p-7 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_20px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
        >
          <p className="mb-6 text-xs leading-relaxed text-slate-400">
            Configure a new inspection ruleset group. Sample workpieces, optical lighting
            parameters, and vision tools can be assigned after creation.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Rule Set Name
              </span>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. QFN ALIGNMENT"
                className="rounded-xl border border-white/[0.1] bg-[#07090e] px-4 py-2.5 font-mono text-sm text-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Category (Optional)
              </span>
              <input
                type="text"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="e.g. TOP-SIDE-INSPECT"
                className="rounded-xl border border-white/[0.1] bg-[#07090e] px-4 py-2.5 font-mono text-sm text-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40"
              />
            </label>

            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-400">
                <X size={14} />
                {error}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-white/[0.08] pt-5">
              {onExit ? (
                <button
                  type="button"
                  onClick={onExit}
                  className="px-4 py-2 text-xs font-bold uppercase text-slate-400 transition-colors hover:text-white"
                >
                  Cancel
                </button>
              ) : null}
              <button
                type="submit"
                data-tour="simulation-ruleset-create-submit"
                disabled={submitting || name.trim().length === 0}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4),inset_0_1px_0_0_rgba(255,255,255,0.4)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
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
