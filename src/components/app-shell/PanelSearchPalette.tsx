import { ClientLogger } from "@/lib/observability/client-logger";
export enum PanelSearchPaletteCmdType {
  ExpandSections = "expand-sections",
  CollapseSections = "collapse-sections",
  ResetLayout = "reset-layout",
  CollapseOtherPanels = "collapse-other-panels",
}
/**
 * Editor-scoped panel search palette (plan 65 SS-03).
 *
 * Plan 66 SH-07 update: this palette used to hijack Cmd/Ctrl+Shift+P,
 * but that shortcut now belongs to the global `CommandPalette` (spec
 * SH-06). To avoid two palettes opening on one keystroke, this palette
 * is now toggled by the custom `panel-search:toggle` window event,
 * dispatched by `EditorTopBar`'s Search button. Panels are indexed by
 * `title` and `searchTerms` from the registry; selecting one opens it
 * (or restores it if minimized).
 */
import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PANELS } from "@/lib/workspace/panel-registry";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import { broadcastInspectorSections } from "@/components/editor/CollapsibleSection";

export function PanelSearchPalette() {
  const [open, setOpen] = React.useState(false);
  const openPanel = useWorkspaceLayoutStore((s) => s.openPanel);
  const restorePanel = useWorkspaceLayoutStore((s) => s.restorePanel);

  React.useEffect(() => {
    const onToggle = () => {
      ClientLogger.info("[panel-search] toggle");
      setOpen((v) => !v);
    };
    window.addEventListener("panel-search:toggle", onToggle as EventListener);

    return () => window.removeEventListener("panel-search:toggle", onToggle as EventListener);
  }, []);

  const handleSelect = (panelId: string) => {
    const s = useWorkspaceLayoutStore.getState().panels[panelId];

    if (!s?.open) openPanel(panelId);
    else if (s.minimized) restorePanel(panelId);
    setOpen(false);
  };

  const handleCommand = (cmd: PanelSearchPaletteCmdType) => {
    const state = useWorkspaceLayoutStore.getState();

    if (cmd === PanelSearchPaletteCmdType.ExpandSections) broadcastInspectorSections(true);
    else if (cmd === PanelSearchPaletteCmdType.CollapseSections) broadcastInspectorSections(false);
    else if (cmd === PanelSearchPaletteCmdType.ResetLayout) state.resetLayout();
    else if (cmd === PanelSearchPaletteCmdType.CollapseOtherPanels) {
      const firstOpen = PANELS.find(
        (p) => state.panels[p.id]?.open && !state.panels[p.id].minimized,
      );

      if (firstOpen) state.collapseOthers(firstOpen.id);
    }

    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search panels..." />
      <CommandList>
        <CommandEmpty>No matches</CommandEmpty>
        <CommandGroup heading="Panels">
          {PANELS.map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.title} ${p.searchTerms.join(" ")}`}
              onSelect={() => handleSelect(p.id)}
            >
              {p.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Commands">
          <CommandItem
            value="expand all sections inspector"
            onSelect={() => handleCommand(PanelSearchPaletteCmdType.ExpandSections)}
          >
            Expand all inspector sections
          </CommandItem>
          <CommandItem
            value="collapse all sections inspector"
            onSelect={() => handleCommand(PanelSearchPaletteCmdType.CollapseSections)}
          >
            Collapse all inspector sections
          </CommandItem>
          <CommandItem
            value="collapse other panels workspace"
            onSelect={() => handleCommand(PanelSearchPaletteCmdType.CollapseOtherPanels)}
          >
            Collapse other panels
          </CommandItem>
          <CommandItem
            value="reset workspace layout"
            onSelect={() => handleCommand(PanelSearchPaletteCmdType.ResetLayout)}
          >
            Reset workspace layout
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
