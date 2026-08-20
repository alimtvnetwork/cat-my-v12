import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 66 SH-05: persisted position for the floating RunningPill.
 *
 * Kept out of the running-ops store because ops themselves are ephemeral
 * (started, stopped, gone) while the pill's screen position outlives any
 * single op. Storage key: `ca.running-pill.pos.v1`.
 */
export interface PillPos {
  x: number;
  y: number;
}

const KEY = "ca.running-pill.pos.v1";
const MIN_MARGIN = 4;
// Approx card footprint: 240x40 for a single op; we clamp against a rough
// bounding box so the drag handle stays visible even in the tightest corner.
const CARD_W = 240;
const CARD_H = 40;

export function loadPillPos(): PillPos | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);

    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as PillPos).x === "number" &&
      typeof (parsed as PillPos).y === "number"
    ) {
      return parsed as PillPos;
    }

    return null;
  } catch (err) {
    ClientLogger.warn("[running-pill] failed to load persisted position", err);

    return null;
  }
}

export function savePillPos(pos: PillPos): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pos));
  } catch (err) {
    ClientLogger.warn("[running-pill] failed to persist position", err);
  }
}

export function clampPillPos(pos: PillPos, viewportW: number, viewportH: number): PillPos {
  const maxX = Math.max(MIN_MARGIN, viewportW - CARD_W - MIN_MARGIN);
  const maxY = Math.max(MIN_MARGIN, viewportH - CARD_H - MIN_MARGIN);
  const x = Math.min(Math.max(pos.x, MIN_MARGIN), maxX);
  const y = Math.min(Math.max(pos.y, MIN_MARGIN), maxY);

  return { x, y };
}
