// Plan 90 Step 133. FE Save-button client for RuleSetEnvelope.
//
// Spec: spec/21-app/80-ruleset-draft-save.md
// Wire: PUT /rules/{RuleSetId} with the identical PascalCase envelope written
// to IndexedDB by `draftStore.putDraft`. On success, mirror the server
// response back into IndexedDB with `Origin: "server"` so subsequent quick
// edits diff against the last-known-committed snapshot.
//
// This module is a browser seam. Do NOT import in server functions.
// Errors are surfaced verbatim (Universal Response Envelope Errors.Code) so
// upstream UI can route on `E_BE_BAD_REQUEST` / `E_BE_CONFLICT` etc.

import { putDraft, type RuleSetEnvelope } from "./draftStore";

export interface SaveRuleSetError extends Error {
  code: string;
  httpStatus: number;
  backendMessage: string;
}

function toSaveError(status: number, body: unknown): SaveRuleSetError {
  const errors = (body as { Errors?: { Code?: string; BackendMessage?: string } } | null)?.Errors;
  const code = errors?.Code ?? "E_BE_UNKNOWN";
  const msg = errors?.BackendMessage ?? `PUT /rules failed with HTTP ${status}`;
  const err = new Error(msg) as SaveRuleSetError;
  err.code = code;
  err.httpStatus = status;
  err.backendMessage = msg;

  return err;
}

/**
 * PUT the envelope to `/rules/{RuleSetId}` and mirror the committed response
 * back into IndexedDB. Throws `SaveRuleSetError` on any non-2xx response.
 */
export async function saveRuleSet(envelope: RuleSetEnvelope): Promise<RuleSetEnvelope> {
  const resp = await fetch(`/rules/${envelope.RuleSetId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope),
  });
  const body = await resp.json().catch(() => null);

  if (resp.ok === false) {
    throw toSaveError(resp.status, body);
  }

  const results = (body as { Results?: RuleSetEnvelope[] } | null)?.Results;
  const committed = results && results.length > 0 ? results[0] : null;

  if (!committed) {
    throw toSaveError(resp.status, {
      Errors: { Code: "E_BE_UNKNOWN", BackendMessage: "empty Results on save" },
    });
  }

  await putDraft(committed);

  return committed;
}
