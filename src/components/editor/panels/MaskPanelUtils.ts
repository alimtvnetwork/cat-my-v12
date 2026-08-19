import type { EditorRule } from "@/lib/editor/types";

export interface MaskValues {
  url: string;
  threshold: number;
  invert: boolean;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationDeg: number;
}

export function clamp255(n: number): number {
  if (Number.isFinite(n) === false) return 128;

  if (n < 0) return 0;

  if (n > 255) return 255;

  return Math.round(n);
}

export function clampRange(n: number, lo: number, hi: number): number {
  if (Number.isFinite(n) === false) return lo;

  if (n < lo) return lo;

  if (n > hi) return hi;

  return n;
}

// eslint-disable-next-line react-refresh/only-export-components -- read helper is colocated with the panel that owns its schema.
export function readMask(rule: EditorRule): MaskValues {
  const p = rule.params ?? {};
  const url = typeof p.maskImageUrl === "string" ? p.maskImageUrl : "";
  const rawT = typeof p.maskThreshold === "number" ? p.maskThreshold : 128;
  const threshold = clamp255(rawT);
  const invert = p.maskInvert === true;
  const offsetX = typeof p.maskOffsetX === "number" ? clampRange(p.maskOffsetX, -1, 1) : 0;
  const offsetY = typeof p.maskOffsetY === "number" ? clampRange(p.maskOffsetY, -1, 1) : 0;
  const scale = typeof p.maskScale === "number" ? clampRange(p.maskScale, 0.1, 4) : 1;
  const rotationDeg =
    typeof p.maskRotationDeg === "number" ? clampRange(p.maskRotationDeg, -180, 180) : 0;

  return { url, threshold, invert, offsetX, offsetY, scale, rotationDeg };
}
