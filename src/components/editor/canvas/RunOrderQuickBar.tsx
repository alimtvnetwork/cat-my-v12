import React, { useState, useEffect } from "react";
import { ArrowUpToLine, ArrowUp, ArrowDown, ArrowDownToLine } from "lucide-react";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { RunOrderQuickBarEdgeType } from "./types";

interface RunOrderQuickBarProps {
  currentIndex: number;
  total: number;
  disabled?: boolean;
  onJump: (zeroIdx: number) => void;
  onStep: (dir: -1 | 1) => void;
  onEdge: (edge: RunOrderQuickBarEdgeType) => void;
}

export function RunOrderQuickBar({
  currentIndex,
  total,
  disabled = false,
  onJump,
  onStep,
  onEdge,
}: RunOrderQuickBarProps): React.JSX.Element | null {
  const oneBased = Math.max(1, currentIndex + 1);
  const [draft, setDraft] = useState<string>(String(oneBased));

  useEffect(() => {
    setDraft(String(oneBased));
  }, [oneBased]);

  const commit = () => {
    const n = Number.parseInt(draft, 10);
    if (!Number.isFinite(n)) {
      setDraft(String(oneBased));
      return;
    }
    const clamped = Math.min(Math.max(1, n), Math.max(1, total));
    if (clamped - 1 !== currentIndex) {
      onJump(clamped - 1);
    }
    setDraft(String(clamped));
  };

  const atStart = currentIndex <= 0;
  const atEnd = currentIndex >= total - 1;
  const btn =
    "flex h-7 w-7 items-center justify-center rounded border border-ca-border bg-ca-panel hover:bg-ca-panel/60 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div
      role="group"
      aria-label="Run order quick controls"
      className="flex items-center gap-1 px-3 py-1.5"
    >
      <button
        type="button"
        role="menuitem"
        title="Send to Back (run first)"
        aria-label="Send to Back"
        disabled={disabled || atStart}
        onClick={() => onEdge(RunOrderQuickBarEdgeType.Start)}
        className={btn}
      >
        <ArrowUpToLine size={12} />
      </button>
      <button
        type="button"
        role="menuitem"
        title="Bring Forward"
        aria-label="Bring Forward"
        disabled={disabled || atStart}
        onClick={() => onStep(-1)}
        className={btn}
      >
        <ArrowUp size={12} />
      </button>
      <div className="flex items-center gap-1 font-mono text-[11px] text-ca-ink-muted">
        <span>#</span>
        <input
          type="number"
          min={1}
          max={Math.max(1, total)}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (KeyboardKeyType.isEnter(e.key)) {
              e.preventDefault();
              commit();
            } else if (KeyboardKeyType.isEscape(e.key)) {
              e.preventDefault();
              setDraft(String(oneBased));
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          aria-label="Run order position"
          className="h-7 w-12 rounded border border-ca-border bg-ca-panel px-1 text-center text-ca-ink outline-none focus:ring-2 focus:ring-[var(--ca-select,#8b5cf6)] disabled:opacity-40"
        />
        <span>/ {Math.max(1, total)}</span>
      </div>
      <button
        type="button"
        role="menuitem"
        title="Send Backward"
        aria-label="Send Backward"
        disabled={disabled || atEnd}
        onClick={() => onStep(1)}
        className={btn}
      >
        <ArrowDown size={12} />
      </button>
      <button
        type="button"
        role="menuitem"
        title="Bring to Front (run last)"
        aria-label="Bring to Front"
        disabled={disabled || atEnd}
        onClick={() => onEdge(RunOrderQuickBarEdgeType.End)}
        className={btn}
      >
        <ArrowDownToLine size={12} />
      </button>
    </div>
  );
}
