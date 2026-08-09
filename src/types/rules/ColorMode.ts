// Plan 42 step 9. Color-condition sub-mode enum. Dense2/Dense3 select the
// two or three most dominant colors in the ROI; Picked is the eyedropper.

export enum ColorModeType {
  Current = "current",
  Dense2 = "dense-2",
  Dense3 = "dense-3",
  Picked = "picked",
}

export const COLOR_MODE_LABEL: Readonly<Record<ColorModeType, string>> = Object.freeze({
  [ColorModeType.Current]: "Current",
  [ColorModeType.Dense2]: "Dense 2",
  [ColorModeType.Dense3]: "Dense 3",
  [ColorModeType.Picked]: "Picked",
});

export const ALL_COLOR_MODES: readonly ColorModeType[] = Object.freeze([
  ColorModeType.Current,
  ColorModeType.Dense2,
  ColorModeType.Dense3,
  ColorModeType.Picked,
]);

export function isColorMode(value: unknown): value is ColorModeType {
  return typeof value === "string" && (ALL_COLOR_MODES as readonly string[]).includes(value);
}
