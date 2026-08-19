import React from "react";
import { Check, LayoutTemplate } from "lucide-react";
import {
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { PANELS } from "@/lib/workspace/panel-registry";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import {
  type PanelMap,
  type PanelToggle,
  toggleWindowPanel,
  collapseFirstOpenPanel,
} from "./TopMenuBarConstants";

export function WindowMenubarGroup(): React.JSX.Element | null {
  const panels = useWorkspaceLayoutStore((s) => s.panels);
  const togglePanel = useWorkspaceLayoutStore((s) => s.togglePanel);
  const openPanel = useWorkspaceLayoutStore((s) => s.openPanel);
  const restorePanel = useWorkspaceLayoutStore((s) => s.restorePanel);
  const resetLayout = useWorkspaceLayoutStore((s) => s.resetLayout);
  const collapseOthers = useWorkspaceLayoutStore((s) => s.collapseOthers);

  return (
    <MenubarMenu>
      <MenubarTrigger
        aria-label="Window menu"
        data-testid="topnav-trigger"
        style={{ willChange: "background-color" }}
        className="hmi-focus-ring-inset relative inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-sm px-hmi-2 text-[12px] font-medium leading-none tracking-normal text-ca-chrome-ink/75 transition-colors duration-150 ease-out hover:bg-ca-panel-2 hover:text-ca-chrome-ink data-[state=open]:bg-ca-panel-2 data-[state=open]:text-ca-chrome-ink focus-visible:outline-none after:pointer-events-none after:absolute after:left-hmi-2 after:right-hmi-2 after:bottom-0 after:h-[2px] after:rounded-full after:bg-current after:opacity-0 after:transition-opacity after:duration-150 after:ease-out hover:after:opacity-60 data-[state=open]:after:opacity-100"
      >
        <LayoutTemplate aria-hidden className="h-3.5 w-3.5" />
        Window
      </MenubarTrigger>
      <MenubarContent
        align="end"
        sideOffset={6}
        className="min-w-[16rem] border-ca-border bg-ca-panel p-1.5 text-ca-ink shadow-hmi-panel"
      >
        {PANELS.map((panel) => (
          <MenubarItem
            key={panel.id}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-[0.9rem] text-ca-ink hover:bg-ca-panel-2"
            onSelect={() =>
              toggleWindowPanel(panel.id, panels, openPanel, restorePanel, togglePanel)
            }
          >
            <span className="inline-flex w-4 justify-center">
              {panels[panel.id]?.open && !panels[panel.id].minimized ? (
                <Check aria-hidden size={14} />
              ) : null}
            </span>
            <span>{panel.title}</span>
          </MenubarItem>
        ))}
        <MenubarSeparator className="bg-ca-border" />
        <MenubarItem
          className="flex cursor-pointer items-center rounded-md px-3 py-2 text-[0.9rem] text-ca-ink hover:bg-ca-panel-2"
          onSelect={() => collapseFirstOpenPanel(panels, collapseOthers)}
        >
          Collapse Other Panels
        </MenubarItem>
        <MenubarItem
          className="flex cursor-pointer items-center rounded-md px-3 py-2 text-[0.9rem] text-ca-ink hover:bg-ca-panel-2"
          onSelect={resetLayout}
        >
          Reset Workspace Layout
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  );
}
