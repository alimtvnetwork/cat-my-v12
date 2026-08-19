import { useRef } from "react";
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";
import { HudAnchorType, type HudPos } from "@/lib/editor/hud-position";
import { editorKindLabel } from "@/lib/editor/tools";
import { applyPresetParams, getPresetsForKind } from "@/lib/editor/rule-presets";
import { ROTATION_SNAP_PRESETS, rotationSnapLabel } from "@/lib/editor/rotation";
import { HUD_PARAMS } from "./SelectionOverlayConstants";

export interface SelectionOverlayQuickPropsProps {
  rule: EditorRule | null;
  tl: { x: number; y: number } | null;
  br: { x: number; y: number } | null;
  canvasSize: { width: number; height: number };
  hudPos: HudPos;
  setHudPos: (pos: HudPos) => void;
  resetHudPos: () => void;
  hudFollowsShape: boolean;
  toggleHudFollowsShape: () => void;
  hudAnchorDebug: boolean;
  rotationSnapDefault: number;
  setRotationSnapDefault: (val: number) => void;
  updateParams: (id: string, params: EditorRuleParams | undefined) => void;
}

export function SelectionOverlayQuickProps({
  rule,
  tl,
  br,
  canvasSize,
  hudPos,
  setHudPos,
  resetHudPos,
  hudFollowsShape,
  toggleHudFollowsShape,
  hudAnchorDebug,
  rotationSnapDefault,
  setRotationSnapDefault,
  updateParams,
}: SelectionOverlayQuickPropsProps) {
  const hudDragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  if (!rule || !tl || !br) return null;

            const params = (rule.params ?? {}) as Record<string, string | number | boolean>;
            const rows = HUD_PARAMS.filter((p) => typeof params[p.key] === "number");

            if (rows.length === 0) return null;
            // Anchor to the right of the shape; clamp inside the canvas.
            const baseHudW = 340;
            const hasPresets = getPresetsForKind(rule.kind).length > 0;
            // Precision-matte HUD: header 44 + presets/snap section ~76 + rows ~30 each + footer 24
            const baseHudH = 44 + 76 + rows.length * 30 + 24 + (hasPresets ? 8 : 0);
            
            // Constrain dimensions to the viewport so the HUD never overflows and drag clamping works
            const hudW = Math.min(baseHudW, Math.max(200, canvasSize.width - 16));
            const hudH = Math.min(baseHudH, Math.max(200, canvasSize.height - 16));
            
            let left: number;
            let top: number;

            if (hudPos) {
              // Plan 83 backlog item 9 (issue #33): "shape"-anchored positions
              // store an offset relative to the selection's top-left, so the
              // HUD stays glued to the shape as it moves. "canvas"-anchored
              // positions stay pinned to absolute canvas coordinates.
              const rawLeft = hudPos.anchor === "shape" ? tl.x + hudPos.x : hudPos.x;
              const rawTop = hudPos.anchor === "shape" ? tl.y + hudPos.y : hudPos.y;
              left = Math.max(0, Math.min(rawLeft, canvasSize.width - hudW));
              top = Math.max(0, Math.min(rawTop, canvasSize.height - hudH));
            } else {
              // Default anchor: place the HUD OUTSIDE the shape bounding box
              // so the selected image region is never occluded. Try right,
              // then below, then above, then left. Only fall back to an
              // overlapping position when the canvas is smaller than any
              // side gutter. Gap keeps the HUD off the resize handles.
              const gap = 16;
              const canFitRight = br.x + gap + hudW <= canvasSize.width - 8;
              const canFitBelow = br.y + gap + hudH <= canvasSize.height - 8;
              const canFitAbove = tl.y - gap - hudH >= 8;
              const canFitLeft = tl.x - gap - hudW >= 8;

              if (canFitRight) {
                left = br.x + gap;
                top = Math.max(8, Math.min(tl.y, canvasSize.height - hudH - 8));
              } else if (canFitBelow) {
                left = Math.max(8, Math.min(tl.x, canvasSize.width - hudW - 8));
                top = br.y + gap;
              } else if (canFitAbove) {
                left = Math.max(8, Math.min(tl.x, canvasSize.width - hudW - 8));
                top = tl.y - gap - hudH;
              } else if (canFitLeft) {
                left = tl.x - gap - hudW;
                top = Math.max(8, Math.min(tl.y, canvasSize.height - hudH - 8));
              } else {
                // Canvas too small for any side; park at the bottom-right
                // corner rather than covering the shape center.
                left = Math.max(8, canvasSize.width - hudW - 8);
                top = Math.max(8, canvasSize.height - hudH - 8);
              }
            }

            return (
              <div
                className="motion-panel-in pointer-events-auto absolute z-40 flex flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-ca-border bg-ca-panel-2/95 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
                style={{ left, top, width: hudW, maxHeight: hudH }}
                role="group"
                aria-label={`Quick properties for ${rule.name}`}
                data-testid="rule-quick-props"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Precision indicator: violet accent bar tying HUD to the selected ROI */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-4 h-8 w-[2px] rounded-r bg-[var(--ca-select,#8b5cf6)] shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                />
                <div
                  className="flex cursor-grab select-none items-center justify-between px-4 pb-3 pt-3 active:cursor-grabbing"
                  role="button"
                  tabIndex={0}
                  aria-label={`Drag to reposition properties HUD for ${rule.name}. Double-click to reset.`}
                  data-testid="rule-quick-props-drag"
                  title="Drag to reposition. Double-click to reset."
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                    hudDragRef.current = {
                      pointerId: e.pointerId,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      startLeft: left,
                      startTop: top,
                    };
                  }}
                  onPointerMove={(e) => {
                    const drag = hudDragRef.current;

                    if (!drag || drag.pointerId !== e.pointerId) return;
                    const dx = e.clientX - drag.startClientX;
                    const dy = e.clientY - drag.startClientY;
                    const nx = Math.max(0, Math.min(drag.startLeft + dx, canvasSize.width - hudW));
                    const ny = Math.max(0, Math.min(drag.startTop + dy, canvasSize.height - hudH));

                    if (hudFollowsShape && tl) {
                      setHudPos({ x: nx - tl.x, y: ny - tl.y, anchor: HudAnchorType.Shape });
                    } else {
                      setHudPos({ x: nx, y: ny, anchor: HudAnchorType.Canvas });
                    }
                  }}
                  onPointerUp={(e) => {
                    const drag = hudDragRef.current;

                    if (drag && drag.pointerId === e.pointerId) {
                      hudDragRef.current = null;
                      try {
                        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
                      } catch {
                        /* ignore */
                      }
                    }
                  }}
                  onDoubleClick={() => resetHudPos()}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-ubuntu text-[15px] font-bold tracking-tight text-ca-ink">
                      Properties
                    </span>
                    {hudAnchorDebug ? (
                      <span
                        data-testid="rule-hud-anchor-debug"
                        data-anchor={hudPos?.anchor ?? "default"}
                        aria-label={`HUD anchor: ${hudPos?.anchor ?? "default"}`}
                        title={`HUD anchor: ${hudPos?.anchor ?? "default"} (follow pref: ${
                          hudFollowsShape ? "on" : "off"
                        })`}
                        className={`rounded-sm border px-1 py-[1px] font-mono text-[10px] leading-none ${
                          (hudPos?.anchor ?? "default") === "shape"
                            ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                            : (hudPos?.anchor ?? "default") === "canvas"
                              ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                              : "border-ca-border bg-ca-panel text-ca-ink-muted"
                        }`}
                      >
                        {hudPos?.anchor ?? "default"}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="rule-hud-follow-toggle"
                      aria-pressed={hudFollowsShape}
                      aria-label={
                        hudFollowsShape
                          ? "HUD follows shape. Click to pin to canvas."
                          : "HUD pinned to canvas. Click to follow shape."
                      }
                      title={
                        hudFollowsShape
                          ? "Follow shape: on. Click to pin to canvas."
                          : "Follow shape: off. Click to lock to shape."
                      }
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHudFollowsShape();
                      }}
                      className={`flex items-center gap-1.5 rounded-full border px-2 py-[2px] text-[10px] font-semibold uppercase tracking-widest transition-colors hover:brightness-110 ${
                        hudFollowsShape
                          ? "border-[var(--ca-select,#8b5cf6)]/40 bg-[var(--ca-select,#8b5cf6)]/10 text-[var(--ca-select,#8b5cf6)]"
                          : "border-ca-border bg-ca-panel text-ca-ink-muted"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          hudFollowsShape
                            ? "animate-pulse bg-[var(--ca-select,#8b5cf6)]"
                            : "bg-ca-ink-muted"
                        }`}
                      />
                      {hudFollowsShape ? "follow" : "pin"}
                    </button>
                    <span className="font-mono text-[11px] font-medium text-ca-ink-muted">
                      {editorKindLabel(rule.kind)}
                    </span>
                  </div>
                </div>
                {/* Preset + Snap grouped section with subtle inset surface */}
                <div className="flex flex-col gap-2.5 border-y border-ca-border/60 bg-ca-panel/40 px-4 py-3">
                  {(() => {
                    const presets = getPresetsForKind(rule.kind);

                    if (presets.length === 0) return null;

                    return (
                      <div
                        className="flex items-center gap-3 text-[11px]"
                        role="group"
                        aria-label="Parameter presets"
                        data-testid="rule-quick-props-presets"
                      >
                        <span className="w-12 shrink-0 text-[10px] font-medium uppercase tracking-tighter text-ca-ink-muted">
                          Preset
                        </span>
                        <div className="flex flex-1 gap-0.5 rounded-lg border border-ca-border/60 bg-ca-panel/60 p-0.5">
                          {presets.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              className="flex-1 rounded-md px-2 py-1 text-[11px] font-semibold text-ca-ink-muted transition-colors hover:text-ca-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ca-select"
                              title={preset.description}
                              aria-label={`Apply ${preset.label} preset: ${preset.description}`}
                              data-testid={`rule-quick-props-preset-${preset.id}`}
                              onClick={() =>
                                updateParams(rule.id, applyPresetParams(params, preset))
                              }
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {(() => {
                    // Rotation snap control. Per-rule override lives on
                    // `params.rotationSnap`; when absent the HUD shows the
                    // global default (indicated with a "(default)" hint) and
                    // writing the same value as the default clears the
                    // override so the rule keeps following the workspace
                    // preference.
                    const rawSnap = params.rotationSnap;
                    const perRuleSnap =
                      typeof rawSnap === "number" && Number.isFinite(rawSnap) && rawSnap >= 0
                        ? rawSnap
                        : undefined;
                    const effective = perRuleSnap ?? rotationSnapDefault;
                    const isOverride =
                      perRuleSnap !== undefined && perRuleSnap !== rotationSnapDefault;
                    const options = ROTATION_SNAP_PRESETS.includes(effective)
                      ? ROTATION_SNAP_PRESETS
                      : [effective, ...ROTATION_SNAP_PRESETS];

                    return (
                      <label
                        className="flex items-center gap-2 text-[12px] text-ca-ink"
                        data-testid="rule-rotation-snap"
                      >
                        <span
                          className="w-16 shrink-0 text-ca-ink-muted"
                          title="Rotation snap step. Alt during rotate forces continuous."
                        >
                          Snap
                        </span>
                        <select
                          className="h-6 flex-1 rounded-sm border border-ca-border bg-ca-panel px-1 font-mono text-[11px] text-ca-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ca-select"
                          value={String(effective)}
                          onChange={(e) => {
                            const next = Number(e.target.value);

                            if (Number.isFinite(next) === false || next < 0) return;
                            // Match-the-default clears the per-rule override
                            // by omitting the key rather than storing a
                            // duplicate value; other params pass through.
                            const nextParams: Record<string, string | number | boolean> = {
                              ...(params as Record<string, string | number | boolean>),
                            };

                            if (next === rotationSnapDefault) {
                              delete nextParams.rotationSnap;
                            } else {
                              nextParams.rotationSnap = next;
                            }

                            updateParams(rule.id, nextParams);
                          }}
                          aria-label={`Rotation snap for ${rule.name}`}
                          data-testid="rule-rotation-snap-select"
                        >
                          {options.map((step) => (
                            <option key={step} value={String(step)}>
                              {rotationSnapLabel(step)}
                              {step === rotationSnapDefault ? "  (default)" : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="h-6 rounded-sm border border-ca-border bg-ca-panel px-1.5 text-[11px] text-ca-ink-muted hover:border-ca-select hover:text-ca-ink disabled:opacity-40"
                          disabled={!isOverride}
                          title={
                            isOverride
                              ? "Clear per-rule override; use workspace default"
                              : "This rule already uses the workspace default"
                          }
                          aria-label="Clear rotation snap override"
                          data-testid="rule-rotation-snap-clear"
                          onClick={() => {
                            const nextParams: Record<string, string | number | boolean> = {
                              ...(params as Record<string, string | number | boolean>),
                            };
                            delete nextParams.rotationSnap;
                            updateParams(rule.id, nextParams);
                          }}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className="h-6 rounded-sm border border-ca-border bg-ca-panel px-1.5 text-[11px] text-ca-ink-muted hover:border-ca-select hover:text-ca-ink"
                          title="Save this snap step as the workspace default"
                          aria-label="Set as workspace rotation snap default"
                          data-testid="rule-rotation-snap-set-default"
                          onClick={() => {
                            setRotationSnapDefault(effective);
                            // Clearing the per-rule override after promoting
                            // it keeps behaviour identical while removing the
                            // now-redundant override marker.
                            if (perRuleSnap !== undefined) {
                              const nextParams: Record<string, string | number | boolean> = {
                                ...(params as Record<string, string | number | boolean>),
                              };
                              delete nextParams.rotationSnap;
                              updateParams(rule.id, nextParams);
                            }
                          }}
                        >
                          Default
                        </button>
                      </label>
                    );
                  })()}
                </div>
                {/* Slider grid: label | slider | value chip | unit */}
                <div className="flex flex-col gap-3.5 px-4 py-4">
                  {rows.map((spec) => {
                    const raw = params[spec.key];
                    const val = typeof raw === "number" ? raw : 0;

                    return (
                      <label
                        key={spec.key}
                        className="grid grid-cols-[72px_1fr_44px_20px] items-center gap-3 text-[12px] text-ca-ink"
                      >
                        <span className="text-[11px] font-medium text-ca-ink-muted">
                          {spec.label}
                        </span>
                        <input
                          type="range"
                          min={spec.min}
                          max={spec.max}
                          step={spec.step}
                          value={val}
                          onChange={(e) =>
                            updateParams(rule.id, { ...params, [spec.key]: Number(e.target.value) })
                          }
                          className="h-1 w-full accent-[var(--ca-select,#8b5cf6)]"
                          aria-label={`${spec.label} for ${rule.name}`}
                        />
                        <input
                          type="number"
                          min={spec.min}
                          max={spec.max}
                          step={spec.step}
                          value={val}
                          onChange={(e) =>
                            updateParams(rule.id, { ...params, [spec.key]: Number(e.target.value) })
                          }
                          className="h-6 w-full rounded border border-ca-border bg-ca-panel/60 px-1.5 text-right font-mono text-[11px] tabular-nums text-ca-ink focus-visible:border-ca-select focus-visible:outline-none"
                          aria-label={`${spec.label} value`}
                        />
                        <span className="text-[10px] font-medium text-ca-ink-muted">
                          {spec.suffix ?? ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {/* Footer status strip */}
                <div className="flex items-center justify-between border-t border-ca-border/60 bg-ca-panel/30 px-4 py-1.5">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-ca-ink-muted">
                    {rule.name}
                  </span>
                  <span className="flex gap-1">
                    <span className="h-1 w-1 rounded-full bg-ca-border" />
                    <span className="h-1 w-1 rounded-full bg-ca-border" />
                    <span className="h-1 w-1 rounded-full bg-[var(--ca-select,#8b5cf6)]" />
                  </span>
                </div>
              </div>
            );
}

