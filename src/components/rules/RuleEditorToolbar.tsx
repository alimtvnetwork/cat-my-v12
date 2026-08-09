// Plan 81 step 14 / Plan 88 follow-up. Compact 40px toolbar for the
// rules editor. Primary actions (Undo, Redo, Snap on/off) stay inline;
// secondary controls (alignment guides toggle, grid pitch stepper, snap
// debug HUD) move into a "…" overflow menu so the header stays under a
// single visual line at HMI density.

import {
  Grid3x3,
  Magnet,
  Minus,
  MoreHorizontal,
  Plus,
  Redo2,
  Ruler,
  ScanEye,
  Undo2,
} from "lucide-react";
import {
  setSnapEnabled,
  setSnapGrid,
  setSnapDebug,
  setSnapShowGuides,
  useSnap,
} from "@/lib/editor/snap-store";
import { useMemo } from "react";
import { createRuleController } from "@/lib/editor/controller/RuleController";
import {
  selectRedoCount,
  selectUndoCount,
  useHistoryStore,
} from "@/lib/editor/store/history-slice";
import { useSaveStatus } from "@/lib/editor/store/save-status";
import { SavedBadge } from "@/components/settings/SavedBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BTN_BASE =
  "inline-flex h-6 min-w-[26px] items-center justify-center gap-[2px] rounded-sm border px-[6px] text-[11px] leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-select focus-visible:ring-offset-1 focus-visible:ring-offset-ca-panel";
const BTN_INACTIVE =
  "border-ca-border bg-ca-panel text-ca-ink-muted hover:border-ca-select hover:text-ca-ink";
const BTN_ACTIVE = "border-ca-select bg-ca-panel-2 text-ca-ink";

function clampGrid(px: number): number {
  if (Number.isFinite(px) === false) return 8;

  return Math.max(1, Math.min(64, Math.round(px)));
}

export function RuleEditorToolbar() {
  const snap = useSnap();
  const undoCount = useHistoryStore(selectUndoCount);
  const redoCount = useHistoryStore(selectRedoCount);
  const controller = useMemo(() => createRuleController(), []);
  const savedAt = useSaveStatus((s) => s.savedAt);

  return (
    <div
      role="toolbar"
      aria-label="Rule editor toolbar"
      className="flex h-8 shrink-0 items-center gap-hmi-1 border-b border-ca-border bg-ca-panel px-hmi-2"
      data-testid="rule-editor-toolbar"
    >
      {/* History cluster */}
      <div className="flex items-center gap-[3px]" role="group" aria-label="History">
        <button
          type="button"
          onClick={() => controller.undo()}
          disabled={undoCount === 0}
          className={`${BTN_BASE} ${BTN_INACTIVE} disabled:cursor-not-allowed disabled:opacity-40`}
          title={`Undo (${undoCount})`}
          aria-label="Undo"
          data-testid="toolbar-undo"
        >
          <Undo2 size={13} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => controller.redo()}
          disabled={redoCount === 0}
          className={`${BTN_BASE} ${BTN_INACTIVE} disabled:cursor-not-allowed disabled:opacity-40`}
          title={`Redo (${redoCount})`}
          aria-label="Redo"
          data-testid="toolbar-redo"
        >
          <Redo2 size={13} aria-hidden />
        </button>
      </div>

      <span aria-hidden className="h-5 w-px bg-ca-border" />

      {/* Snap primary */}
      <button
        type="button"
        onClick={() => setSnapEnabled(!snap.enabled)}
        aria-pressed={snap.enabled}
        className={`${BTN_BASE} ${snap.enabled ? BTN_ACTIVE : BTN_INACTIVE}`}
        title={snap.enabled ? "Snap on" : "Snap off"}
        data-testid="toolbar-snap-toggle"
      >
        <Magnet size={13} aria-hidden />
        <span className="sr-only">Toggle snap</span>
      </button>

      {/* Overflow: guides, grid pitch, debug HUD */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`${BTN_BASE} ${BTN_INACTIVE}`}
            aria-label="More snap and view options"
            title="More snap and view options"
            data-testid="toolbar-overflow-trigger"
          >
            <MoreHorizontal size={13} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuLabel>Snap</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={snap.showGuides}
            onCheckedChange={(v) => setSnapShowGuides(!!v)}
            data-testid="toolbar-guides-toggle"
          >
            <Ruler size={13} className="mr-2" aria-hidden />
            Alignment guides
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={snap.debug}
            onCheckedChange={(v) => setSnapDebug(!!v)}
            data-testid="toolbar-debug-toggle"
          >
            <ScanEye size={13} className="mr-2" aria-hidden />
            Snap debug HUD
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Grid pitch</DropdownMenuLabel>
          <div
            className="flex items-center gap-hmi-1 px-2 py-1"
            role="group"
            aria-label="Grid pitch"
          >
            <Grid3x3 size={13} aria-hidden className="text-ca-ink-muted" />
            <button
              type="button"
              onClick={() => setSnapGrid(clampGrid(snap.gridPx - 1))}
              className={`${BTN_BASE} ${BTN_INACTIVE}`}
              aria-label="Decrease grid pitch"
              disabled={snap.gridPx <= 1}
            >
              <Minus size={11} aria-hidden />
            </button>
            <span
              className="min-w-[42px] rounded-sm border border-ca-border bg-ca-panel-2 px-[5px] py-[3px] text-center font-mono text-[12px] leading-none tabular-nums text-ca-ink"
              aria-live="polite"
              data-testid="toolbar-grid-value"
            >
              {snap.gridPx}px
            </span>
            <button
              type="button"
              onClick={() => setSnapGrid(clampGrid(snap.gridPx + 1))}
              className={`${BTN_BASE} ${BTN_INACTIVE}`}
              aria-label="Increase grid pitch"
              disabled={snap.gridPx >= 64}
            >
              <Plus size={11} aria-hidden />
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex min-w-0 items-center gap-hmi-2 text-[11px] text-ca-ink-muted">
        <SavedBadge at={savedAt} />
        <span aria-hidden className="truncate">
          Ready
        </span>
      </div>
    </div>
  );
}
