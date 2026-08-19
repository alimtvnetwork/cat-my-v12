import { RunOrderQuickBarEdgeType } from "./types";
import { BadgeNumberField } from "./BadgeNumberField";
import { MenuSection, MenuItem } from "./ContextMenuItems";
import { RunOrderQuickBar } from "./RunOrderQuickBar";
import { EditorRuleKindType } from "@/lib/editor/types";
import { HudAnchorType } from "@/lib/editor/hud-position";
import { RuleKindType } from "@/types/rules/RuleKind";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Unlock,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Palette,
  RotateCw,
  RotateCcw,
  Pencil,
  Group as GroupIcon,
} from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { IMAGE_BOUNDS, clampRectToBounds, imageToScreen } from "@/lib/editor/coords";
import { KIND_COLOR, KIND_ICON } from "@/lib/editor/kind-icons";
import { editorKindLabel } from "@/lib/editor/tools";
import { snapRect } from "@/lib/editor/snap";
import { useSnap } from "@/lib/editor/snap-store";
import { computeAlignment, mergeGuides, type AlignGuide } from "@/lib/editor/align";
import type { AlignResult } from "@/lib/editor/align";
import {
  computeRotation,
  isAtAngleBound,
  normalizeAngle,
  resolveSnapStep,
  rotationSnapLabel,
  ROTATION_SNAP_PRESETS,
} from "@/lib/editor/rotation";
import { SelectionOverlayAngleZone } from "./SelectionOverlayAngleZone";
import { useSelectedRuleShape } from "@/lib/editor/selection/useSelectedRuleShape";
import { deriveHudScope, useHudPosition } from "@/lib/editor/hud-position";
import type { HudAnchor } from "@/lib/editor/hud-position";
import { applyPresetParams, getPresetsForKind } from "@/lib/editor/rule-presets";
import { AlignmentGuides } from "./AlignmentGuides";
import { SnapDebugHud } from "./SnapDebugHud";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";
import { logger } from "@/lib/editor/errors";
import type { EditorRule, EditorRuleKind, Viewport } from "@/lib/editor/types";
import { registerShortcut } from "@/lib/shortcuts/registry";
import { ShortcutScopeBaseType } from "@/lib/shortcuts/scopes";
import { InlineEdit, type InlineEditHandle } from "@/components/ui/InlineEdit";
import { COLOR_SWATCHES } from "@/types/rules/RuleColor";
import { useKeyboardDnd } from "@/lib/editor/dnd/keyboard-controller";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

import {
  RuleActionKindType,
  type RuleActionKind,
  KIND_ORDER,
  OUTER_BLUR_PX,
  INNER_BAND_BLUR_PX,
  HUD_PARAMS,
  HANDLES,
} from "./SelectionOverlayConstants";
export { RuleActionKindType, type RuleActionKind };
import { svgMaskDataUrl, type HudParamSpec } from "./SelectionOverlayUtils";
import { useSelectionOverlayGestures } from "./useSelectionOverlayGestures";
import { SelectionOverlayContextMenu } from "./SelectionOverlayContextMenu";
import { SelectionOverlayHandles } from "./SelectionOverlayHandles";
import { SelectionOverlayBlurBackdrop } from "./SelectionOverlayBlurBackdrop";
import { SelectionOverlayRotationHandles } from "./SelectionOverlayRotationHandles";
import { SelectionOverlayQuickProps } from "./SelectionOverlayQuickProps";
import { SelectionOverlayQuickActions } from "./SelectionOverlayQuickActions";
import { SelectionOverlayDimensionHud } from "./SelectionOverlayDimensionHud";

interface Props {
  rules: EditorRule[];
  selectedIds: string[];
  viewport: Viewport;
  canvasSize: { width: number; height: number };
  contextMenu: { x: number; y: number; ruleId: string } | null;
  onCloseContextMenu: () => void;
  onResize: (id: string, rect: { x: number; y: number; width: number; height: number }) => void;
  onAction: (id: string, action: RuleActionKind, payload?: number) => void;
  onChangeKind: (id: string, kind: EditorRuleKind) => void;
  onSetColor?: (id: string, color: string | null) => void;
  /**
   * Rotation sink. Plan 79 step 36 landed persistence: the ROI schema now
   * carries `rotation` (see `src/lib/editor/types.ts` and the persistence
   * Zod schema at `src/lib/editor/store/persistence.ts`), and the envelope
   * adapter round-trips it through `_Rotation`. When a caller omits this
   * handler the overlay still falls back to local state so read-only /
   * preview mounts stay functional. Angle is degrees, clockwise, about
   * the ROI centre, normalised to (-180, 180].
   */
  onRotate?: (id: string, degrees: number) => void;
}

