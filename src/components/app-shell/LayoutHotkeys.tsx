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
export function LayoutHotkeys() {
  const resetLayout = useWorkspaceLayoutStore((s) => s.resetLayout);

  useEffect(() => {
    const resetHandler = () => {
      resetLayout();
      notifySuccess("Workspace layout reset");
    };
    const snapHandler = () => {
      const next = !getSnapState().enabled;
      setSnapEnabled(next);
      notifySuccess(next ? "Snap to grid: on" : "Snap to grid: off");
    };
    // Plan 83 backlog #26: Ctrl/Cmd+Shift+E opens the dedicated Error History
    // drawer. Distinct from the Global Error Modal so users can browse the
    // full session log without losing the currently focused error.
    const errorHistoryHandler = () => {
      const s = useErrorStore.getState();
      s.openHistoryDrawer();
      console.info(`[hotkey] error-history drawer opened count=${s.history.length}`);
    };

    // Plan 100 §13 step 15: migrate onto registry. Register both Ctrl
    // and Meta variants so the same intent works on Windows/Linux and
    // macOS without a bespoke `mod` matcher.
    const unsubs = [
      registerShortcut({
        id: "layout.reset.ctrl",
        scope: ShortcutScopeBaseType.Global,
        combo: "Ctrl+Alt+0",
        label: "Reset workspace layout",
        group: "Workspace",
        run: resetHandler,
      }),
      registerShortcut({
        id: "layout.reset.meta",
        scope: ShortcutScopeBaseType.Global,
        combo: "Meta+Alt+0",
        label: "Reset workspace layout (⌘)",
        group: "Workspace",
        run: resetHandler,
      }),
      // Photoshop parity: Ctrl+; toggles grid/guides.
      registerShortcut({
        id: "editor.snap.toggle.ctrl",
        scope: ShortcutScopeBaseType.Global,
        combo: "Ctrl+;",
        label: "Toggle snap to grid",
        group: "Editor",
        run: snapHandler,
      }),
      registerShortcut({
        id: "editor.snap.toggle.meta",
        scope: ShortcutScopeBaseType.Global,
        combo: "Meta+;",
        label: "Toggle snap to grid (⌘)",
        group: "Editor",
        run: snapHandler,
      }),
      registerShortcut({
        id: "errors.history.ctrl",
        scope: ShortcutScopeBaseType.Global,
        combo: "Ctrl+Shift+E",
        label: "Open error history",
        group: "Errors",
        run: errorHistoryHandler,
      }),
      registerShortcut({
        id: "errors.history.meta",
        scope: ShortcutScopeBaseType.Global,
        combo: "Meta+Shift+E",
        label: "Open error history (⌘)",
        group: "Errors",
        run: errorHistoryHandler,
      }),
    ];

    return () => {
      for (const u of unsubs) u();
    };
  }, [resetLayout]);

  return null;
}
