import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  persist(
    (set, get) => ({
      mode: UiModeType.Modern,
      setMode: (mode) => {
        set({ mode });
        const flavor = mode === UiModeType.Standard ? UiFlavorType.Standard : UiFlavorType.Modern;
        if (useUiPrefsStore.getState().uiFlavor !== flavor) {
          useUiPrefsStore.getState().setUiFlavor(flavor);
        }
      },
      toggleMode: () => {
        const next = get().mode === UiModeType.Modern ? UiModeType.Standard : UiModeType.Modern;
        set({ mode: next });
        const flavor = next === UiModeType.Standard ? UiFlavorType.Standard : UiFlavorType.Modern;
        if (useUiPrefsStore.getState().uiFlavor !== flavor) {
          useUiPrefsStore.getState().setUiFlavor(flavor);
        }
      },
    }),
    {
      name: "ui-mode-storage",
    },
  ),
);