export function SelectionOverlay({
  rules,
  selectedIds,
  viewport,
  canvasSize,
  contextMenu,
  onCloseContextMenu,
  onResize,
  onAction,
  onChangeKind,
  onSetColor,
  onRotate,
}: Props): React.JSX.Element | null {
  const snap = useSnap();
  const keyboardDnd = useKeyboardDnd();
  const rule =
    selectedIds.length === 1 ? (rules.find((r) => r.id === selectedIds[0]) ?? null) : null;
  // Plan 100 Phase E step 47: rotation-aware overlay parity. Read the
  // normalised (-180, 180] rotation from the shared shape hook so the
  // overlay transform, θ badge, and rotation handle position stay in
  // lockstep with HUD-follow and future "Reveal in canvas" consumers.
  // Local drag state (`rotations[id]`) still wins mid-drag; on release
  // the persisted value from the store flows through the hook.
  const selectedShape = useSelectedRuleShape();
  const dragRef = useRef<{
    handle: string;
    startClientX: number;
    startClientY: number;
    origin: EditorRule;
  } | null>(null);
  const [, forceRender] = useState(0);
  const [rippleKey, setRippleKey] = useState(0);
  // Smart-align guides shown while the user is actively dragging a
  // resize handle. Cleared on pointer-up so the overlay only appears
  // during placement, matching Figma / Sketch behavior.
  const [alignGuides, setAlignGuides] = useState<AlignGuide[]>([]);
  // Snap debug telemetry from the most recent drag frame. Rendered by
  // SnapDebugHud when `snap.debug` is on. Cleared on pointer-up
  // together with `alignGuides` so the HUD only shows during placement.
  const [alignDebug, setAlignDebug] = useState<NonNullable<AlignResult["debug"]> | null>(null);
  const [lastTolerancePx, setLastTolerancePx] = useState<number>(0);
  const lastSelId = useRef<string | null>(null);
  // Plan 79 step 34: local rotation fallback (degrees, cw). Only used when
  // no `onRotate` sink is wired; step 36 landed the ROI-schema persistence
  // path, so mounts that pass `onRotate` (see EditorSetupExperience) get
  // reload-durable rotations via `setRuleRotation`.
  const [rotations, setRotations] = useState<Record<string, number>>({});
  // Plan 80 step 25/26: track active rotation so we can render a live
  // floating angle chip anchored to the rotation handle even at 0°.
  const [isRotating, setIsRotating] = useState(false);
  // Flashes true when the rotation drag is pinned to angleMin/angleMax
  // so the handle + live badge can render a "bound hit" affordance.
  const [atAngleBound, setAtAngleBound] = useState(false);
  // Tracks resize drags so the angle-zone overlay (rectangular ROI
  // acceptance range) stays visible while an operator adjusts the box,
  // not only while rotating.
  const [isResizing, setIsResizing] = useState(false);
  const rotateRef = useRef<{
    id: string;
    cx: number;
    cy: number;
    startClientX: number;
    startClientY: number;
    startAngle: number;
  } | null>(null);

  // Inline rename delegated to the shared InlineEdit primitive (V4 §14).
  // The imperative handle lets F2 (HUD-scope shortcut below) start the
  // rename without reaching into private state.
  const renameRef = useRef<InlineEditHandle>(null);
  const setRuleName = useRulesStore((s) => s.setRuleName);
  const updateParams = useRulesStore((s) => s.updateParams);
  const roiPreviewSharpen = useUiPrefsStore((s) => s.roiPreviewSharpen);
  const toggleRoiPreviewSharpen = useUiPrefsStore((s) => s.toggleRoiPreviewSharpen);
  // Global rotation snap default. Per-rule `params.rotationSnap`
  // overrides this. Alt held during a rotate drag forces continuous.
  const rotationSnapDefault = useUiPrefsStore((s) => s.rotationSnapDefault);
  const setRotationSnapDefault = useUiPrefsStore((s) => s.setRotationSnapDefault);
  const hudFollowsShape = useUiPrefsStore((s) => s.hudFollowsShape);
  const toggleHudFollowsShape = useUiPrefsStore((s) => s.toggleHudFollowsShape);
  const hudAnchorDebug = useUiPrefsStore((s) => s.hudAnchorDebug);

  // Persisted floating-HUD position, scoped to the current project (or
  // "global" when the editor is rendered outside a project route). Once
  // the user drags the HUD by its header, the saved absolute position
  // overrides the auto-anchored default and survives reloads. Double-
  // clicking the header resets to the default anchor.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hudScope = deriveHudScope(pathname);
  const { pos: hudPos, setPos: setHudPos, reset: resetHudPos } = useHudPosition(hudScope);
  const hudDragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  // Plan 100 step 17: HUD-scope binding. When a single ROI is selected,
  // number keys 1/2/3 apply the Strict/Balanced/Loose preset for the
  // rule's kind. Scoped to `hud` so they override any route-scope
  // shortcut that also binds those keys, and only registered while a
  // rule is selected so they never fire without a target.
  useEffect(() => {
    if (!rule) {
      return;
    }
    const presets = getPresetsForKind(rule.kind);

    if (presets.length === 0) return;
    const combos: Array<{ combo: string; index: number; label: string }> = presets
      .slice(0, 3)
      .map((preset, index) => ({
        combo: String(index + 1),
        index,
        label: preset.label,
      }));
    const unsubs = combos.map(({ combo, index, label }) =>
      registerShortcut({
        id: `hud.preset.${index}`,
        scope: ShortcutScopeBaseType.Hud,
        combo,
        label: `Apply preset: ${label}`,
        group: "Selection",
        run: () => {
          const preset = getPresetsForKind(rule.kind)[index];

          if (!preset) return;
          const next = applyPresetParams(rule.params, preset);
          updateParams(rule.id, next);
        },
      }),
    );

    return () => {
      for (const u of unsubs) u();
    };
  }, [rule?.id, rule?.kind, updateParams]);
  // Note: `rule` is captured fresh on each registration via the effect's
  // dependency on `rule?.id`, so `run` always sees the current params.

  // Plan 100 step 19: F2 begins rename for the selected ROI. HUD scope so
  // it beats route-scope tool hotkeys while a ROI is selected. Locked rules
  // are excluded via `when` per V4 §14.

  useEffect(() => {
    if (!rule) {
      return;
    }
    const unregister = registerShortcut({
      id: "hud.rename",
      scope: ShortcutScopeBaseType.Hud,
      combo: "F2",
      label: "Rename selected ROI",
      group: "Selection",
      when: () => !rule.isLocked,
      run: () => {
        renameRef.current?.beginEdit();
      },
    });

    return unregister;
  }, [rule?.id, rule?.isLocked, rule?.name]);

  // Kick off a one-shot ripple whenever the single-selected rule changes so
  // the user can see where the newly selected rule lives on the canvas.
  useEffect(() => {
    const id = rule?.id ?? null;

    if (id && id !== lastSelId.current) {
      setRippleKey((k) => k + 1);
    }

    lastSelId.current = id;
  }, [rule?.id]);

  // NOTE: no early return here. React requires the hook count to be stable
  // across renders; the previous `if (!rule && !contextMenu) return null;`
  // skipped the `useEffect` below and crashed with
  // "Rendered fewer hooks than expected" the moment selection cleared and
  // then returned. Compute derived values defensively (they read `rule`
  // through ternaries) and gate the final JSX instead.

  const showHandles = rule && !rule.isLocked && !rule.isHidden;
  const tl = rule ? imageToScreen({ x: rule.x, y: rule.y }, viewport) : null;
  const br = rule
    ? imageToScreen({ x: rule.x + rule.width, y: rule.y + rule.height }, viewport)
    : null;
  const ruleColor = rule ? ((rule.params?.color as string | undefined) ?? null) : null;
  const ringColor = ruleColor ?? "var(--ca-select, #8b5cf6)";
  // Seed with the persisted rule rotation (step 36) so switching selection
  // does not visually snap back to 0; local state wins while the user is
  // actively dragging the handle.
  const localTheta = rule ? rotations[rule.id] : undefined;
  const persistedTheta = selectedShape?.rotation ?? 0;
  const theta = normalizeAngle(localTheta ?? persistedTheta);

  if (
    import.meta.env.DEV &&
    rule &&
    localTheta != null &&
    Math.abs(normalizeAngle(localTheta) - persistedTheta) > 1
  ) {
    // Silent divergence between the local drag angle and the persisted
    // rotation is exactly the drift the shared hook is meant to catch.

    console.debug("[SelectionOverlay] rotation divergence", {
      id: rule.id,
      localTheta,
      persistedTheta,
    });
  }

  const boxCenter = rule && tl && br ? { x: (tl.x + br.x) / 2, y: (tl.y + br.y) / 2 } : null;
  const rotateTransform = theta ? `rotate(${theta}deg)` : undefined;

  // Re-anchor the persisted HUD position whenever the "follow shape"
  // preference changes, or when the shape moves while the stored anchor
  // is stale relative to the current preference. Preserves the on-screen
  // position at the moment of the switch:
  //   canvas -> shape: subtract the shape's current top-left so the
  //     stored value becomes a delta and the HUD locks to the shape.
  //   shape  -> canvas: bake in the shape's current top-left so the
  //     stored value becomes absolute canvas coords and the HUD unlocks.
  // Runs on every `tl` change too: when a user dragged the HUD before
  // turning the pref on, the next shape-drag frame re-anchors to
  // "shape" and follows from there.
  useEffect(() => {
    if (!hudPos || !tl) return;
    const want: HudAnchor = hudFollowsShape ? HudAnchorType.Shape : HudAnchorType.Canvas;

    if (hudPos.anchor === want) return;

    if (want === "shape") {
      setHudPos({ x: hudPos.x - tl.x, y: hudPos.y - tl.y, anchor: HudAnchorType.Shape });
    } else {
      setHudPos({ x: hudPos.x + tl.x, y: hudPos.y + tl.y, anchor: HudAnchorType.Canvas });
    }
  }, [hudFollowsShape, hudPos, tl, setHudPos]);

  // Hook-count is now stable above this line. Safe to short-circuit render.
  // Do NOT emit a log during render: log subscribers (e.g. the status-strip
  // LastLogChip) call setState synchronously, and React then throws
  // "Cannot update a component (LastLogChip) while rendering a different
  // component (SelectionOverlay)", which cascades into the Setup error
  // boundary as "Rendered fewer hooks than expected" on the next render.
  useEffect(() => {
    if (!rule && !contextMenu) {
      logger.info("I_UI_SELECTION_OVERLAY_IDLE");
    }
  }, [rule, contextMenu]);

  if (!rule && !contextMenu) {
    return null;
  }

  const {
    onHandleDown,
    onHandleMove,
    onHandleUp,
    onRotateDown,
    onRotateMove,
    onRotateUp,
    onRotateKeyDown,
    onResizeKeyDown,
  } = useSelectionOverlayGestures({
    rule,
    rules,
    viewport,
    snap,
    dragRef,
    rotateRef,
    boxCenter,
    theta,
    rotationSnapDefault,
    setIsResizing,
    setIsRotating,
    setAtAngleBound,
    setAlignGuides,
    setAlignDebug,
    setLastTolerancePx,
    forceRender,
    onResize,
    setRotations,
    onRotate,
  });

  const menuRule = contextMenu ? (rules.find((r) => r.id === contextMenu.ruleId) ?? null) : null;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ width: canvasSize.width, height: canvasSize.height }}
    >
      <AlignmentGuides guides={alignGuides} viewport={viewport} canvasSize={canvasSize} />
      {snap.debug ? (
        <SnapDebugHud
          debug={alignDebug}
          guides={alignGuides}
          zoom={viewport.zoom}
          tolerancePx={lastTolerancePx || (snap.alignTolerancePx ?? 6)}
        />
      ) : null}
      {rule && tl && br ? (
        <>
          <SelectionOverlayAngleZone
            rule={rule}
            tl={tl}
            br={br}
            boxCenter={boxCenter}
            theta={theta}
            isRotating={isRotating}
            isResizing={isResizing}
            atAngleBound={atAngleBound}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute border-2 ${RuleKindType.isCircle(rule.kind) ? "rounded-full" : "rounded-sm"} ${keyboardDnd.grabbedId === rule.id ? "ring-2 ring-offset-2 ring-[var(--ca-focus)]" : ""}`}
            style={{
              left: tl.x,
              top: tl.y,
              width: Math.max(0, br.x - tl.x),
              height: Math.max(0, br.y - tl.y),
              borderColor: ringColor,
              opacity: 0.85,
              transform: rotateTransform,
              transformOrigin: "center center",
            }}
          />
          {/* Two-tier focus blur. Layer 1 covers the entire canvas and
              blurs everything OUTSIDE the ROI bounding rect. Layer 2
              covers the bounding rect and adds a lighter blur to the
              band between the bbox and the actual shape (circle for
              kind C). The shape interior is fully clear, showing the
              underlying image pixels with no tint or blur.
              Skipped when the "Sharpen preview" toggle is on. */}
          {roiPreviewSharpen ? null : (
            <SelectionOverlayBlurBackdrop
              rule={rule}
              tl={tl}
              br={br}
              theta={theta}
              rotateTransform={rotateTransform}
              canvasSize={canvasSize}
            />
          )}
          {/* Plan 79 step 33: stacked 13px tabular-numeric badges above
              the ROI. Position badge shows image-space X/Y; size badge
              shows W x H. Falls back to below the ROI when the shape
              hugs the top edge so nothing renders off-canvas. The name
              chip is folded into the same stack so it never overlaps the
              ROI's own on-canvas label. */}
          <SelectionOverlayDimensionHud
            rule={rule}
            tl={tl}
            br={br}
            ringColor={ringColor}
            onResize={onResize}
            roiPreviewSharpen={roiPreviewSharpen}
            toggleRoiPreviewSharpen={toggleRoiPreviewSharpen}
            renameRef={renameRef}
            setRuleName={setRuleName}
          />
          <div
            key={rippleKey}
            aria-hidden
            className={`pointer-events-none absolute border-2 ${RuleKindType.isCircle(rule.kind) ? "rounded-full" : "rounded-sm"} animate-[editor-ripple_650ms_ease-out_forwards]`}
            style={{
              left: tl.x,
              top: tl.y,
              width: Math.max(0, br.x - tl.x),
              height: Math.max(0, br.y - tl.y),
              borderColor: ringColor,
              transform: rotateTransform,
              transformOrigin: "center center",
            }}
          />
        </>
      ) : null}
      {/* Plan 79 step 34: rotation handle. Sits 20px above the top-right
          corner along the ROI's rotated up-axis so the affordance tracks
          the shape. Snaps to 15° by default; hold Alt to rotate freely.
          Plan 80 step 26: renders a live θ chip during drag. */}
      {showHandles && tl && br && boxCenter ? (
        <SelectionOverlayRotationHandles
          tl={tl}
          br={br}
          theta={theta}
          boxCenter={boxCenter}
          atAngleBound={atAngleBound}
          isRotating={isRotating}
          ringColor={ringColor}
          onRotateDown={onRotateDown}
          onRotateMove={onRotateMove}
          onRotateUp={onRotateUp}
          onRotateKeyDown={onRotateKeyDown}
        />
      ) : null}
      {showHandles && tl && br && boxCenter ? (
        <SelectionOverlayHandles
          tl={tl}
          br={br}
          boxCenter={boxCenter}
          theta={theta}
          onHandleDown={onHandleDown}
          onHandleMove={onHandleMove}
          onHandleUp={onHandleUp}
          onResizeKeyDown={onResizeKeyDown}
        />
      ) : null}
      {/* Plan 65 step 27: on-canvas quick actions floating above the selected
          shape (Figma-style). Duplicate copies the rule + its params via the
          existing `duplicate` action; delete is disabled while the rule is
          locked (the same guard that hides drag handles and blocks the
          context-menu delete). Only rendered for a single-selection to
          keep the affordance unambiguous. */}
      {rule && tl && br ? (
        <SelectionOverlayQuickActions
          rule={rule}
          tl={tl}
          br={br}
          canvasSize={canvasSize}
          onAction={onAction}
        />
      ) : null}
      {/* Floating properties HUD. Renders compact numeric inputs for the
          params that exist on the current rule (threshold, radius, ...)
          right next to the selection so operators can tune values while
          watching the canvas. Purely presentational; writes back via the
          existing `updateParams` store action. */}
      <SelectionOverlayQuickProps
        rule={rule}
        tl={tl}
        br={br}
        canvasSize={canvasSize}
        hudPos={hudPos}
        setHudPos={setHudPos}
        resetHudPos={resetHudPos}
        hudFollowsShape={hudFollowsShape}
        toggleHudFollowsShape={toggleHudFollowsShape}
        hudAnchorDebug={hudAnchorDebug}
        rotationSnapDefault={rotationSnapDefault}
        setRotationSnapDefault={setRotationSnapDefault}
        updateParams={updateParams}
      />
      {contextMenu && menuRule ? (
        <SelectionOverlayContextMenu
          contextMenu={contextMenu}
          menuRule={menuRule}
          rules={rules}
          onChangeKind={onChangeKind}
          onSetColor={onSetColor}
          onRotate={onRotate}
          onAction={onAction}
          onCloseContextMenu={onCloseContextMenu}
        />
      ) : null}
    </div>
  );
}
