import { Copy, Trash2 } from "lucide-react";
import { RuleActionKindType, type RuleActionKind } from "./SelectionOverlayConstants";
import type { EditorRule } from "@/lib/editor/types";

interface Props {
  rule: EditorRule;
  tl: { x: number; y: number };
  br: { x: number; y: number };
  canvasSize: { width: number; height: number };
  onAction: (id: string, action: RuleActionKind, payload?: number) => void;
}

export function SelectionOverlayQuickActions({ rule, tl, br, canvasSize, onAction }: Props) {
  // Dock the quick-actions strip to the OUTSIDE-RIGHT edge of the ROI as
  // a vertical stack so it never collides with the X·Y / W×H / name-chip
  // stack sitting above the shape, or with the rotation handle sitting
  // above the top-right corner. Flip to outside-LEFT when the shape
  // hugs the right canvas edge so buttons never render off-canvas.
  const GAP = 8;
  const STRIP_W = 28; // one column of 24px buttons + padding
  let left = br.x + GAP;
  if (left + STRIP_W > canvasSize.width) {
    left = tl.x - GAP - STRIP_W;
  }
  const STRIP_H = 64; // rough height of two 24px buttons + padding
  // clamp left to stay on screen
  left = Math.max(8, Math.min(left, canvasSize.width - STRIP_W - 8));
  const top = Math.max(8, Math.min(tl.y, canvasSize.height - STRIP_H - 8));

  return (
    <div
      className="pointer-events-auto absolute z-40 flex flex-col items-center gap-1 rounded-md border border-ca-border bg-ca-panel-2/95 p-1 shadow-md backdrop-blur-sm"
      style={{ left, top }}
      onPointerDown={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label={`Quick actions for ${rule.name}`}
      data-testid="rule-quick-actions"
    >
      <button
        type="button"
        aria-label={`Duplicate ${rule.name}`}
        title="Duplicate (copies all properties)"
        className="flex h-6 w-6 items-center justify-center rounded-sm text-ca-ink hover:bg-ca-panel"
        onClick={() => onAction(rule.id, RuleActionKindType.Duplicate)}
        data-testid="rule-quick-duplicate"
      >
        <Copy size={13} />
      </button>
      <button
        type="button"
        aria-label={rule.isLocked ? `Cannot delete locked ${rule.name}` : `Delete ${rule.name}`}
        title={rule.isLocked ? "Unlock first (right-click, Unlock)" : "Delete"}
        disabled={rule.isLocked}
        className="flex h-6 w-6 items-center justify-center rounded-sm text-ca-ng hover:bg-ca-panel hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => onAction(rule.id, RuleActionKindType.Delete)}
        data-testid="rule-quick-delete"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
