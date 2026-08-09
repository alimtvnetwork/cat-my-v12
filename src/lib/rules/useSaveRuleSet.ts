// Plan 90 Step 134. React hook that wraps `saveRuleSet` with an explicit
// `SaveState` union so every editor and the future conflict-resolution modal
// bind to the same state machine.
//
// Spec: spec/21-app/80-ruleset-draft-save.md
//
// States:
//   { kind: "idle" }
//   { kind: "saving", startedAt }
//   { kind: "saved",  committed, savedAt }
//   { kind: "conflict", localEnvelope, error }     // E_BE_CONFLICT (409)
//   { kind: "error",    error }                    // any other SaveRuleSetError
//
// Actions:
//   save(envelope)  - PUT via saveRuleSet; transitions saving -> saved | conflict | error
//   reset()         - back to idle (dismiss modal / retry from scratch)
//
// The hook does NOT decide how to resolve a conflict (reload-server vs
// overwrite-local vs merge). That belongs to the Step 135 modal, which
// reads `state.localEnvelope`, calls the appropriate resolver, then calls
// `save()` again or `reset()`.

import { useCallback, useRef, useState } from "react";
import { saveRuleSet, type SaveRuleSetError } from "./saveRuleSet";
import type { RuleSetEnvelope } from "./draftStore";

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving"; startedAt: string }
  | { kind: "saved"; committed: RuleSetEnvelope; savedAt: string }
  | { kind: "conflict"; localEnvelope: RuleSetEnvelope; error: SaveRuleSetError }
  | { kind: "error"; error: SaveRuleSetError };

export interface UseSaveRuleSet {
  state: SaveState;
  save: (envelope: RuleSetEnvelope) => Promise<void>;
  reset: () => void;
}

function isSaveRuleSetError(e: unknown): e is SaveRuleSetError {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof (e as { code?: unknown }).code === "string" &&
    typeof (e as { httpStatus?: unknown }).httpStatus === "number"
  );
}

export function useSaveRuleSet(): UseSaveRuleSet {
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  // Guard against overlapping saves: only the latest call may commit state.
  const seqRef = useRef(0);

  const save = useCallback(async (envelope: RuleSetEnvelope): Promise<void> => {
    const mySeq = ++seqRef.current;
    setState({ kind: "saving", startedAt: new Date().toISOString() });
    try {
      const committed = await saveRuleSet(envelope);

      if (mySeq !== seqRef.current) return; // stale
      setState({
        kind: "saved",
        committed,
        savedAt: new Date().toISOString(),
      });
    } catch (e) {
      if (mySeq !== seqRef.current) return; // stale

      if (isSaveRuleSetError(e)) {
        if (e.code === "E_BE_CONFLICT") {
          setState({ kind: "conflict", localEnvelope: envelope, error: e });
          // Log with context so silent conflict-swallowing is impossible.
          console.warn("[useSaveRuleSet] conflict", {
            code: e.code,
            httpStatus: e.httpStatus,
            RuleSetId: envelope.RuleSetId,
            Version: envelope.Version,
          });

          return;
        }

        setState({ kind: "error", error: e });
        console.error("[useSaveRuleSet] save failed", {
          code: e.code,
          httpStatus: e.httpStatus,
          RuleSetId: envelope.RuleSetId,
        });

        return;
      }
      // Unknown throw: surface as generic error (E_BE_UNKNOWN) rather than
      // swallow.
      const wrapped = new Error(
        e instanceof Error ? e.message : "unknown save failure",
      ) as SaveRuleSetError;
      wrapped.code = "E_BE_UNKNOWN";
      wrapped.httpStatus = 0;
      wrapped.backendMessage = wrapped.message;
      setState({ kind: "error", error: wrapped });
      console.error("[useSaveRuleSet] non-SaveRuleSetError thrown", e);
    }
  }, []);

  const reset = useCallback((): void => {
    seqRef.current++;
    setState({ kind: "idle" });
  }, []);

  return { state, save, reset };
}
