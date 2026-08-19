import React from "react";
import { EditorRuleKind } from "@/lib/editor/types";
import { editorKindLabel } from "@/lib/editor/tools";
import type { KeyboardDndState } from "@/lib/editor/dnd/keyboard-controller";

interface CanvasViewportStatusHudProps {
  activeKind: EditorRuleKind;
  selectedIds: string[];
  keyboardDnd: KeyboardDndState;
  pointerCoords: { x: number; y: number } | null;
}

export function CanvasViewportStatusHud({
  activeKind,
  selectedIds,
  keyboardDnd,
  pointerCoords,
}: CanvasViewportStatusHudProps) {
  return (
    <div className="editor-canvas-hud" aria-live="polite">
      <span>{editorKindLabel(activeKind)}</span>
      <span className="editor-canvas-hud-secondary">Selected {selectedIds.length}</span>
      {keyboardDnd.activeRect ? (
        <span
          className="editor-canvas-hud-secondary tabular-nums"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(keyboardDnd.activeRect.x)}, {Math.round(keyboardDnd.activeRect.y)}
        </span>
      ) : pointerCoords ? (
        <span
          className="editor-canvas-hud-secondary tabular-nums"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(pointerCoords.x)}, {Math.round(pointerCoords.y)}
        </span>
      ) : null}
    </div>
  );
}
