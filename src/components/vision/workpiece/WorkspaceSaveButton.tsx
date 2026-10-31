import { Check } from "lucide-react";
import { useWorkspaceSaveStore } from "./workspace-save-store";

/**
 * Save Changes button for the upper bars (project tabs nav, HMI section
 * top bar, analyze shell). Renders nothing unless a workspace has
 * registered a save handler.
 */
export function WorkspaceSaveButton(): React.JSX.Element | null {
  const saveHandler = useWorkspaceSaveStore((s) => s.saveHandler);
  const isSaving = useWorkspaceSaveStore((s) => s.isSaving);

  if (!saveHandler) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void saveHandler()}
      disabled={isSaving}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[oklch(0.76_0.145_210/0.5)] bg-[oklch(0.76_0.145_210)] px-3.5 py-1 font-sans text-xs font-bold uppercase tracking-wider text-[#0a0d14] shadow-[0_0_12px_oklch(0.76_0.145_210/0.35)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
    >
      <Check size={13} className="text-[#0a0d14]" />
      {isSaving ? "Saving..." : "Save"}
    </button>
  );
}
