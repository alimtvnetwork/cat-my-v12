// Plan 90 Step 136. FE fetch client for `GET /rules/{RuleSetId}`.
//
// Spec: spec/21-app/80-ruleset-draft-save.md
//
// Used by the reload-server conflict resolver: on `E_BE_CONFLICT` the user
// picks "reload server", we GET the freshly committed envelope, mirror it
// into IndexedDB via `putDraft` (with Origin: "server") and hand it back so
// the editor can rebind. Errors surface verbatim via `LoadRuleSetError`
// (subclassing EnvelopeError) so automatic error logging via errorStore
// handles it and upstream UI can route on `Errors.Code` from the Universal Response Envelope.
//
// Browser seam. Do NOT import in server functions. PascalCase field names
// are the wire contract, do NOT camelCase them.

import { beFetch, EnvelopeError } from "@/lib/be-fetch";
import { putDraft, DraftOriginType, type RuleSetEnvelope } from "./draftStore";

export class LoadRuleSetError extends EnvelopeError {
  get httpStatus(): number {
    return this.responseStatus;
  }
}

function wrapLoadError(err: unknown, url: string): LoadRuleSetError {
  if (err instanceof LoadRuleSetError) return err;
  if (err instanceof EnvelopeError) {
    return new LoadRuleSetError({
      code: err.code,
      backendMessage: err.backendMessage,
      endpoint: err.endpoint,
      method: err.method,
      responseStatus: err.responseStatus,
      correlationId: err.correlationId,
      envelope: err.envelope,
      cause: err.cause,
    });
  }
  const message = err instanceof Error ? err.message : String(err);

  return new LoadRuleSetError({
    code: "E_BE_UNKNOWN",
    backendMessage: message,
    endpoint: url,
    method: "GET",
    responseStatus: 0,
    correlationId: "",
    envelope: null,
    cause: err,
  });
}

/**
 * GET the current server-committed envelope for `ruleSetId` and mirror it
 * into IndexedDB. Throws `LoadRuleSetError` on any failure.
 */
export async function loadRuleSet(ruleSetId: number): Promise<RuleSetEnvelope> {
  const url = `/rules/${ruleSetId}/set`;
  try {
    const resEnvelope = await beFetch<RuleSetEnvelope>(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const committed = resEnvelope.Results[0];
    if (!committed) {
      throw new LoadRuleSetError({
        code: "E_BE_UNKNOWN",
        backendMessage: "empty Results on load",
        endpoint: url,
        method: "GET",
        responseStatus: 200,
        correlationId: "",
        envelope: resEnvelope,
      });
    }
    await putDraft({
      ...committed,
      DraftMeta: { ...committed.DraftMeta, Origin: DraftOriginType.Server },
    });

    return committed;
  } catch (err) {
    throw wrapLoadError(err, url);
  }
}