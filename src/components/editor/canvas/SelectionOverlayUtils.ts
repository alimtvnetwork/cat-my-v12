// Encode an inline SVG mask as a data URL usable by CSS mask-image.
// White fill = layer visible (blur applied). Black fill = layer hidden
// (underlying pixels come through unfiltered).
export function svgMaskDataUrl(svg: string): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// Compact numeric spec used by the floating properties HUD. Only params
// that exist on the rule are rendered, so a rule without `threshold` just
// omits the row.
export interface HudParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}
