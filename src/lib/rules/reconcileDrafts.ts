// Plan 90 Step 137. Boot reconciliation for locally-cached RuleSet drafts.
//
// Spec: spec/21-app/80-ruleset-draft-save.md
//
// Root cause guarded: Steps 132-136 give the editor a per-ruleset draft
// -> save -> conflict-modal loop, but if the browser reopens after another
// operator committed changes, the local IndexedDB draft can silently be
// stale (or reference a RuleSet that was deleted server-side) and the
// operator will only notice on the next Save (or worse, never). This
// module runs at boot, diffs every local draft against `GET /rules/{id}`,
// and classifies drift so the shell can either auto-open the
// SaveConflictModal, drop dead drafts, or accept the "in-sync" case.
//
// This module is a browser seam: it uses `fetch` and IndexedDB. Do NOT
// import in server functions.

import { listDraftIds, getDraft, deleteDraft, type RuleSetEnvelope } from "./draftStore";
import { loadRuleSet, type LoadRuleSetError } from "./loadRuleSet";

export enum DraftReconcileKindType {
  InSync = "in-sync",
  LocalNewer = "local-newer",
  ServerNewer = "server-newer",
  ServerMissing = "server-missing",
  LoadFailed = "load-failed",
}
export type DraftReconcileKind = DraftReconcileKindType;

export interface DraftReconcileEntry {
  RuleSetId: number;
  Kind: DraftReconcileKind;
  Local: RuleSetEnvelope | null;
  Server: RuleSetEnvelope | null;
  Error?: { Code: string; Message: string };
}

export interface ReconcileDraftsOptions {
  /**
   * If a draft comes back `server-missing`, delete it from IndexedDB.
   * Defaults to `false` so the shell can prompt the operator first.
   */
  purgeMissing?: boolean;
}

function isLoadRuleSetError(e: unknown): e is LoadRuleSetError {
  return typeof e === "object" && e !== null && typeof (e as { code?: unknown }).code === "string";
}

/**
 * Diff every local draft against the server. Returns one entry per local
 * draft. Never throws: transport failures are recorded as `load-failed`
 * so a single flaky GET does not block boot.
 */
export async function reconcileDrafts(
  opts: ReconcileDraftsOptions = {},
): Promise<DraftReconcileEntry[]> {
  const ids = await listDraftIds();
  const out: DraftReconcileEntry[] = [];

  for (const id of ids) {
    const local = await getDraft(id);

    if (!local) {
      // Race: id was listed but disappeared. Skip silently, not a bug.
      continue;
    }

    let server: RuleSetEnvelope | null = null;
    let error: { Code: string; Message: string } | undefined;
    try {
      server = await loadRuleSet(id);
    } catch (e) {
      if (isLoadRuleSetError(e)) {
        error = { Code: e.code, Message: e.backendMessage };
      } else {
        error = {
          Code: "E_BE_UNKNOWN",
          Message: e instanceof Error ? e.message : "unknown load failure",
        };
      }
    }

    let kind: DraftReconcileKind;

    if (server) {
      if (local.Version === server.Version) kind = DraftReconcileKindType.InSync;
      else if (local.Version > server.Version) kind = DraftReconcileKindType.LocalNewer;
      else kind = DraftReconcileKindType.ServerNewer;
    } else if (error?.Code === "E_BE_NOT_FOUND") {
      kind = DraftReconcileKindType.ServerMissing;

      if (opts.purgeMissing) {
        await deleteDraft(id);
      }
    } else {
      kind = DraftReconcileKindType.LoadFailed;
    }

    // Structured log: every reconciled draft leaves a trace line so silent
    // divergence is architecturally impossible.
    if (kind === "in-sync") {
      console.info("[reconcileDrafts]", { RuleSetId: id, Kind: kind });
    } else {
      console.warn("[reconcileDrafts]", {
        RuleSetId: id,
        Kind: kind,
        LocalVersion: local.Version,
        ServerVersion: server?.Version ?? null,
        Error: error ?? null,
      });
    }

    out.push({
      RuleSetId: id,
      Kind: kind,
      Local: local,
      Server: server,
      Error: error,
    });
  }

  return out;
}
