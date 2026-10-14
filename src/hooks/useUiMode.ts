import { create } from "zustand";
import { useUiPrefsStore, UiFlavorType } from "@/lib/stores/ui-prefs-store";

export enum UiModeType {
  Modern = "modern",
  Standard = "standard",
}

interface UiModeState {
  mode: UiModeType;
  setMode: (mode: UiModeType) => void;
  toggleMode: () => void;
}

export const useUiMode = create<UiModeState>()(
  (set, get) => ({
    mode: UiModeType.Standard,
    setMode: (mode) => {
      set({ mode });
      const flavor = mode === UiModeType.Standard ? UiFlavorType.Standard : UiFlavorType.Modern;

      if (useUiPrefsStore.getState().uiFlavor !== flavor) {
        useUiPrefsStore.getState().setUiFlavor(flavor);
      }

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("ui-mode-storage", JSON.stringify({ state: { mode } }));
        } catch {
          /* ignore */
        }
      }
    },
    toggleMode: () => {
      const next = get().mode === UiModeType.Modern ? UiModeType.Standard : UiModeType.Modern;
      set({ mode: next });
      const flavor = next === UiModeType.Standard ? UiFlavorType.Standard : UiFlavorType.Modern;

      if (useUiPrefsStore.getState().uiFlavor !== flavor) {
        useUiPrefsStore.getState().setUiFlavor(flavor);
      }

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("ui-mode-storage", JSON.stringify({ state: { mode: next } }));
        } catch {
          /* ignore */
        }
      }
    },
  }),
);
