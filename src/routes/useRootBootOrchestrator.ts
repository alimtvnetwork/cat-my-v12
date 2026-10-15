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
    let urlMode: UiModeType | null = null;

    try {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get("mode");

      if (modeParam === "modern") {
        urlMode = UiModeType.Modern;
      } else if (modeParam === "standard") {
        urlMode = UiModeType.Standard;
      }
    } catch {
      /* ignore storage/url parse errors */
    }

    if (urlMode !== null) {
      if (useUiMode.getState().mode !== urlMode) {
        useUiMode.getState().setMode(urlMode);
      }

      const targetFlavor =
        urlMode === UiModeType.Standard ? UiFlavorType.Standard : UiFlavorType.Modern;

      if (useUiPrefsStore.getState().uiFlavor !== targetFlavor) {
        useUiPrefsStore.getState().setUiFlavor(targetFlavor);
      }
    }

    void import("@/lib/data-source/url-bootstrap").then((m) => m.applyDataSourceFromUrl());
  }, []);

  useGlobalErrors();
  useSeedBootReconcile();
}
