import { ClientLogger } from "@/lib/observability/client-logger";
export enum LightingReadoutKeyType {
  Exposure = "exposure",
  Gain = "gain",
  Enhance = "enhance",
  Darken = "darken",
}

export namespace LightingReadoutKeyType {
  export function isExposure(keyValue: unknown): keyValue is LightingReadoutKeyType.Exposure {
    return keyValue === LightingReadoutKeyType.Exposure;
  }

  export function isGain(keyValue: unknown): keyValue is LightingReadoutKeyType.Gain {
    return keyValue === LightingReadoutKeyType.Gain;
  }

  export function isEnhance(keyValue: unknown): keyValue is LightingReadoutKeyType.Enhance {
    return keyValue === LightingReadoutKeyType.Enhance;
  }

  export function isDarken(keyValue: unknown): keyValue is LightingReadoutKeyType.Darken {
    return keyValue === LightingReadoutKeyType.Darken;
  }

  export function isVariant(keyValue: unknown): keyValue is LightingReadoutKeyType {
    return Object.values(LightingReadoutKeyType).includes(keyValue as LightingReadoutKeyType);
  }
}

// Plan 67 step 17 (SU-05): compact HUD readout of the current lighting
// controls. Subscribes to `useLightingStore` so every surface that mounts
// this component reflects live edits from `/settings/lighting` (or any
// future SDK bridge) without prop-drilling.
//
// Rendered under the setup landing tiles so operators can see whether the
// lighting profile has been tuned before they enter the editor. Uses
// design tokens only (ca-panel-2, ca-border, ca-ink, ca-ink-muted,
// ca-primary) and includes a "Reset" affordance that calls the store's
// reset action and logs `[lighting-readout] reset click` for
// observability.
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Link } from "@tanstack/react-router";
import { Lightbulb, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useLightingStore } from "@/lib/lighting/store";

const FIELDS: readonly {
  key: LightingReadoutKeyType;
  label: string;
}[] = [
  { key: LightingReadoutKeyType.Exposure, label: "Exposure" },
  { key: LightingReadoutKeyType.Gain, label: "Gain" },
  { key: LightingReadoutKeyType.Enhance, label: "Enhance" },
  { key: LightingReadoutKeyType.Darken, label: "Darken" },
];

// lint-allow: function-length reason="JSX template" max=100
export function LightingReadout(): React.JSX.Element | null {
  // Selecting a fresh object literal from zustand without a shallow
  // equality function returns a new reference on every store tick, which
  // re-renders this component in a loop and trips React's "Maximum update
  // depth exceeded" guard. `useShallow` compares field-by-field so the
  // selector only re-fires when a numeric control actually changes.
  const controls = useLightingStore(
    useShallow((s) => ({
      exposure: s.exposure,
      gain: s.gain,
      enhance: s.enhance,
      darken: s.darken,
    })),
  );
  const hydrate = useLightingStore((s) => s.hydrate);
  const reset = useLightingStore((s) => s.reset);

  // Persisted values live in `localStorage`, so we can only read them
  // after the client has mounted (avoid SSR hydration mismatch on the
  // numeric badges).
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const hasTunedValues = FIELDS.some(({ key }) => controls[key] !== 0);
  const isDefault = hasTunedValues === false;

  return (
    <section
      aria-label="Lighting readout"
      data-testid="lighting-readout"
      className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-2xl border border-ca-border/80 bg-gradient-to-b from-ca-panel/95 via-ca-panel/75 to-ca-bg/95 p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_-6px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.25)]"
        >
          <Lightbulb className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight text-ca-ink font-display">Lighting Profile</h3>
            <span className="rounded-full border border-ca-border/80 bg-ca-panel/90 px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-ca-ink-muted">
              {hasTunedValues ? "TUNED" : "DEFAULT"}
            </span>
          </div>
          <p className="text-xs text-ca-ink-muted mt-0.5 font-medium">
            {hasTunedValues ? "Active optic adjustments apply to every frame." : "Using hardware calibration baseline."}
          </p>
        </div>
      </div>
      <dl
        className="grid grid-cols-4 gap-2.5 text-center text-xs"
        data-testid="lighting-readout-values"
      >
        {FIELDS.map(({ key, label }) => {
          const isTuned = controls[key] !== 0;

          return (
            <div
              key={key}
              className={`rounded-xl border px-3 py-2 transition-all ${
                isTuned
                  ? "border-ca-primary/50 bg-ca-primary/10 shadow-[0_0_12px_rgba(30,190,230,0.15)]"
                  : "border-ca-border/70 bg-ca-panel/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
              }`}
              data-testid={`lighting-readout-${key}`}
            >
              <dt className="text-[10px] uppercase font-bold tracking-wider text-ca-ink-muted font-mono">{label}</dt>
              <dd className={`font-mono text-sm font-bold tabular-nums mt-0.5 ${isTuned ? "text-ca-primary drop-shadow-[0_0_6px_var(--ca-primary)]" : "text-ca-ink"}`}>
                {controls[key] > 0 ? `+${controls[key]}` : controls[key]}
              </dd>
              <div className="mt-1 flex items-center justify-center gap-0.5" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((seg) => {
                  const isSegmentActive = isTuned && Math.abs(controls[key]) > seg * 15;

                  return (
                    <span
                      key={seg}
                      className={`h-1 w-2 rounded-xs transition-colors ${
                        isSegmentActive
                          ? "bg-ca-primary shadow-[0_0_4px_var(--ca-primary)]"
                          : "bg-ca-border/60"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </dl>
      <div className="flex items-center gap-2.5">
        <Link
          to="/settings/lighting"
          className="hmi-focus-ring inline-flex items-center gap-1.5 rounded-xl border border-ca-border/80 bg-ca-surface/80 px-3.5 py-2 text-xs font-semibold text-ca-ink transition-all hover:border-ca-primary/60 hover:bg-ca-surface hover:text-white shadow-sm"
          data-testid="lighting-readout-tune"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-ca-primary" aria-hidden />
          Tune
        </Link>
        <button
          type="button"
          onClick={() => {
            ClientLogger.info("[lighting-readout] reset click");
            reset();
          }}
          disabled={isDefault}
          data-testid="lighting-readout-reset"
          className="hmi-focus-ring inline-flex items-center gap-1.5 rounded-xl border border-ca-border/80 bg-ca-surface/80 px-3.5 py-2 text-xs font-semibold text-ca-ink transition-all hover:border-ca-primary/60 hover:bg-ca-surface hover:text-white disabled:cursor-not-allowed disabled:opacity-40 shadow-sm"
        >
          <RotateCcw className="h-3.5 w-3.5 text-ca-ink-muted" aria-hidden />
          Reset
        </button>
      </div>
    </section>
  );
}
