import { useEffect } from "react";
import { useCliHotkeys } from "@/hooks/use-cli-hotkeys";
import { useSingleHeaderInvariant } from "@/lib/dev/single-header-invariant";
import { useGlobalErrors } from "@/lib/boot/install-global-errors";
import { useSeedBootReconcile } from "@/lib/boot/seed-orchestration";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { useUiPrefsStore, UiFlavorType } from "@/lib/stores/ui-prefs-store";

export function useRootBootOrchestrator() {
  useSingleHeaderInvariant();
  useCliHotkeys();

  useEffect(() => {
    let isModernMode = false;

    try {
      const params = new URLSearchParams(window.location.search);

      if (params.get("mode") === "modern") {
        isModernMode = true;
      } else if (params.get("mode") !== "standard") {
        const stored = window.localStorage.getItem("ui-mode-storage");

        if (stored) {
          const parsed = JSON.parse(stored);

          if (parsed?.state?.mode === UiModeType.Modern) {
            isModernMode = true;
          }
        }
      }
    } catch {
      /* ignore storage/url parse errors */
    }

    if (isModernMode) {
      useUiMode.getState().setMode(UiModeType.Modern);
      useUiPrefsStore.getState().setUiFlavor(UiFlavorType.Modern);
    } else {
      useUiMode.getState().setMode(UiModeType.Standard);
      useUiPrefsStore.getState().setUiFlavor(UiFlavorType.Standard);
    }

    void import("@/lib/data-source/url-bootstrap").then((m) => m.applyDataSourceFromUrl());
  }, []);

  useGlobalErrors();
  useSeedBootReconcile();
}
