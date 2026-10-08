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
    // Ensure every time the UI opens, it opens in Standard mode.
    useUiMode.getState().setMode(UiModeType.Standard);
    useUiPrefsStore.getState().setUiFlavor(UiFlavorType.Standard);
    void import("@/lib/data-source/url-bootstrap").then((m) => m.applyDataSourceFromUrl());
  }, []);

  useGlobalErrors();
  useSeedBootReconcile();
}
