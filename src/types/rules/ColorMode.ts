// Plan 42 step 9. Color-condition sub-mode enum. Dense2/Dense3 select the
// two or three most dominant colors in the ROI; Picked is the eyedropper.

export const ColorMode = {
  Current: "current",
  Dense2: "dense-2",
  Dense3: "dense-3",
  Picked: "picked",
} as const;

export type ColorMode = (typeof ColorMode)[keyof typeof ColorMode];

export const COLOR_MODE_LABEL: Readonly<Record<ColorMode, string>> = Object.freeze({
  [ColorMode.Current]: "Current",
  [ColorMode.Dense2]: "Dense 2",
  [ColorMode.Dense3]: "Dense 3",
  [ColorMode.Picked]: "Picked",
});

export const ALL_COLOR_MODES: readonly ColorMode[] = Object.freeze([
  ColorMode.Current,
  ColorMode.Dense2,
  ColorMode.Dense3,
  ColorMode.Picked,
]);

export function isColorMode(value: unknown): value is ColorMode {
  return typeof value === "string" && (ALL_COLOR_MODES as readonly string[]).includes(value);
}
