// Plan 90 Step 135. Conflict-resolution modal bound to `useSaveRuleSet`.
//
// Spec: spec/21-app/80-ruleset-draft-save.md
//
// Root cause guarded: Step 134 landed the SaveState state-machine but the
// conflict branch (`{ kind: "conflict", localEnvelope, error }`) had no UI
// consumer, so any `E_BE_CONFLICT` (409) returned by `PUT /rules/{id}` would
// only surface as a console.warn and the user's local draft would silently
// diverge from the server-committed version. This modal is the single place
// that renders the conflict, offers the three documented resolutions
// (reload-server / overwrite-local / cancel), and delegates every actual
// side-effect back to the caller so the modal stays presentational.
//
// The modal is presentation-only: it never fetches, never mutates
// IndexedDB, never calls saveRuleSet. All three resolvers are injected
// props so this file is trivially testable and the same modal drives both
// the rule editor and the future batch-reconcile screen.

import * as React from "react";
import type { SaveState } from "@/lib/rules/useSaveRuleSet";
import type { RuleSetEnvelope } from "@/lib/rules/draftStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface SaveConflictModalProps {
  /** Current state from `useSaveRuleSet`. Modal renders only when kind === "conflict". */
  state: SaveState;
  /**
   * Discard local draft and reload the server-committed envelope.
   * Caller is expected to GET /rules/{id}, `putDraft(server)`, then `reset()`.
   */
  onReloadServer: (localEnvelope: RuleSetEnvelope) => void | Promise<void>;
  /**
   * Overwrite the server with the local envelope by re-saving at the
   * server's newer Version. Caller must bump `Version` to the server's
   * current value before calling `save()` again.
   */
  onOverwriteLocal: (localEnvelope: RuleSetEnvelope) => void | Promise<void>;
  /** Dismiss the modal without resolving. Caller typically invokes `reset()`. */
  onCancel: () => void;
}

export function SaveConflictModal({
  state,
  onReloadServer,
  onOverwriteLocal,
  onCancel,
}: SaveConflictModalProps): React.ReactElement | null {
  const open = state.kind === "conflict";
  const [busy, setBusy] = React.useState<null | "reload" | "overwrite">(null);

  // Reset busy flag whenever the modal closes so re-open starts clean.
  React.useEffect(() => {
    if (!open) setBusy(null);
  }, [open]);

  if (state.kind !== "conflict") return null;

  const { localEnvelope, error } = state;

  async function guarded(kind: "reload" | "overwrite", fn: () => void | Promise<void>) {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      // Surface unexpected resolver failures so the user is never left
      // with a spinner. `useSaveRuleSet.save()` errors are already routed
      // through SaveState; this catch handles caller-side throws (e.g.
      // network failure while fetching the server envelope).
      console.error("[SaveConflictModal] resolver failed", { kind, error: e });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onCancel();
      }}
    >
      <DialogContent className="max-w-md" role="alertdialog" aria-labelledby="save-conflict-title">
        <DialogHeader>
          <DialogTitle id="save-conflict-title">Ruleset changed on the server</DialogTitle>
          <DialogDescription>
            Your local draft of{" "}
            <span className="font-[var(--font-hmi-mono)]">{localEnvelope.Name}</span> (version{" "}
            {localEnvelope.Version}) is out of date. Someone else saved a newer version. Pick how to
            resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        <div
          className="rounded-md border border-ca-border bg-ca-surface-2 p-3 text-hmi-caption text-ca-text-muted"
          data-testid="save-conflict-error-code"
        >
          <div>
            <strong>Error:</strong> {error.code}
          </div>
          <div className="mt-1">{error.backendMessage}</div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={busy !== null}
            data-testid="save-conflict-cancel"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => guarded("overwrite", () => onOverwriteLocal(localEnvelope))}
            disabled={busy !== null}
            data-testid="save-conflict-overwrite"
          >
            {busy === "overwrite" ? "Overwriting…" : "Overwrite server"}
          </Button>
          <Button
            onClick={() => guarded("reload", () => onReloadServer(localEnvelope))}
            disabled={busy !== null}
            data-testid="save-conflict-reload"
          >
            {busy === "reload" ? "Reloading…" : "Reload server version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
