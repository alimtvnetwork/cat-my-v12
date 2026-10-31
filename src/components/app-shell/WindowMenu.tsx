/**
 * Plan 65 steps 15-16 (SS-03): Window menu.
 *
 * A dropdown listing every registered panel with a checkmark reflecting
 * `isPanelVisible` (open, not minimized, not Hidden-docked). Selecting a
 * panel opens, restores, or toggles it; a Hidden-docked panel re-opens to
 * its default dock. A "Palettes" section bridges into the palette system
 * (restore/hide for the framed palettes plus "Restore hidden palettes"),
 * and a "Rail panels" section hides/restores right-rail sections. Two
 * house-keeping commands sit at the bottom: "Collapse Other Panels"
 * (keeps only the last-focused visible panel open) and "Reset Workspace
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
import {
  PANELS,
  RAIL_PANELS,
  PALETTE_MENU_ITEMS,
  isPanelVisible,
} from "@/lib/workspace/panel-registry";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { DockSlotType } from "@/lib/enums/ui";
import {
  usePaletteStore,
  PaletteModeType,
  type PaletteId,
} from "@/lib/stores/palette-store";
import { useLayoutPresetsStore } from "@/lib/workspace/layout-presets";
import { useRailPanelState } from "@/hooks/useRailPanelState";

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
  const palettes = usePaletteStore((s) => s.states);
  const setPalette = usePaletteStore((s) => s.set);
  const restorePalette = usePaletteStore((s) => s.restore);
  const restoreHiddenPalettes = usePaletteStore((s) => s.restoreHidden);
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
            const visible = isPanelVisible(state);

            return (
              <DropdownMenuItem
                key={p.id}
                onSelect={(e) => {
                  e.preventDefault();
                  const s = panels[p.id];

                  if (!s?.open || DockSlotType.isHidden(s?.dock)) openPanel(p.id);
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
          {/* Bridge into the palette system (spec 03 section 1.2 defect 1):
            the Window menu is the second restore path for hidden palettes
            (the first is the PaletteFrame Show strip). Palette ids are
            distinct from workspace panels despite overlapping titles:
            "Tools" here is the rule-kind palette, not the icon ribbon,
            and palette "layers"/"preview" have no frame, so they are not
            listed. A hidden or minimized palette restores via restore();
            a visible palette hides via set(), which the same entry
            reverses, so hiding through the menu is never a dead end. */}
          <DropdownMenuLabel>Palettes</DropdownMenuLabel>
          {PALETTE_MENU_ITEMS.map((item) => {
            const palette = palettes[item.id as PaletteId];
            const isPaletteHidden = palette?.mode === PaletteModeType.Hidden;
            const isPaletteMinimized = palette?.mode === PaletteModeType.Minimized;
            const isPaletteVisible =
              palette !== undefined && !isPaletteHidden && !isPaletteMinimized;

            return (
              <DropdownMenuItem
                key={item.id}
                data-testid={`window-menu-palette-${item.id}`}
                onSelect={(e) => {
                  e.preventDefault();

                  if (isPaletteHidden || isPaletteMinimized) restorePalette(item.id as PaletteId);
                  else setPalette(item.id as PaletteId, { mode: PaletteModeType.Hidden });
                }}
              >
                <span className="mr-2 inline-flex w-4 justify-center">
                  {isPaletteVisible ? <Check aria-hidden size={14} /> : null}
                </span>
                <span className="flex-1">{item.title}</span>
                {isPaletteHidden ? (
                  <span className="ml-2 text-xs text-muted-foreground">Hidden</span>
                ) : null}
                {isPaletteMinimized ? (
                  <span className="ml-2 text-xs text-muted-foreground">Minimized</span>
                ) : null}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              restoreHiddenPalettes();
            }}
          >
            Restore hidden palettes
          </DropdownMenuItem>
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
              const firstOpen = PANELS.find((p) => isPanelVisible(panels[p.id]));

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
