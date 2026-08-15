import { useEffect } from "react";
import { notifySuccess } from "@/lib/notify";
import { registerShortcut } from "@/lib/shortcuts/registry";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import { getSnapState, setSnapEnabled } from "@/lib/editor/snap-store";
import { useErrorStore } from "@/lib/errors/errorStore";
import { ShortcutScopeBaseType } from "@/lib/shortcuts/scopes";

/**
 * Global workspace-layout hotkeys. Mounted once at the app root so the
 * shortcut works from anywhere in the editor, regardless of which panel or
 * route is focused.
 *
 * Bindings:
 *  - Mod+Alt+0: Reset workspace layout to canonical defaults.
 *    Chosen to avoid clashes with browser shortcuts (Ctrl+Shift+R hard
 *    reload, Ctrl+R reload, Cmd+Shift+0 zoom reset on some browsers).
 */
function toggleSnapGrid() {
  const isCurrentlyEnabled = getSnapState().enabled === true;
  const isNextSnapEnabled = isCurrentlyEnabled === false;

  setSnapEnabled(isNextSnapEnabled);
  notifySuccess(isNextSnapEnabled ? "Snap to grid: on" : "Snap to grid: off");
}

function openErrorHistory() {
  const s = useErrorStore.getState();

  s.openHistoryDrawer();
  console.info(`[hotkey] error-history drawer opened count=${s.history.length}`);
}

function registerLayoutShortcuts(onReset: () => void, onSnap: () => void, onError: () => void) {
  const scope = ShortcutScopeBaseType.Global;

  return [
    registerShortcut({
      id: "layout.reset.ctrl",
      scope,
      combo: "Ctrl+Alt+0",
      label: "Reset workspace layout",
      group: "Workspace",
      run: onReset,
    }),
    registerShortcut({
      id: "layout.reset.meta",
      scope,
      combo: "Meta+Alt+0",
      label: "Reset workspace layout (⌘)",
      group: "Workspace",
      run: onReset,
    }),
    registerShortcut({
      id: "editor.snap.toggle.ctrl",
      scope,
      combo: "Ctrl+;",
      label: "Toggle snap to grid",
      group: "Editor",
      run: onSnap,
    }),
    registerShortcut({
      id: "editor.snap.toggle.meta",
      scope,
      combo: "Meta+;",
      label: "Toggle snap to grid (⌘)",
      group: "Editor",
      run: onSnap,
    }),
    registerShortcut({
      id: "errors.history.ctrl",
      scope,
      combo: "Ctrl+Shift+E",
      label: "Open error history",
      group: "Errors",
      run: onError,
    }),
    registerShortcut({
      id: "errors.history.meta",
      scope,
      combo: "Meta+Shift+E",
      label: "Open error history (⌘)",
      group: "Errors",
      run: onError,
    }),
  ];
}

export function LayoutHotkeys() {
  const resetLayout = useWorkspaceLayoutStore((s) => s.resetLayout);

  useEffect(() => {
    const onReset = () => {
      resetLayout();
      notifySuccess("Workspace layout reset");
    };

    const unsubs = registerLayoutShortcuts(onReset, toggleSnapGrid, openErrorHistory);

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [resetLayout]);

  return null;
}
