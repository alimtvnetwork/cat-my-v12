// Plan 80 steps 23 + 24. Deterministic 64-bin histogram synthesised from the
// current CanvasAdjustPrefs so the Image pane sparkline visibly reacts to the
// operator's brightness / contrast / gamma / channel choices without pulling
// in an actual raster source. The math is a discrete Gaussian centered by
// `brightness`, widened/narrowed by `contrast`, then gamma-warped, then
// weighted by the channel selection.
import type { CanvasAdjustPrefs, ImageChannel } from "./facade";

export const HISTOGRAM_BINS = 64;

export interface HistogramResult {
  bins: number[]; // normalised 0..1
  peak: number; // bin index of max value
  mean: number; // weighted mean bin index
}

function channelWeight(channel: ImageChannel, bin: number): number {
  const t = bin / (HISTOGRAM_BINS - 1);
  switch (channel) {
    case "r":

      return 0.6 + 0.4 * t;
    case "g":

      return 0.6 + 0.4 * (1 - Math.abs(0.5 - t) * 2);
    case "b":

      return 0.6 + 0.4 * (1 - t);
    case "a":

      return 1;
    case "rgb":
    default:

      return 1;
  }
}

export function computeHistogram(
  adjust: CanvasAdjustPrefs,
  channel: ImageChannel,
): HistogramResult {
  const centerBin = ((adjust.brightness + 100) / 200) * (HISTOGRAM_BINS - 1);
  const spread = Math.max(1.5, 10 - adjust.contrast / 12); // stddev in bins
  const gamma = adjust.gamma;
  const raw: number[] = new Array(HISTOGRAM_BINS);
  let max = 0;
  for (let i = 0; i < HISTOGRAM_BINS; i++) {
    const d = (i - centerBin) / spread;
    const gauss = Math.exp(-0.5 * d * d);
    const warped = Math.pow(gauss, 1 / gamma);
    const w = channelWeight(channel, i);
    const v = warped * w;
    raw[i] = v;

    if (v > max) max = v;
  }

  let peak = 0;
  let peakVal = -Infinity;
  let sum = 0;
  let weight = 0;
  const bins: number[] = new Array(HISTOGRAM_BINS);
  for (let i = 0; i < HISTOGRAM_BINS; i++) {
    const n = max > 0 ? raw[i] / max : 0;
    bins[i] = n;

    if (n > peakVal) {
      peakVal = n;
      peak = i;
    }

    sum += n * i;
    weight += n;
  }

  const mean = weight > 0 ? sum / weight : 0;

  return { bins, peak, mean };
}
