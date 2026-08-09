// Plan 42 step 25. sRGB <-> CIE Lab (D65). Pure, deterministic, allocation-
// light: callers pass 0..255 integers and get {L,a,b} back so ΔE 2000 (see
// delta-e.ts) can compare them. Kept intentionally small; the k-means and
// ROI extractors both share these two functions.
//
// References:
//  - IEC 61966-2-1 (sRGB gamma)
//  - CIE 15:2004 (Lab, D65 white point)

export interface Lab {
  L: number;
  a: number;
  b: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const REF_X = 0.95047;
const REF_Y = 1.0;
const REF_Z = 1.08883;

function srgbToLinear(c: number): number {
  const n = c / 255;

  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function fxyz(t: number): number {
  const d = 6 / 29;

  return t > d * d * d ? Math.cbrt(t) : t / (3 * d * d) + 4 / 29;
}

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  // sRGB D65 matrix.
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;
  const fx = fxyz(X / REF_X);
  const fy = fxyz(Y / REF_Y);
  const fz = fxyz(Z / REF_Z);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());

  if (!m) return null;
  const v = parseInt(m[1]!, 16);

  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");

  return `#${c(r)}${c(g)}${c(b)}`;
}
