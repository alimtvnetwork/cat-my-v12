// Plan 90 Step 136. Composed Save button + conflict modal for the ruleset
// editor. This is the single mount point that binds the state-machine
// (`useSaveRuleSet`), the resolvers (`useSaveConflictResolvers`), and the
// presentational modal (`SaveConflictModal`) so every editor call-site
// shares the identical failure semantics.
//
// Spec: spec/21-app/80-ruleset-draft-save.md
//
// The button is presentation-thin: the caller supplies a `getEnvelope()`
// thunk that returns the current draft envelope at click time (usually
// pulled from local editor state or `getDraft(id)`), and an optional
// `onServerReloaded` callback so the editor can rebind after a reload.

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useSaveRuleSet } from "@/lib/rules/useSaveRuleSet";
import { useSaveConflictResolvers } from "@/lib/rules/useSaveConflictResolvers";
import type { RuleSetEnvelope } from "@/lib/rules/draftStore";
import { SaveConflictModal } from "./SaveConflictModal";

export interface SaveRuleSetButtonProps extends Omit<ButtonProps, "onClick" | "disabled"> {
  /** Read the current draft envelope at click time. */
  getEnvelope: () => RuleSetEnvelope | Promise<RuleSetEnvelope>;
  /** Called with the fresh server envelope after a successful reload. */
  onServerReloaded?: (env: RuleSetEnvelope) => void;
  /** Called with the committed envelope after every successful save. */
  onSaved?: (committed: RuleSetEnvelope) => void;
  /** Optional additional disabled predicate (e.g. no dirty edits). */
  disabled?: boolean;
  children?: React.ReactNode;
}

export function SaveRuleSetButton({
  getEnvelope,
  onServerReloaded,
  onSaved,
  disabled,
  children,
  ...buttonProps
}: SaveRuleSetButtonProps): React.ReactElement {
  const { state, save, reset } = useSaveRuleSet();
  const resolvers = useSaveConflictResolvers({ save, reset, onServerReloaded });

  // Forward `saved` transitions to the caller so it can clear its dirty flag.
  const lastSavedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (state.kind === "saved" && state.savedAt !== lastSavedRef.current) {
      lastSavedRef.current = state.savedAt;
      onSaved?.(state.committed);
    }
  }, [state, onSaved]);

  const busy = state.kind === "saving";

  const handleClick = React.useCallback(async () => {
    try {
      const env = await getEnvelope();
      await save(env);
    } catch (e) {
      // getEnvelope() throwing is a caller bug (not a save bug); log with
      // context so it is not swallowed. `save()` failures are already
      // captured in `state`.
      console.error("[SaveRuleSetButton] getEnvelope failed", e);
    }
  }, [getEnvelope, save]);

  return (
    <>
      <Button
        {...buttonProps}
        onClick={handleClick}
        disabled={busy || disabled}
        data-testid="save-ruleset-button"
        aria-busy={busy || undefined}
      >
        {busy ? "Saving…" : (children ?? "Save")}
      </Button>
      <SaveConflictModal
        state={state}
        onReloadServer={resolvers.onReloadServer}
        onOverwriteLocal={resolvers.onOverwriteLocal}
        onCancel={resolvers.onCancel}
      />
    </>
  );
}
