// Persist the floating properties HUD position per scope (project id or
// "global" when the HUD is rendered outside a project route).
//
// Plan 83 backlog item 9 (issue #33): stored values now carry an `anchor`
// so the HUD can either follow the selected shape ("shape": x/y are a
// delta from the shape's canvas-space top-left) or stay pinned to the
// canvas ("canvas": x/y are absolute canvas-space coordinates).
// A `null` value means "use the auto-anchored default next to the
// selection".
//
// Storage key was bumped to `v2` so legacy absolute positions written
// under `v1` are ignored (they were unlabelled and would be misread as
// a shape delta). Old keys are left in place; they simply become dead
// data and expire with the next explicit HUD drag.
import { useCallback, useEffect, useState } from "react";

export enum HudAnchorType {
  Shape = "shape",
  Canvas = "canvas",
}
export type HudAnchor = HudAnchorType;
export type HudPos = { x: number; y: number; anchor: HudAnchor } | null;

const KEY_PREFIX = "hud-position:v2:";

function readStorage(scope: string): HudPos {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + scope);

    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { x?: unknown }).x === "number" &&
      typeof (parsed as { y?: unknown }).y === "number"
    ) {
      const a = (parsed as { anchor?: unknown }).anchor;
      const anchor: HudAnchor =
        a === HudAnchorType.Canvas ? HudAnchorType.Canvas : HudAnchorType.Shape;

      return {
        x: (parsed as { x: number }).x,
        y: (parsed as { y: number }).y,
        anchor,
      };
    }
  } catch {
    /* ignore */
  }

  return null;
}

function writeStorage(scope: string, pos: HudPos): void {
  if (typeof window === "undefined") return;
  try {
    if (pos === null) {
      window.localStorage.removeItem(KEY_PREFIX + scope);
    } else {
      window.localStorage.setItem(
        KEY_PREFIX + scope,
        JSON.stringify({ x: pos.x, y: pos.y, anchor: pos.anchor }),
      );
    }
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function useHudPosition(scope: string): {
  pos: HudPos;
  setPos: (next: HudPos) => void;
  reset: () => void;
} {
  const [pos, setPosState] = useState<HudPos>(() => readStorage(scope));

  useEffect(() => {
    setPosState(readStorage(scope));
  }, [scope]);

  const setPos = useCallback(
    (next: HudPos) => {
      setPosState(next);
      writeStorage(scope, next);
    },
    [scope],
  );

  const reset = useCallback(() => setPos(null), [setPos]);

  return { pos, setPos, reset };
}

export function deriveHudScope(pathname: string): string {
  // /projects/:projectId/... -> that project id, else "global"
  const m = /^\/projects\/([^/]+)/.exec(pathname);

  return m ? `project:${m[1]}` : "global";
}
