import { ClientLogger } from "@/lib/observability/client-logger";
import { RunningOpKindType } from "@/lib/stores/running-ops-store";
/**
 * Plan 64 step 79: project-level Run button + confirm dialog.
 * Renders a primary CTA that opens a confirm dialog listing the flattened
 * rule chain and a test-image drop-zone. On confirm it calls the
 * `runProject` server fn (step 80) and registers the op into
 * `useRunning()` so the header pill (step 65) reflects progress.
 */
import { useState, type ChangeEvent } from "react";
import { PlayCircle, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { runProject } from "@/lib/run-project.functions";
import { useRunning } from "@/hooks/useRunning";

export interface ProjectRunButtonProps {
  projectId: string;
  projectName: string;
  rulesetIds: string[];
  ruleChainPreview?: string[];
}

export function ProjectRunButton({
  projectId,
  projectName,
  rulesetIds,
  ruleChainPreview = [],
}: ProjectRunButtonProps): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [imageName, setImageName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRunning();
  const call = useServerFn(runProject);

  const canRun = rulesetIds.length > 0;

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setImageName(f ? f.name : null);
  };

  const doRun = async () => {
    if (canRun === false || busy) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await call({
        data: { projectId, rulesetIds, testImageRef: imageName ?? undefined },
      });
      running.start({
        id: res.runId,
        kind: RunningOpKindType.Run,
        label: `Run: ${projectName}`,
        onStop: () => ClientLogger.info("[project-run] stop requested", res.runId),
      });
      ClientLogger.info("[project-run] started", { runId: res.runId, projectId });
      setOpen(false);
    } catch (err) {
      ClientLogger.error("[project-run] failed", err);
      setError(err instanceof Error ? err.message : "Run failed to start.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={canRun === false}
        aria-label="Run project"
        className="hmi-focus-ring inline-flex items-center gap-2 rounded-md bg-ca-primary px-3 py-1.5 text-hmi-body font-semibold text-ca-bg disabled:opacity-50"
      >
        <PlayCircle className="h-4 w-4" aria-hidden /> Run
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="run-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-lg rounded-lg border border-ca-border bg-ca-panel p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="run-dialog-title" className="text-hmi-title text-ca-ink">
                Run {projectName}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="hmi-focus-ring rounded-sm p-1 hover:bg-ca-select/40"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <section aria-label="Rule chain" className="mt-3">
              <h3 className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                Rule chain ({ruleChainPreview.length || rulesetIds.length})
              </h3>
              <ol className="mt-1 max-h-40 overflow-auto rounded-sm border border-ca-border bg-ca-panel-2 p-2 text-hmi-body text-ca-ink">
                {(ruleChainPreview.length > 0 ? ruleChainPreview : rulesetIds).map((id, i) => (
                  <li key={`${id}-${i}`} className="truncate">
                    {i + 1}. {id}
                  </li>
                ))}
              </ol>
            </section>
            <label className="mt-3 block">
              <span className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                Test image (optional)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={onFile}
                className="mt-1 block w-full text-hmi-body text-ca-ink"
              />
              {imageName ? (
                <span className="text-hmi-caption text-ca-ink-muted">Selected: {imageName}</span>
              ) : null}
            </label>
            {error ? (
              <p role="alert" className="mt-2 text-hmi-body text-ca-danger">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="hmi-focus-ring rounded-md border border-ca-border px-3 py-1.5 text-hmi-body text-ca-ink hover:bg-ca-select/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doRun}
                disabled={busy || canRun === false}
                className="hmi-focus-ring inline-flex items-center gap-2 rounded-md bg-ca-primary px-3 py-1.5 text-hmi-body font-semibold text-ca-bg disabled:opacity-50"
              >
                <PlayCircle className="h-4 w-4" aria-hidden />
                {busy ? "Starting..." : "Start run"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
