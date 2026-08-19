import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 90 Step 136. Resolvers that turn a `SaveConflictModal` click into
// the actual side-effects documented in spec/21-app/80-ruleset-draft-save.md.
//
// Root cause guarded: Step 135 shipped the presentational modal with three
// injected resolver props but no default implementation, so any consumer
// (editor, batch-reconcile) had to open-code the reload/overwrite logic
// and risked diverging on the exact wire semantics (which endpoint, which
// `Version` value to submit on overwrite, whether to mirror the server
// envelope into IndexedDB). This hook is the single seam that binds the
// modal to `useSaveRuleSet` + `loadRuleSet` + `putDraft` correctly.
//
// Contract:
//   - `onReloadServer(local)`: GET `/rules/{id}` (loadRuleSet mirrors into
//     IDB with Origin: "server"), invoke optional `onServerReloaded(env)`
//     so the editor can rebind, then `reset()` the save state.
//   - `onOverwriteLocal(local)`: GET server to discover the current
//     `Version`, splice it into `local` (keeping the user's Rules), then
//     re-invoke `save()`. On success the modal auto-closes because
//     `state.kind` transitions to `"saved"`. On a *second* conflict (rare
//     race) the modal simply re-renders with the fresh error.
//   - `onCancel()`: `reset()` the state to `idle` (drops the modal).
//
// All three resolvers log failures with `{ code, RuleSetId }` context so
// silent failure is architecturally impossible.

import { useCallback } from "react";
import { DraftOriginType, type RuleSetEnvelope } from "./draftStore";
import { loadRuleSet, type LoadRuleSetError } from "./loadRuleSet";
import type { UseSaveRuleSet } from "./useSaveRuleSet";

export interface UseSaveConflictResolversOptions {
  save: UseSaveRuleSet["save"];
  reset: UseSaveRuleSet["reset"];
  /** Called after a successful reload so the editor can rebind to the server envelope. */
  onServerReloaded?: (env: RuleSetEnvelope) => void;
}

export interface SaveConflictResolvers {
  onReloadServer: (local: RuleSetEnvelope) => Promise<void>;
  onOverwriteLocal: (local: RuleSetEnvelope) => Promise<void>;
  onCancel: () => void;
}

function isLoadRuleSetError(e: unknown): e is LoadRuleSetError {

  return (
    typeof e === "object" &&
    e !== null &&
    typeof (e as { code?: unknown }).code === "string" &&
    typeof (e as { httpStatus?: unknown }).httpStatus === "number"
  );
}

export function useSaveConflictResolvers(
  opts: UseSaveConflictResolversOptions,
): SaveConflictResolvers {
  const { save, reset, onServerReloaded } = opts;

  const onReloadServer = useCallback(
    async (local: RuleSetEnvelope): Promise<void> => {
      try {
        const server = await loadRuleSet(local.RuleSetId);
        onServerReloaded?.(server);
        reset();
      } catch (e) {
        const code = isLoadRuleSetError(e) ? e.code : "E_BE_UNKNOWN";
        ClientLogger.error("[useSaveConflictResolvers] reload failed", {
          code,
          RuleSetId: local.RuleSetId,
        });

        // Leave modal open so the operator can retry or cancel; do NOT
        // swallow the error into idle.
        throw e;
      }
    },
    [reset, onServerReloaded],
  );

  const onOverwriteLocal = useCallback(
    async (local: RuleSetEnvelope): Promise<void> => {
      // Fetch server head to discover the current Version. We deliberately
      // do NOT call putDraft here (loadRuleSet already did) because the
      // very next `save()` will re-mirror the committed envelope.
      let serverVersion: number;
      try {
        const server = await loadRuleSet(local.RuleSetId);
        serverVersion = server.Version;
      } catch (e) {
        const code = isLoadRuleSetError(e) ? e.code : "E_BE_UNKNOWN";
        ClientLogger.error("[useSaveConflictResolvers] overwrite: discover version failed", {
          code,
          RuleSetId: local.RuleSetId,
        });

        throw e;
      }

      const rebased: RuleSetEnvelope = {
        ...local,
        Version: serverVersion,
        DraftMeta: {
          ...local.DraftMeta,
          UpdatedAt: new Date().toISOString(),
          Origin: DraftOriginType.Indexeddb,
        },
      };
      await save(rebased);
    },
    [save],
  );

  const onCancel = useCallback((): void => {
    reset();
  }, [reset]);

  return { onReloadServer, onOverwriteLocal, onCancel };
}
