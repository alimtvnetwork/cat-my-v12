/**
 * Plan 65 steps 15-16 (SS-03): Window menu.
 *
 * A dropdown listing every registered panel with a checkmark reflecting
 * `open && !minimized`. Selecting a panel toggles its open state. Two
 * house-keeping commands sit at the bottom: "Collapse Other Panels"
 * (keeps only the last-focused open panel open) and "Reset Workspace
 * Layout" (drops persisted state back to defaults).
 *
 * Reads and writes go through `useWorkspaceLayoutStore` so the same
 * checks apply as everywhere else (`E_PANEL_UNKNOWN_ID` guard, persist
 * middleware writes the change under `workspace-layout:v1`).
 */
import { useState } from "react";
import { Check, LayoutTemplate, Plus, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PANELS } from "@/lib/workspace/panel-registry";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { useLayoutPresetsStore } from "@/lib/workspace/layout-presets";
import { useRailPanelState } from "@/hooks/useRailPanelState";

// Plan 88 Steps 5 + 7: registry of right-rail panels (Preview / Layers /
// Properties + the five Properties subsections) whose hide/close controls
// were added via CollapsiblePanelSection. Kept co-located so future rail
// panels only need one edit.
interface RailPanelItem {
  storageKey: string;
  title: string;
}

const RAIL_PANELS: RailPanelItem[] = [
  { storageKey: "inspector.main", title: "Inspector" },
  { storageKey: "properties.position", title: "Properties: Position" },
  { storageKey: "properties.size", title: "Properties: Size" },
  { storageKey: "properties.acceptance", title: "Properties: Acceptance" },
  { storageKey: "properties.mask", title: "Properties: Mask" },
  { storageKey: "properties.focus", title: "Properties: Focus" },
  { storageKey: "properties.kind", title: "Properties: Kind" },
];
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notifySuccess } from "@/lib/notify";

