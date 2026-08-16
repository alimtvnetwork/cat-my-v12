import { ClientLogger } from "@/lib/observability/client-logger";
export enum LightingReadoutKeyType {
  Exposure = "exposure",
  Gain = "gain",
  Enhance = "enhance",
  Darken = "darken",
}

export namespace LightingReadoutKeyType {
  export function isExposure(val: unknown): val is LightingReadoutKeyType.Exposure {
    return val === LightingReadoutKeyType.Exposure;
  }
  export function isGain(val: unknown): val is LightingReadoutKeyType.Gain {
    return val === LightingReadoutKeyType.Gain;
  }
  export function isEnhance(val: unknown): val is LightingReadoutKeyType.Enhance {
    return val === LightingReadoutKeyType.Enhance;
  }
  export function isDarken(val: unknown): val is LightingReadoutKeyType.Darken {
    return val === LightingReadoutKeyType.Darken;
  }
  export function isVariant(val: unknown): val is LightingReadoutKeyType {
    return Object.values(LightingReadoutKeyType).includes(val as LightingReadoutKeyType);
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
export function LightingReadout() {
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
  const isDefault = !hasTunedValues;

  return (
    <section
      aria-label="Lighting readout"
      data-testid="lighting-readout"
      className="mx-auto flex w-full max-w-6xl flex-col gap-3 rounded-xl border border-ca-border bg-ca-panel-2/60 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-ca-primary/10 text-ca-primary"
        >
          <Lightbulb className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-ca-ink">Lighting profile</h3>
          <p className="text-xs text-ca-ink-muted">
            {hasTunedValues ? "Tuned values apply to every capture." : "Using built-in defaults."}
          </p>
        </div>
      </div>
      <dl
        className="grid grid-cols-4 gap-2 text-center text-xs"
        data-testid="lighting-readout-values"
      >
        {FIELDS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-md border border-ca-border bg-ca-panel px-2 py-1"
            data-testid={`lighting-readout-${key}`}
          >
            <dt className="text-[10px] uppercase tracking-wide text-ca-ink-muted">{label}</dt>
            <dd className="font-hmi-mono text-ca-ink">
              {controls[key] > 0 ? `+${controls[key]}` : controls[key]}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center gap-2">
        <Link
          to="/settings/lighting"
          className="hmi-focus-ring inline-flex items-center gap-1 rounded-md border border-ca-border bg-ca-panel px-3 py-1.5 text-xs text-ca-ink transition-colors hover:border-ca-primary/60 hover:bg-ca-panel-2"
          data-testid="lighting-readout-tune"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
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
          className="hmi-focus-ring inline-flex items-center gap-1 rounded-md border border-ca-border bg-ca-panel px-3 py-1.5 text-xs text-ca-ink transition-colors hover:border-ca-primary/60 hover:bg-ca-panel-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset
        </button>
      </div>
    </section>
  );
}
