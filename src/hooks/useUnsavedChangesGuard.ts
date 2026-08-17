import { useRuleDrafts } from "@/hooks/useRuleDrafts";

/**
 * Hook providing an "Unsaved Changes" guard for the rules editor.
 * Call `checkUnsavedChanges()` in router beforeLeave handlers to prompt the user.
 */
export function useUnsavedChangesGuard(rulesetId?: number) {
  const { draft } = useRuleDrafts(rulesetId ?? 0);
  const hasDraft = !!draft;

  function checkUnsavedChanges(): boolean {
    if (!hasDraft) {
      return true;
    }
    return window.confirm("You have unsaved changes. Are you sure you want to leave?");
  }

  return { checkUnsavedChanges, hasDraft };
}
