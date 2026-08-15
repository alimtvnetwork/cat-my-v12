import { useState, useCallback } from "react";
import { Play } from "lucide-react";
import type { Project, RuleSet } from "@/lib/projects/store";
import { runProject, type ProjectRunSummary } from "@/lib/projects/project-runner";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import type { RuleId } from "@/lib/rules/model";
import type { ImageSample } from "@/lib/image-samples/model";
import { SampleCarousel } from "@/components/projects/SampleCarousel";
import type { useSelectedSample } from "@/lib/image-samples/use-selected-sample";

export function ProjectRunSection({
  project,
  rulesets,
  summary,
  onRan,
  samples,
  selection,
}: {
  project: Project;
  rulesets: readonly RuleSet[];
  summary: ProjectRunSummary | null;
  onRan: (s: ProjectRunSummary) => void;
  samples: readonly ImageSample[];
  selection: ReturnType<typeof useSelectedSample>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rulesetCount = project.rulesetIds.length;
  const hasBindings = Boolean(project.cameraSettingId && project.micSettingsId);

  const rulesLib = useRulesLibrary();
  const isDisabled = useCallback(
    (ruleId: string): boolean => {
      const r = rulesLib.byId(ruleId as unknown as RuleId);

      return r ? r.enabled === false : false;
    },
    [rulesLib],
  );

  function onRun(): void {
    setError(null);
    setBusy(true);
    try {
      const s = runProject(project, rulesets, { isDisabled });
      onRan(s);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[project-editor/run] failed", e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Run"
      className="rounded-lg border border-ca-border bg-ca-panel p-hmi-4"
      data-testid="project-editor-run"
    >
      <div className="flex items-center justify-between gap-hmi-3">
        <div className="flex items-center gap-hmi-2">
          <Play aria-hidden size={18} className="text-ca-ink-muted" />
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Run
          </h2>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={busy || rulesetCount === 0}
          data-testid="run-project-btn"
          className="inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play aria-hidden size={16} />
          {busy ? "Running…" : "Run project"}
        </button>
      </div>
      <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
        {rulesetCount === 0
          ? "Add at least one ruleset above to enable Run."
          : hasBindings
            ? `Will evaluate ${rulesetCount} ${rulesetCount === 1 ? "ruleset" : "rulesets"} against the bound camera + mics settings.`
            : `Will evaluate ${rulesetCount} ${rulesetCount === 1 ? "ruleset" : "rulesets"}. Camera and mics bindings are not required for the stub runner.`}
      </p>
      <div className="mt-hmi-3">
        <SampleCarousel samples={samples} selection={selection} />
      </div>
      {summary ? (
        <p className="mt-hmi-2 font-mono text-[13px] tabular-nums text-ca-ink-muted">
          Last run: {summary.pass} pass · {summary.fail} fail · {summary.skip} skip ·{" "}
          {summary.durationMs} ms
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-hmi-2 text-hmi-caption text-ca-ng">
          {error}
        </p>
      ) : null}
    </section>
  );
}
