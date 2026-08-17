import { ClientLogger } from "@/lib/observability/client-logger";
import {
  Save,
  UploadCloud,
  Search,
  LayoutGrid,
  ChevronDown,
  FileEdit,
  CalendarClock,
  Link as LinkIcon,
  Undo2,
  Eye,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { notifySuccess } from "@/lib/notify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { usePaletteStore } from "@/lib/stores/palette-store";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import { PanelSearchPalette } from "@/components/app-shell/PanelSearchPalette";
import { useInspectorSectionShortcuts } from "@/components/editor/CollapsibleSection";
import { SavedBadge } from "@/components/settings/SavedBadge";

interface EditorTopBarProps {
  isDirty: boolean;
  onSave: () => void;
  onPublish: () => void;
  /**
   * Epoch-ms timestamp of the last successful save. When present and the
   * editor is not dirty, the shared `SavedBadge` renders next to the pill
   * with a live relative-time label (matches Settings surfaces).
   */
  savedAt?: number | null;
}

// Slim action bar. The global Titlebar + TopMenuBar already provide app
// navigation and a Home entry; duplicating them here caused a double
// header (see issue: user reported "you don't need to have these header
// items inside the control section"). We now render only the right-side
// save/publish/reset controls plus a dirty pill.
export function EditorTopBar({ isDirty, onSave, onPublish, savedAt = null }: EditorTopBarProps): React.JSX.Element | null {
  const [hasDialog, setHasDialog] = useState(false);
  useInspectorSectionShortcuts();
  const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? "⌘" : "Ctrl";
  // Plan 66 SH-07: Cmd/Ctrl+Shift+P now belongs to the global
  // CommandPalette. Dispatch a custom event instead so only the editor's
  // panel-search palette responds to this button.
  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("panel-search:toggle"));
  };
  const resetPalette = usePaletteStore((s) => s.reset);
  const resetWorkspace = useWorkspaceLayoutStore((s) => s.resetLayout);
  const quickReset = () => {
    resetPalette();
    resetWorkspace();
    ClientLogger.info("[reset-layout] one-click reset from editor top bar");
    notifySuccess("Layout restored: Tools left, Rules right.");
  };

  // Portal target: prefer the section-tabs actions slot so Saved / Reset /
  // Search / Save / Preview / Publish share the row with the section tabs
  // (Setup · Projects · Trial run · AI testing). Fall back to the titlebar
  // slot only if the section bar isn't mounted (SSR / narrow layouts / any
  // editor surface that isn't rendered under SectionTopBar).
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const pick = () =>
      document.getElementById("section-topbar-actions-slot") ??
      document.getElementById("titlebar-editor-slot");
    setSlot(pick());
    // Re-resolve after navigation swaps in a different top bar.
    const id = window.setTimeout(() => setSlot(pick()), 0);

    return () => window.clearTimeout(id);
  }, []);

  const body = (
    <div
      className="editor-topbar-merged flex items-center gap-hmi-2 text-ca-chrome-ink"
      role="toolbar"
      aria-label="Editor actions"
    >
      <div className="flex min-w-0 items-center gap-hmi-2">
        <span
          className={`editor-save-pill min-w-0 truncate ${isDirty ? "" : "hidden sm:inline-flex"}`}
          data-dirty={isDirty ? "true" : "false"}
        >
          {isDirty ? "Unsaved" : "Saved"}
        </span>
        {!isDirty ? <SavedBadge at={savedAt} /> : null}
      </div>
      <div className="flex shrink-0 items-center gap-hmi-2">
        <div className="editor-topbar-segment" role="group" aria-label="Layout and file actions">
          <button
            type="button"
            onClick={quickReset}
            className="editor-topbar-segment-button"
            aria-label="Reset layout to default docks"
            aria-keyshortcuts={`${isMac ? "Meta" : "Control"}+Shift+0`}
            title={`Reset layout (${modKey}+Shift+0)`}
            data-testid="quick-reset-layout"
          >
            <LayoutGrid aria-hidden size={14} />
            <span className="editor-topbar-label" aria-hidden="true">
              <span>Reset</span>
            </span>
            <kbd className="editor-topbar-kbd" aria-hidden="true">
              {modKey}
              <span className="editor-topbar-kbd-sep">+</span>⇧0
            </kbd>
          </button>
          <span className="editor-topbar-segment-divider" aria-hidden="true" />
          <button
            type="button"
            onClick={openSearch}
            className="editor-topbar-segment-button"
            aria-label="Search panels"
            aria-keyshortcuts={`${isMac ? "Meta" : "Control"}+K`}
            title={`Search panels (${modKey}+K)`}
          >
            <Search aria-hidden size={14} />
            <span className="editor-topbar-label" aria-hidden="true">
              <span>Search</span>
            </span>
            <kbd className="editor-topbar-kbd" aria-hidden="true">
              {modKey}
              <span className="editor-topbar-kbd-sep">+</span>K
            </kbd>
          </button>
          <span className="editor-topbar-segment-divider" aria-hidden="true" />
          <button
            type="button"
            onClick={onSave}
            className="editor-topbar-segment-button"
            aria-label="Save"
            aria-keyshortcuts={`${isMac ? "Meta" : "Control"}+S`}
            title={`Save (${modKey}+S)`}
            data-emphasis={isDirty ? "true" : "false"}
          >
            <Save aria-hidden size={14} />
            <span className="editor-topbar-label" aria-hidden="true">
              <span>Save</span>
            </span>
            <kbd className="editor-topbar-kbd" aria-hidden="true">
              {modKey}
              <span className="editor-topbar-kbd-sep">+</span>S
            </kbd>
          </button>
        </div>
        <div className="editor-topbar-split" role="group" aria-label="Preview and publish actions">
          <div className="flex items-center pr-2 border-r border-ca-border/40 mr-2 h-6" />
          <button
            type="button"
            onClick={() => notifySuccess("Preview opened in a new tab.")}
            className="editor-topbar-segment-button editor-topbar-preview"
            aria-label="Preview before publishing"
            title="Preview before publishing"
            data-testid="publish-preview"
          >
            <Eye aria-hidden size={14} />
            <span>Preview</span>
          </button>
          <span className="editor-topbar-segment-divider" aria-hidden="true" />
          <button
            type="button"
            onClick={() => {
              onPublish();
              setHasDialog(true);
            }}
            className="editor-topbar-button editor-topbar-button-primary"
            aria-label="Publish"
            aria-keyshortcuts={`${isMac ? "Meta" : "Control"}+Shift+P`}
            title={`Publish (${modKey}+Shift+P)`}
          >
            <UploadCloud aria-hidden size={14} />
            <span>Publish</span>
            <kbd className="editor-topbar-kbd editor-topbar-kbd-on-primary" aria-hidden="true">
              {modKey}
              <span className="editor-topbar-kbd-sep">+</span>⇧P
            </kbd>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="editor-topbar-button editor-topbar-button-primary"
                aria-label="More publish actions"
                title="More publish actions"
                data-testid="publish-split-caret"
              >
                <ChevronDown aria-hidden size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-[220px]">
              <DropdownMenuItem
                onSelect={() => {
                  onPublish();
                  setHasDialog(true);
                }}
              >
                <UploadCloud aria-hidden size={14} />
                <span>Publish</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => notifySuccess("Draft publish staged.")}>
                <FileEdit aria-hidden size={14} />
                <span>Publish as draft</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => notifySuccess("Schedule dialog coming soon.")}>
                <CalendarClock aria-hidden size={14} />
                <span>Schedule…</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={async () => {
                  try {
                    const url = typeof window !== "undefined" ? window.location.origin : "";
                    await navigator.clipboard?.writeText(url);
                    notifySuccess("Live URL copied to clipboard.");
                  } catch {
                    notifySuccess("Copy failed; check clipboard permissions.");
                  }
                }}
              >
                <LinkIcon aria-hidden size={14} />
                <span>Copy live URL</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => notifySuccess("Rollback to previous release staged.")}
              >
                <Undo2 aria-hidden size={14} />
                <span>Rollback…</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {hasDialog ? <PublishDialog onClose={() => setHasDialog(false)} /> : null}
      <PanelSearchPalette />
    </div>
  );

  return slot ? createPortal(body, slot) : body;
}

function PublishDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="absolute right-hmi-3 top-full z-20 mt-hmi-2 border border-ca-border bg-ca-panel p-hmi-3 text-hmi-body shadow-hmi-modal"
    >
      <p>Publish is staged for a later release.</p>
      <button type="button" onClick={onClose} className="editor-topbar-button mt-hmi-2">
        Close
      </button>
    </div>
  );
}
