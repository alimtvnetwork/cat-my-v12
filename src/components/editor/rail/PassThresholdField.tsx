// Shared pass-threshold slider with a calibration-driven "Suggest" action.
// Rendered inside every per-kind rule editor (Rect/Circle/Ocr/Text/Math) so
// operators can align a rule's cutoff with the values recommended in
// docs/validation-scorer-calibration.md. The suggestion is sourced from
// src/lib/editor/calibration.ts and rounded to 0.01.
import { Sparkles, Info } from "lucide-react";
import { useRef, useState, useLayoutEffect } from "react";
import type { EditorRuleKind } from "@/lib/editor/types";
import { getCalibrationSuggestion } from "@/lib/editor/calibration";
import { CalibrationStats } from "@/components/editor/rail/CalibrationStats";
import { CalibrationDistributionPlot } from "@/components/editor/rail/CalibrationDistributionPlot";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export interface PassThresholdFieldProps {
  kind: EditorRuleKind;
  value: number;
  onChange: (next: number) => void;
  /** Optional override label; defaults to "Pass threshold". */
  label?: string;
}

const MIN = 0;
const MAX = 1;
const STEP = 0.01;

export function PassThresholdField({
  kind,
  value,
  onChange,
  label = "Pass threshold",
}: PassThresholdFieldProps) {
  const suggestion = getCalibrationSuggestion(kind);
  const clamped = Number.isFinite(value) ? Math.min(MAX, Math.max(MIN, value)) : 0;
  const isSuggested = suggestion !== null && Math.abs(clamped - suggestion.threshold) < STEP / 2;

  const trackRef = useRef<HTMLInputElement | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");

  useLayoutEffect(() => {
    if (!trackRef.current) return;
    const el = trackRef.current;
    const update = () => setTrackWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const ratio = (clamped - MIN) / (MAX - MIN);
  // account for native range thumb width (~14px) so bubble tracks knob visually
  const THUMB = 14;
  const bubbleX = ratio * Math.max(0, trackWidth - THUMB) + THUMB / 2;

  const commitDraft = () => {
    const n = Number(draft);

    if (Number.isFinite(n)) onChange(Math.min(MAX, Math.max(MIN, n)));
    setEditing(false);
  };

  return (
    <div
      className="flex flex-col gap-hmi-1"
      aria-label={`${label} (calibrated suggestion available)`}
    >
      <label className="flex flex-col gap-hmi-1">
        <span className="flex justify-between text-hmi-body text-ca-ink">
          <span className="inline-flex items-center gap-hmi-1">
            {label}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex text-ca-ink-muted hover:text-ca-primary focus:outline-none focus-visible:text-ca-primary"
                    aria-label={`Show score distribution for kind ${kind}`}
                    data-testid={`calibration-plot-trigger-${kind}`}
                  >
                    <Info size={12} aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-ca-panel text-ca-ink border border-ca-border p-hmi-2 max-w-[260px]"
                >
                  <CalibrationDistributionPlot kind={kind} threshold={suggestion?.threshold} />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        </span>
        <div className="relative pt-5">
          {/* Value bubble riding the slider knob */}
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 select-none"
            style={{ left: `${bubbleX}px` }}
          >
            {editing ? (
              <input
                autoFocus
                type="number"
                min={MIN}
                max={MAX}
                step={STEP}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (KeyboardKeyType.isEnter(e.key)) commitDraft();

                  if (KeyboardKeyType.isEscape(e.key)) setEditing(false);
                }}
                className="pointer-events-auto w-14 rounded border border-ca-primary bg-ca-panel px-1 py-0.5 text-center font-hmi-mono text-[11px] text-ca-ink outline-none"
                aria-label={`${label} value`}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(clamped.toFixed(2));
                  setEditing(true);
                }}
                className="pointer-events-auto rounded-full border border-ca-primary bg-ca-primary px-1.5 py-0.5 font-hmi-mono text-[10px] leading-none text-white shadow-sm hover:brightness-110"
                aria-label={`Edit ${label} (${clamped.toFixed(2)})`}
                title="Click to type a value"
              >
                {clamped.toFixed(2)}
              </button>
            )}
            <div className="mx-auto h-1 w-px bg-ca-primary/60" aria-hidden />
          </div>
          <input
            ref={trackRef}
            type="range"
            min={MIN}
            max={MAX}
            step={STEP}
            value={clamped}
            onChange={(e) => onChange(Number(e.target.value))}
            className="block w-full accent-ca-primary"
            aria-label={label}
          />
        </div>
      </label>
      {suggestion ? (
        <div className="flex items-center justify-between gap-hmi-2 text-hmi-caption">
          <span className="text-ca-ink-muted" title={suggestion.rationale}>
            Calibrated: {suggestion.threshold.toFixed(2)} (F1 {suggestion.f1.toFixed(2)}, n=
            {suggestion.samples})
          </span>
          <button
            type="button"
            onClick={() => onChange(suggestion.threshold)}
            disabled={isSuggested}
            title={suggestion.rationale}
            className={`inline-flex items-center gap-hmi-1 border px-hmi-2 py-0.5 font-hmi text-hmi-caption uppercase tracking-wide transition-colors ${
              isSuggested
                ? "border-ca-border text-ca-ink-muted opacity-60"
                : "border-ca-primary text-ca-primary hover:bg-ca-primary/10"
            }`}
            aria-label={`Use suggested threshold ${suggestion.threshold.toFixed(2)} for kind ${kind}`}
          >
            <Sparkles size={12} aria-hidden />
            {isSuggested ? "Applied" : "Suggest"}
          </button>
        </div>
      ) : null}
      <CalibrationStats kind={kind} />
    </div>
  );
}
