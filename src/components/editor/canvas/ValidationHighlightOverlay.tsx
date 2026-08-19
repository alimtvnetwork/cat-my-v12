/**
 * Canvas highlight for the rule whose validation chip is currently
 * open in the Layers list.
 *
 * Root cause it addresses: pass / fail chips in the Layers list told
 * operators *which* rule failed but not *where* on the image the rule
 * lives. Locating the offending region meant clicking the row, waiting
 * for the selection ring, then re-orienting on the canvas. This
 * overlay draws a tone-colored ring + pulse around the rule the
 * moment its chip's popover opens, so the eye moves straight from the
 * chip to the pixels.
 *
 * Subscribes to `useValidationStore` for `focusedRuleId` +
 * `activeRulesetId` + result status; renders nothing when nothing is
 * focused, or when the focused rule is hidden / off-image.
 */
import { RuleKindType } from "@/types/rules/RuleKind";
import { useMemo } from "react";
import { imageToScreen } from "@/lib/editor/coords";
import type { EditorRule, Viewport } from "@/lib/editor/types";
import { useValidationStore, ValidationStatusType } from "@/lib/editor/validation-store";

interface Props {
  rules: readonly EditorRule[];
  viewport: Viewport;
  canvasSize: { width: number; height: number };
}

const TONE: Record<
  Exclude<ValidationStatusType, ValidationStatusType.Pending | ValidationStatusType.Pass>,
  { ring: string; glow: string; label: string }
> = {
  [ValidationStatusType.Fail]: {
    ring: "var(--ca-ng, #ef4444)",
    glow: "rgba(239, 68, 68, 0.35)",
    label: "FAIL",
  },
  [ValidationStatusType.Warn]: {
    ring: "var(--ca-warn, #f59e0b)",
    glow: "rgba(245, 158, 11, 0.35)",
    label: "WARN",
  },
};

export function ValidationHighlightOverlay({
  rules,
  viewport,
  canvasSize,
}: Props): React.JSX.Element | null {
  const focusedRuleId = useValidationStore((s) => s.focusedRuleId);
  const activeRulesetId = useValidationStore((s) => s.activeRulesetId);
  const status = useValidationStore((s) => {
    if (!focusedRuleId || !activeRulesetId) return undefined;

    return s.runs[activeRulesetId]?.results[focusedRuleId]?.status;
  });

  const target = useMemo(() => {
    if (!focusedRuleId) return null;
    const rule = rules.find((r) => r.id === focusedRuleId);

    if (!rule || rule.isHidden) return null;

    return rule;
  }, [focusedRuleId, rules]);

  if (
    !target ||
    !status ||
    (status !== ValidationStatusType.Fail && status !== ValidationStatusType.Warn)
  )
    return null;
  const tone = TONE[status];
  const tl = imageToScreen({ x: target.x, y: target.y }, viewport);
  const br = imageToScreen({ x: target.x + target.width, y: target.y + target.height }, viewport);
  const width = Math.max(0, br.x - tl.x);
  const height = Math.max(0, br.y - tl.y);

  if (width === 0 || height === 0) return null;
  const isCircle = RuleKindType.isCircle(target.kind);

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ width: canvasSize.width, height: canvasSize.height }}
      data-testid="validation-highlight-overlay"
      data-status={status}
      data-rule-id={target.id}
    >
      {/* Screen-reader announcement for the currently focused rule.
          Overlay itself is decorative pixels, but AT users still need
          to know which rule failed and where in the list to look. */}
      <div role="status" aria-live="polite" className="sr-only">
        {tone.label} rule {target.name}
      </div>
      {/* Steady ring: stays visible for the whole popover session. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute border-[3px] ${isCircle ? "rounded-full" : "rounded-sm"}`}
        style={{
          left: tl.x - 4,
          top: tl.y - 4,
          width: width + 8,
          height: height + 8,
          borderColor: tone.ring,
          boxShadow: `0 0 0 4px ${tone.glow}, 0 0 24px 6px ${tone.glow}`,
        }}
      />
      {/* One-shot expanding pulse; re-keyed on rule change so it
          re-animates every time the user opens a different chip.
          Suppressed under prefers-reduced-motion so vestibular-sensitive
          users get the static ring without the ripple. */}
      <div
        aria-hidden
        key={`${target.id}-${status}`}
        className={`pointer-events-none absolute border-2 ${isCircle ? "rounded-full" : "rounded-sm"} motion-safe:animate-[editor-ripple_650ms_ease-out_forwards]`}
        style={{
          left: tl.x - 4,
          top: tl.y - 4,
          width: width + 8,
          height: height + 8,
          borderColor: tone.ring,
        }}
      />
      {/* Small status tag anchored above the top-left corner. */}
      <div
        aria-hidden
        className="absolute rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider"
        style={{
          left: tl.x - 4,
          top: tl.y - 22,
          backgroundColor: tone.ring,
          color: "#0b0b0b",
        }}
      >
        {tone.label} {target.name}
      </div>
    </div>
  );
}
