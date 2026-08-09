// Per-rule Dim/Blur override panel. Lets the operator tune the spotlight
// (dim %, blur px, isolate) for a specific rule instead of using the
// global values from the canvas HUD popover. When "Use per-rule
// settings" is enabled, the renderer picks up the overrides stored on
// `rule.params` (focusDim, focusBlur, focusIsolate) whenever this rule
// is currently in focus; otherwise the global config is used.
//
// Stored on rule.params:
//   - focusOverrideEnabled: boolean
//   - focusDim:             0..1
//   - focusBlur:            0..16 px
//   - focusIsolate:         boolean
import { useId } from "react";
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";

export interface FocusPanelProps {
  rule: EditorRule;
  onUpdateParams: (id: string, params: EditorRuleParams) => void;
}

export interface FocusOverrideValues {
  enabled: boolean;
  dim: number;
  blur: number;
  isolate: boolean;
}

const DEFAULTS: FocusOverrideValues = {
  enabled: false,
  dim: 0.55,
  blur: 6,
  isolate: false,
};

// eslint-disable-next-line react-refresh/only-export-components -- read helper is colocated with the panel that owns its schema.
export function readFocusOverride(rule: EditorRule): FocusOverrideValues {
  const p = rule.params ?? {};
  const enabled = p.focusOverrideEnabled === true;
  const dim = typeof p.focusDim === "number" ? clamp(p.focusDim, 0, 1) : DEFAULTS.dim;
  const blur = typeof p.focusBlur === "number" ? clamp(p.focusBlur, 0, 16) : DEFAULTS.blur;
  const isolate = p.focusIsolate === true;

  return { enabled, dim, blur, isolate };
}

export function FocusPanel({ rule, onUpdateParams }: FocusPanelProps) {
  const value = readFocusOverride(rule);
  const disabled = rule.isLocked;
  const enId = useId();
  const dimId = useId();
  const blurId = useId();
  const isoId = useId();

  const patch = (partial: Partial<FocusOverrideValues>) => {
    const next: FocusOverrideValues = { ...value, ...partial };
    onUpdateParams(rule.id, {
      ...(rule.params ?? {}),
      focusOverrideEnabled: next.enabled,
      focusDim: next.dim,
      focusBlur: next.blur,
      focusIsolate: next.isolate,
    });
  };

  const controlsDisabled = disabled || !value.enabled;

  return (
    <section
      className="editor-focus-panel flex flex-col gap-hmi-2 p-hmi-3 border-t border-ca-border"
      role="region"
      aria-label="Per-rule focus"
    >
      <header className="flex items-center justify-between">
        <span className="text-hmi-header text-ca-ink">Dim / Blur</span>
        <span className="text-hmi-caption text-ca-ink-muted">
          {value.enabled ? "Per-rule" : "Global"}
        </span>
      </header>
      <label htmlFor={enId} className="editor-focus-panel-row flex items-center gap-hmi-2">
        <input
          id={enId}
          type="checkbox"
          checked={value.enabled}
          disabled={disabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        <span>Use per-rule settings</span>
      </label>
      <label htmlFor={dimId} className="editor-focus-panel-row flex items-center gap-hmi-2">
        <span className="w-20 text-hmi-caption">Dim outside</span>
        <input
          id={dimId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(value.dim * 100)}
          disabled={controlsDisabled || value.isolate}
          onChange={(e) => patch({ dim: clamp(Number(e.target.value), 0, 100) / 100 })}
          aria-label="Per-rule dim outside"
        />
        <span className="w-10 text-right text-hmi-caption tabular-nums">
          {Math.round(value.dim * 100)}%
        </span>
      </label>
      <label htmlFor={blurId} className="editor-focus-panel-row flex items-center gap-hmi-2">
        <span className="w-20 text-hmi-caption">Blur outside</span>
        <input
          id={blurId}
          type="range"
          min={0}
          max={16}
          step={1}
          value={value.blur}
          disabled={controlsDisabled || value.isolate}
          onChange={(e) => patch({ blur: clamp(Number(e.target.value), 0, 16) })}
          aria-label="Per-rule blur outside"
        />
        <span className="w-10 text-right text-hmi-caption tabular-nums">{value.blur}px</span>
      </label>
      <label htmlFor={isoId} className="editor-focus-panel-row flex items-center gap-hmi-2">
        <input
          id={isoId}
          type="checkbox"
          checked={value.isolate}
          disabled={controlsDisabled}
          onChange={(e) => patch({ isolate: e.target.checked })}
        />
        <span>Isolate (hide everything outside)</span>
      </label>
    </section>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isFinite(n) === false) return lo;

  return Math.max(lo, Math.min(hi, n));
}
