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
      isModernMode = params.get("mode") === "modern";
    } catch {
      /* ignore storage/url parse errors */
    }

    if (isModernMode) {
      if (useUiMode.getState().mode !== UiModeType.Modern) {
        useUiMode.getState().setMode(UiModeType.Modern);
      }

      if (useUiPrefsStore.getState().uiFlavor !== UiFlavorType.Modern) {
        useUiPrefsStore.getState().setUiFlavor(UiFlavorType.Modern);
      }
    } else {
      if (useUiMode.getState().mode !== UiModeType.Standard) {
        useUiMode.getState().setMode(UiModeType.Standard);
      }

      if (useUiPrefsStore.getState().uiFlavor !== UiFlavorType.Standard) {
        useUiPrefsStore.getState().setUiFlavor(UiFlavorType.Standard);
      }
    }

    void import("@/lib/data-source/url-bootstrap").then((m) => m.applyDataSourceFromUrl());
  }, []);

  useGlobalErrors();
  useSeedBootReconcile();
}
