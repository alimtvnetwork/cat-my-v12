/**
 * Plan 66 SH-05: floating RunningPill.
 *
 * Portals a draggable operator card into <body>. One card per running op,
 * stacked vertically (Q5 default). Clicking the label navigates to the
 * op's `targetRoute`; the Stop button invokes `onStop` via the store.
 * Position is persisted in localStorage under `ca.running-pill.pos.v1`
 * so the operator survives route transitions and reloads.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useHydrated } from "@tanstack/react-router";
import { Loader2, Square, GripVertical } from "lucide-react";
import { useRunningOpsStore } from "@/lib/running-ops-store";
import { clampPillPos, loadPillPos, savePillPos, type PillPos } from "@/lib/running-pill-position";
import type { UseRunningApi } from "@/hooks/useRunning";

declare global {
  interface Window {
    __runningPillTestHooks?: UseRunningApi;
  }
}

const DRAG_THRESHOLD_PX = 4;

export function RunningPill() {
  const hydrated = useHydrated();
  const ops = useRunningOpsStore((s) => s.ops);
  const startOp = useRunningOpsStore((s) => s.start);
  const updateOp = useRunningOpsStore((s) => s.update);
  const stop = useRunningOpsStore((s) => s.stop);
  const navigate = useNavigate();
  const [pos, setPos] = useState<PillPos | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  // `justDraggedRef` outlives the pointerup handler so the trailing click
  // event (which fires *after* we null dragRef) can still detect a drag
  // and suppress the click-to-jump navigation. Cleared on the next tick.
  const justDraggedRef = useRef(false);

  // Test hook: since RunningPill is mounted globally in __root.tsx, exposing
  // the store API here means Playwright can drive the pill without needing
  // to visit a specific route. Gated by `?e2e=1` so prod bundles never leak
  // it. Distinct name from `__runningTestHooks` (which is per-hook) to
  // avoid overwrites between the two.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isE2E = new URLSearchParams(window.location.search).get("e2e") === "1";
    const isProduction = !isE2E;

    if (isProduction) return;
    const api: UseRunningApi = {
      ops,
      isRunning: ops.length > 0,
      start: startOp,
      update: updateOp,
      stop,
    };
    window.__runningPillTestHooks = api;

    return () => {
      if (window.__runningPillTestHooks === api) delete window.__runningPillTestHooks;
    };
  }, [ops, startOp, updateOp, stop]);

  // Load persisted position once hydrated so SSR and first client render match.
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const saved = loadPillPos();

    if (saved) {
      setPos(clampPillPos(saved, window.innerWidth, window.innerHeight));
    } else {
      // Default: bottom-right, 24px inset. Approx card size 220x40.
      setPos({ x: Math.max(0, window.innerWidth - 260), y: Math.max(0, window.innerHeight - 80) });
    }
  }, [hydrated]);

  // Reclamp on viewport resize so the pill never escapes offscreen.
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const onResize = () => {
      setPos((p: PillPos | null) =>
        p ? clampPillPos(p, window.innerWidth, window.innerHeight) : p,
      );
    };
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, [hydrated]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pos) {
        return;
      }
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
        moved: false,
      };
    },
    [pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) {
      return;
    }
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const isBelowThreshold = Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD_PX;

    if (!d.moved && isBelowThreshold) {
      return;
    }
    d.moved = true;
    setPos(
      clampPillPos({ x: d.origX + dx, y: d.origY + dy }, window.innerWidth, window.innerHeight),
    );
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      dragRef.current = null;
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (d?.moved && pos) {
        savePillPos(pos);
        console.info("[running-pill] drag-end", pos);
        justDraggedRef.current = true;
        // Clear on the next macrotask, after React fires the synthetic
        // click that follows pointerup on the same target.
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 0);
      }
    },
    [pos],
  );

  if (!hydrated || ops.length === 0 || !pos) {
    return null;
  }

  const jump = (targetRoute: string | undefined) => {
    if (!targetRoute) {
      return;
    }
    console.info("[running-pill] click-to-jump", targetRoute);
    // targetRoute is a string; use `to` cast so TanStack navigate accepts it.
    navigate({ to: targetRoute }).catch((err) => {
      console.error("[running-pill] navigate failed", targetRoute, err);
    });
  };

  const card = (
    <div
      data-running-pill-root
      role="group"
      aria-label="Running operations"
      className="pointer-events-auto fixed z-50 flex flex-col gap-1"
      style={{ left: pos.x, top: pos.y }}
    >
      {ops.map((op) => (
        <div
          key={op.id}
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-full border border-ca-border bg-ca-panel px-2 py-1 text-hmi-body text-ca-ink shadow-sm"
          data-running-pill
          data-op-id={op.id}
        >
          <span
            role="button"
            tabIndex={-1}
            aria-label="Drag to move"
            data-drag-handle
            className="inline-flex h-5 w-5 cursor-grab items-center justify-center text-ca-ink-muted"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden />
          </span>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-ca-primary" aria-hidden />
          <button
            type="button"
            className="hmi-focus-ring max-w-40 truncate rounded-sm px-1 text-left hover:bg-ca-select/40 disabled:cursor-default"
            disabled={!op.targetRoute}
            onClick={(e) => {
              // Ignore clicks that were part of a drag (moved past threshold).
              if (justDraggedRef.current) {
                e.preventDefault();
                console.info("[running-pill] click suppressed after drag");

                return;
              }

              jump(op.targetRoute);
            }}
            aria-label={op.targetRoute ? `Jump to ${op.label}` : op.label}
            title={op.targetRoute ? `Jump to ${op.targetRoute}` : op.label}
          >
            {op.label}
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              stop(op.id);
            }}
            aria-label={`Stop ${op.label}`}
            title="Stop"
            className="hmi-focus-ring inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-ca-danger/20"
          >
            <Square className="h-3 w-3" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );

  return createPortal(card, document.body);
}
