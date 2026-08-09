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
import { beFetch } from "@/lib/be-fetch";

/**
 * PUT the envelope to `/rules/{RuleSetId}` and mirror the committed response
 * back into IndexedDB. Throws `EnvelopeError` on any non-2xx response.
 */
export async function saveRuleSet(envelope: RuleSetEnvelope): Promise<RuleSetEnvelope> {
  const resp = await beFetch<RuleSetEnvelope>(`/rules/${envelope.RuleSetId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope),
  });

  const results = resp.Results;
  const committed = results && results.length > 0 ? results[0] : null;

  if (!committed) {
    throw new Error("E_BE_UNKNOWN: empty Results on save");
  }

  await putDraft(committed);

  return committed;
}
