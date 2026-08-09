import { ImageChannelType } from "@/lib/canvas-prefs/facade";
// Plan 80 steps 23 + 24. Image pane gains a 64-bin luminance-style histogram
// derived from `canvasPrefsFacade.adjust` and RGB/R/G/B/A channel toggles
// persisted through `canvasPrefsFacade.setImage`.
import { useEffect, useMemo, useState } from "react";
import { PaneShell, Row, Slider } from "./paneShell";
import { canvasPrefsFacade, useCanvasPrefs, type ImageChannel } from "@/lib/canvas-prefs/facade";
import { computeHistogram, HISTOGRAM_BINS } from "@/lib/canvas-prefs/histogram";

const CHANNELS: ReadonlyArray<{ id: ImageChannel; label: string; stroke: string }> = [
  { id: ImageChannelType.Rgb, label: "RGB", stroke: "var(--ca-ink)" },
  { id: ImageChannelType.R, label: "R", stroke: "oklch(0.70 0.24 25)" },
  { id: ImageChannelType.G, label: "G", stroke: "oklch(0.78 0.20 145)" },
  { id: ImageChannelType.B, label: "B", stroke: "oklch(0.70 0.22 255)" },
  { id: ImageChannelType.A, label: "A", stroke: "var(--ca-ink-muted)" },
];

export function ImagePane() {
  const [rotate, setRotate] = useState(0);
  const [mirrorX, setMirrorX] = useState(false);
  const [mirrorY, setMirrorY] = useState(false);
  const [opacity, setOpacity] = useState(100);
  useEffect(() => {
    /* preview hook reserved for canvas wiring */
  }, [rotate, mirrorX, mirrorY, opacity]);

  const prefs = useCanvasPrefs();
  const channel = prefs.image.channel;
  const stroke = CHANNELS.find((c) => c.id === channel)?.stroke ?? "var(--ca-ink)";

  const { bins, peak, mean } = useMemo(
    () => computeHistogram(prefs.adjust, channel),
    [prefs.adjust, channel],
  );
  const points = useMemo(() => {
    const w = 100;
    const h = 32;

    return bins
      .map((v, i) => {
        const x = (i / (HISTOGRAM_BINS - 1)) * w;
        const y = h - v * h;

        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [bins]);

  const chBtn = (active: boolean) =>
    [
      "ca-focus-fluid rounded-sm border px-1.5 py-0.5 text-[11px] font-mono transition",
      active
        ? "border-ca-select bg-ca-panel-2 text-ca-select"
        : "border-ca-border bg-ca-panel-2/60 text-ca-ink-muted hover:text-ca-ink",
    ].join(" ");

  return (
    <PaneShell>
      <div className="rounded-sm border border-ca-border/70 bg-ca-panel-2/60 p-hmi-2">
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-ca-ink-muted">
          <span>Histogram</span>
          <span className="font-mono tabular-nums">
            peak {peak} · mean {mean.toFixed(1)}
          </span>
        </div>
        <svg
          role="img"
          aria-label={`Histogram, channel ${channel}, peak bin ${peak}`}
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          className="block h-10 w-full"
        >
          <polyline
            points={points}
            fill="none"
            stroke={stroke}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <Row label="Channel">
        <div role="radiogroup" aria-label="Histogram channel" className="flex gap-0.5">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={channel === c.id}
              onClick={() => void canvasPrefsFacade.setImage({ channel: c.id })}
              className={chBtn(channel === c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Rotate">
        <Slider
          label="Rotate image"
          value={rotate}
          min={-180}
          max={180}
          step={1}
          onChange={setRotate}
        />
        <output className="w-10 text-right font-mono tabular-nums text-[11px]">{rotate}°</output>
      </Row>
      <Row label="Opacity">
        <Slider label="Opacity" value={opacity} min={0} max={100} step={1} onChange={setOpacity} />
        <output className="w-8 text-right font-mono tabular-nums text-[11px]">{opacity}%</output>
      </Row>
      <Row label="Mirror">
        <div className="flex gap-0.5">
          <button
            type="button"
            aria-pressed={mirrorX}
            onClick={() => setMirrorX((v) => !v)}
            className={[
              "ca-focus-fluid rounded-sm border px-1.5 py-0.5 text-[11px] font-mono transition",
              mirrorX
                ? "border-ca-select bg-ca-panel-2 text-ca-select"
                : "border-ca-border bg-ca-panel-2/60 text-ca-ink-muted hover:text-ca-ink",
            ].join(" ")}
          >
            X
          </button>
          <button
            type="button"
            aria-pressed={mirrorY}
            onClick={() => setMirrorY((v) => !v)}
            className={[
              "ca-focus-fluid rounded-sm border px-1.5 py-0.5 text-[11px] font-mono transition",
              mirrorY
                ? "border-ca-select bg-ca-panel-2 text-ca-select"
                : "border-ca-border bg-ca-panel-2/60 text-ca-ink-muted hover:text-ca-ink",
            ].join(" ")}
          >
            Y
          </button>
        </div>
      </Row>
    </PaneShell>
  );
}
