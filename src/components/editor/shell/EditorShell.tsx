import { useEffect, type ReactNode } from "react";
import { PanelHost } from "@/components/app-shell/panels";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";
import { DockedPropertiesPanel } from "./DockedPropertiesPanel";

export interface EditorShellProps {
  topBar?: ReactNode;
  ribbon?: ReactNode;
  rail?: ReactNode;
  status?: ReactNode;
  children?: ReactNode;
}

export function EditorShell({ topBar, ribbon, rail, status, children }: EditorShellProps): React.JSX.Element | null {
  // Plan 65: the editor shell delegates to PanelHost so every registered
  // workspace panel (Tools, Rules, plus anything opened from the Window
  // menu) renders with correct open / minimized / floating state driven
  // by the workspace layout store.

  // Narrow viewports auto-minimize both side panels once on mount so the
  // canvas is usable on mobile. Users can still expand them manually.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");

    if (mq.matches) {
      const s = useWorkspaceLayoutStore.getState();

      if (s.panels.tools?.open && !s.panels.tools.minimized) s.minimizePanel("tools");

      if (s.panels.rules?.open && !s.panels.rules.minimized) s.minimizePanel("rules");
    }
  }, []);

  const density = useUiPrefsStore((s) => s.headerDensity);

  return (
    <div
      data-density={density}
      className="editor-shell flex h-full min-h-0 flex-col bg-ca-bg text-ca-ink font-hmi antialiased"
    >
      <div className="editor-shell-topbar shrink-0">{topBar}</div>
      <PanelHost
        content={{ tools: ribbon, rules: rail, properties: <DockedPropertiesPanel /> }}
        canvasSlot={
          <main
            className="editor-shell-canvas flex min-h-0 min-w-0 flex-1 flex-col"
            data-testid="editor-canvas-slot"
            aria-label="Setup editor canvas"
          >
            {children}
          </main>
        }
      />
      <div className="editor-shell-status shrink-0">{status}</div>
    </div>
  );
}
