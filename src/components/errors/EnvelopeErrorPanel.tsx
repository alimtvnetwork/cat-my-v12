// Renders Universal Response Envelope `Errors` payload plus dev-only stack frames.
//
// Spec: spec/03-error-manage/02-error-architecture/04-error-modal/03-error-modal-reference.md §2, §4
//
// Plan 90 Step 127 (root cause, one sentence): frame lists and the delegated
// request block were rendered with bespoke `<ol>`/`<pre>` JSX that duplicated
// the PascalCase pretty-tree logic already shipped by `envelope-viewer.tsx`,
// so any change to the wire tree formatting drifted between the modal and the
// CLI drawer surfaces. This file now delegates every value render to
// `EnvelopeTree` (the shared primitive) and keeps only the CapturedError-aware
// gating (dev / responseStatus >= 500 / forceShowFrames) and section labels.
// Pure presentation; no fetching, no store writes.

import type { CapturedError, EnvelopeErrors } from "@/types/errors";
import { EnvelopeTree } from "@/components/cli/envelope-viewer";
import { CopyEnvelopeButton } from "@/components/cli/copy-envelope-button";
import { useShowDevFrames } from "@/hooks/use-show-dev-frames";

const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1";

function isDev(): boolean {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

function shouldShowFrames(err: Pick<CapturedError, "responseStatus">): boolean {
  if (isDev()) return true;

  return typeof err.responseStatus === "number" && err.responseStatus >= 500;
}

function FrameSection({ frames, label }: { frames: string[]; label: string }) {
  if (!frames.length) return null;

  return (
    <section>
      <h4 className={SECTION_LABEL}>{label}</h4>
      <EnvelopeTree value={frames} />
    </section>
  );
}

export interface EnvelopeErrorPanelProps {
  err: CapturedError;
  /** Force-show stack frames regardless of env / status. Escape hatch for tests. */
  forceShowFrames?: boolean;
}

export function EnvelopeErrorPanel({ err, forceShowFrames = false }: EnvelopeErrorPanelProps) {
  const env: EnvelopeErrors | undefined = err.envelopeErrors;
  const { show: userAllowsFrames } = useShowDevFrames();

  if (!env) return null;

  // Precedence:
  //   1. `forceShowFrames` (test escape hatch) always wins.
  //   2. Operator toggle OFF => frames hidden even in DEV / 5xx (Step 146).
  //   3. Otherwise defer to `shouldShowFrames` (DEV or 5xx).
  const showFrames = forceShowFrames || (userAllowsFrames && shouldShowFrames(err));
  const delegated = env.DelegatedRequestServer;

  return (
    <div className="space-y-3" data-testid="envelope-error-panel">
      <section>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className={SECTION_LABEL}>Backend message</h4>
          <CopyEnvelopeButton err={err} compact />
        </div>
        <p className="text-sm whitespace-pre-wrap" data-testid="envelope-backend-message">
          {env.BackendMessage || "(empty)"}
        </p>
      </section>

      {showFrames ? (
        <div className="space-y-3" data-testid="envelope-dev-frames">
          <FrameSection frames={env.Backend ?? []} label="Backend frames (dev)" />
          <FrameSection frames={env.Frontend ?? []} label="Frontend frames (dev)" />
          <FrameSection
            frames={env.DelegatedServiceErrorStack ?? []}
            label="Delegated service stack (dev)"
          />
          {delegated ? (
            <section>
              <h4 className={SECTION_LABEL}>Delegated request (dev)</h4>
              <EnvelopeTree value={delegated} />
            </section>
          ) : null}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground" data-testid="envelope-frames-hidden-hint">
          {userAllowsFrames
            ? "Stack frames are hidden in production. Reproduce with a dev build or a 5xx response to inspect the full trace."
            : "Stack frames are hidden by the 'Show developer stack frames' setting in /cli/settings. Turn it on to inspect the full trace."}
        </p>
      )}
    </div>
  );
}