export function WindowMenu(): React.JSX.Element | null {
  const panels = useWorkspaceLayoutStore((s) => s.panels);
  const dockSizes = useWorkspaceLayoutStore((s) => s.dockSizes);
  const togglePanel = useWorkspaceLayoutStore((s) => s.togglePanel);
  const openPanel = useWorkspaceLayoutStore((s) => s.openPanel);
  const restorePanel = useWorkspaceLayoutStore((s) => s.restorePanel);
  const resetLayout = useWorkspaceLayoutStore((s) => s.resetLayout);
  const collapseOthers = useWorkspaceLayoutStore((s) => s.collapseOthers);
  const applyLayoutSnapshot = useWorkspaceLayoutStore((s) => s.applyLayoutSnapshot);

  const presets = useLayoutPresetsStore((s) => s.presets);
  const savePreset = useLayoutPresetsStore((s) => s.savePreset);
  const updatePreset = useLayoutPresetsStore((s) => s.updatePreset);
  const renamePreset = useLayoutPresetsStore((s) => s.renamePreset);
  const deletePreset = useLayoutPresetsStore((s) => s.deletePreset);

  const {
    isHidden: isRailPanelHidden,
    hidePanel: hideRailPanel,
    restorePanel: restoreRailPanel,
  } = useRailPanelState();

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function doSave() {
    const name = saveName.trim() || `Layout ${presets.length + 1}`;
    const preset = savePreset(name, { panels, dockSizes });
    notifySuccess(`Saved layout "${preset.name}"`);
    setSaveName("");
    setSaveOpen(false);
  }

  function doApply(id: string) {
    const preset = presets.find((p) => p.id === id);

    if (!preset) return;
    applyLayoutSnapshot(preset.snapshot);
    notifySuccess(`Applied layout "${preset.name}"`);
  }

  function doRename() {
    if (!renameId) return;
    renamePreset(renameId, renameValue);
    setRenameId(null);
    setRenameValue("");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="editor-topbar-button"
            aria-label="Window menu"
            title="Window"
          >
            <LayoutTemplate aria-hidden size={18} />
            <span className="hidden sm:inline">Window</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel>Panels</DropdownMenuLabel>
          {PANELS.map((p) => {
            const state = panels[p.id];
            const visible = !!state?.open && !state.minimized;

            return (
              <DropdownMenuItem
                key={p.id}
                onSelect={(e) => {
                  e.preventDefault();
                  const s = panels[p.id];

                  if (!s?.open) openPanel(p.id);
                  else if (s.minimized) restorePanel(p.id);
                  else togglePanel(p.id);
                }}
              >
                <span className="mr-2 inline-flex w-4 justify-center">
                  {visible ? <Check aria-hidden size={14} /> : null}
                </span>
                <span className="flex-1">{p.title}</span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          {/* Plan 88 Step 8: restore rail panels that Step 5's hide/close
            controls sent to display:none. State comes from
            useRailPanelState (Step 4), which aggregates
            hmi.rail.panel:*.hidden + the RAIL_PANEL_SET_HIDDEN_EVENT. */}
          <DropdownMenuLabel>Rail panels</DropdownMenuLabel>
          {RAIL_PANELS.map((rp) => {
            const hidden = isRailPanelHidden(rp.storageKey);

            return (
              <DropdownMenuItem
                key={rp.storageKey}
                data-testid={`window-menu-rail-${rp.storageKey}`}
                onSelect={(e) => {
                  e.preventDefault();

                  if (hidden) restoreRailPanel(rp.storageKey);
                  else hideRailPanel(rp.storageKey);
                }}
              >
                <span className="mr-2 inline-flex w-4 justify-center">
                  {hidden ? null : <Check aria-hidden size={14} />}
                </span>
                <span className="flex-1">{rp.title}</span>
                {hidden ? <span className="ml-2 text-xs text-muted-foreground">Hidden</span> : null}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Layout presets</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setSaveName(`Layout ${presets.length + 1}`);
              setSaveOpen(true);
            }}
          >
            <Plus aria-hidden size={14} className="mr-2" />
            Save current layout as preset...
          </DropdownMenuItem>
          {presets.length === 0 ? (
            <DropdownMenuItem disabled>No saved presets</DropdownMenuItem>
          ) : (
            presets.map((preset) => (
              <DropdownMenuSub key={preset.id}>
                <DropdownMenuSubTrigger>
                  <span className="mr-2 inline-flex w-4 justify-center">
                    <LayoutTemplate aria-hidden size={14} />
                  </span>
                  <span className="flex-1 truncate">{preset.name}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-48">
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      doApply(preset.id);
                    }}
                  >
                    Apply
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      updatePreset(preset.id, { panels, dockSizes });
                      notifySuccess(`Updated "${preset.name}"`);
                    }}
                  >
                    Overwrite with current
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setRenameId(preset.id);
                      setRenameValue(preset.name);
                    }}
                  >
                    <Pencil aria-hidden size={14} className="mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      deletePreset(preset.id);
                      notifySuccess(`Deleted "${preset.name}"`);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 aria-hidden size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              const firstOpen = PANELS.find((p) => panels[p.id]?.open && !panels[p.id].minimized);

              if (firstOpen) collapseOthers(firstOpen.id);
            }}
          >
            Collapse Other Panels
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              resetLayout();
            }}
          >
            <span className="flex-1">Reset Workspace Layout</span>
            <span className="ml-4 text-xs text-muted-foreground">⌘⌥0</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save layout preset</DialogTitle>
            <DialogDescription>
              Capture the current panels, docks, and sizes as a named preset you can switch to
              later.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              switch (e.key) {
                case KeyboardKeyType.Enter:
                  doSave();
                  break;
              }
            }}
            placeholder="e.g. Inspection view"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doSave}>Save preset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameId !== null} onOpenChange={(o) => !o && setRenameId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename layout preset</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              switch (e.key) {
                case KeyboardKeyType.Enter:
                  doRename();
                  break;
              }
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button onClick={doRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
