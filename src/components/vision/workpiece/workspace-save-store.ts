import { create } from "zustand";

/**
 * Shared save state for the inspection workspace.
 *
 * The Save button lives on the upper bars (project tabs nav / app shell),
 * while the actual save logic lives inside WorkpieceAnalyzeWorkspace. The
 * workspace registers its save handler here on mount and unregisters it on
 * unmount; the upper-bar button renders only while a handler is registered.
 */
interface WorkspaceSaveState {
  saveHandler: (() => Promise<void>) | null;
  isSaving: boolean;
  registerSave: (handler: (() => Promise<void>) | null) => void;
  setSaving: (isSaving: boolean) => void;
}

export const useWorkspaceSaveStore = create<WorkspaceSaveState>((set) => ({
  saveHandler: null,
  isSaving: false,
  registerSave: (saveHandler) => set({ saveHandler }),
  setSaving: (isSaving) => set({ isSaving }),
}));
