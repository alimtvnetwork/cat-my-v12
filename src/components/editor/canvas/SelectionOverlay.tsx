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
import { AngleZoneOverlay } from "./AngleZoneOverlay";
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

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const closePointer = (e: PointerEvent) => {
      const root = menuElRef.current;

      if (root && e.target instanceof Node && root.contains(e.target)) return;
      onCloseContextMenu();
    };
    const getItems = (): HTMLElement[] => {
      const root = menuElRef.current;

      if (!root) return [];

      return Array.from(
        root.querySelectorAll<HTMLElement>('[role="menuitem"],[role="menuitemradio"]'),
      ).filter((el) => el.hasAttribute("disabled") === false);
    };
    const groupOf = (el: HTMLElement): Element => {
      const root = menuElRef.current!;
      const g = el.closest('[role="group"]');

      return g && root.contains(g) ? g : el;
    };
    const onKey = (e: KeyboardEvent) => {
      if (KeyboardKeyType.isEscape(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        onCloseContextMenu();

        return;
      }

      const items = getItems();

      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? items.indexOf(active) : -1;

      if (KeyboardKeyType.isArrowDown(e.key)) {
        e.preventDefault();
        const next = items[(idx + 1 + items.length) % items.length];
        next?.focus();
      } else if (KeyboardKeyType.isArrowUp(e.key)) {
        e.preventDefault();
        const prev = items[(idx - 1 + items.length) % items.length];
        prev?.focus();
      } else if (KeyboardKeyType.isHome(e.key)) {
        e.preventDefault();
        items[0]?.focus();
      } else if (KeyboardKeyType.isEnd(e.key)) {
        e.preventDefault();
        items[items.length - 1]?.focus();
      } else if (KeyboardKeyType.isTab(e.key)) {
        e.preventDefault();
        const currentGroup = active && items.includes(active) ? groupOf(active) : null;
        const groups: Element[] = [];
        for (const it of items) {
          const g = groupOf(it);

          if (groups.includes(g) === false) groups.push(g);
        }

        if (groups.length === 0) return;
        const gi = currentGroup ? groups.indexOf(currentGroup) : -1;
        const step = e.shiftKey ? -1 : 1;
        const nextGroup = groups[(gi + step + groups.length) % groups.length];
        const target = items.find((it) => groupOf(it) === nextGroup);
        target?.focus();
      } else if (KeyboardKeyType.isEnterOrSpace(e.key) && active && items.includes(active)) {
        e.preventDefault();
        active.click();
      }
    };
    window.addEventListener("pointerdown", closePointer, { capture: true });
    window.addEventListener("keydown", onKey, true);

    return () => {
      window.removeEventListener("pointerdown", closePointer, {
        capture: true,
      } as EventListenerOptions);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [contextMenu, onCloseContextMenu]);

  // Context menu clamp: measure the rendered menu and clamp its position
  // to the viewport so it never gets cut off at the bottom or right edge
  // (portal + position:fixed lets it escape any canvas clipping).
  const menuElRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!contextMenu) {
      setMenuPos(null);

      return;
    }

    const el = menuElRef.current;
    const w = el?.offsetWidth ?? 240;
    const h = el?.offsetHeight ?? 420;
    const pad = 8;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    // Prefer opening to the right/below the cursor; if that overflows,
    // flip so the menu opens above / to the left of the cursor.
    let left = contextMenu.x;
    let top = contextMenu.y;

    if (left + w + pad > vw) left = Math.max(pad, contextMenu.x - w);

    if (top + h + pad > vh) top = Math.max(pad, contextMenu.y - h);
    left = Math.max(pad, Math.min(left, vw - w - pad));
    top = Math.max(pad, Math.min(top, vh - h - pad));
    setMenuPos({ left, top });
  }, [contextMenu]);

  // Focus the first item once the menu is positioned/visible so keyboard
  // navigation works immediately after opening.
  useEffect(() => {
    if (!contextMenu || !menuPos) return;
    const root = menuElRef.current;

    if (!root) return;
    const first = root.querySelector<HTMLElement>(
      '[role="menuitem"]:not([disabled]),[role="menuitemradio"]:not([disabled])',
    );
    first?.focus();

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

  const onHandleDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    handle: string,
    expected?: { x: number; y: number },
  ) => {
    if (!rule) return;
    // Correctness guard: the grip's 24x24 hit-box can extend past the
    // ideal rotated edge/corner point (especially at extreme rotations
    // where two grips visually converge). Reject the activation when
    // the pointer lands more than 16 CSS pixels from the true handle
    // anchor in overlay-local space, so the user only starts a resize
    // when they're actually on the intended edge/corner.
    if (expected) {
      const overlayEl = (event.currentTarget as HTMLDivElement).parentElement;
      const rect = overlayEl?.getBoundingClientRect();

      if (rect) {
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        const dx = px - expected.x;
        const dy = py - expected.y;

        if (Math.hypot(dx, dy) > 16) {
          event.preventDefault();
          event.stopPropagation();

          return;
        }
      }
    }

    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin: rule,
    };
    setIsResizing(true);
  };

  const onHandleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;

    if (!d) return;
    const scale = viewport.zoom;
    const dxImg = (event.clientX - d.startClientX) / scale;
    const dyImg = (event.clientY - d.startClientY) / scale;
    let { x, y, width, height } = d.origin;

    if (d.handle.includes("w")) {
      x = d.origin.x + dxImg;
      width = d.origin.width - dxImg;
    }

    if (d.handle.includes("e")) {
      width = d.origin.width + dxImg;
    }

    if (d.handle.includes("n")) {
      y = d.origin.y + dyImg;
      height = d.origin.height - dyImg;
    }

    if (d.handle.includes("s")) {
      height = d.origin.height + dyImg;
    }
    // Shift = lock aspect ratio. For circles the user explicitly asked for
    // this to preserve a perfect circle; we honor it for every shape so
    // rectangles and text ROIs behave consistently. The larger axis wins
    // so the pointer stays close to the handle.
    if (event.shiftKey) {
      const size = Math.max(Math.abs(width), Math.abs(height));
      const signW = width < 0 ? -1 : 1;
      const signH = height < 0 ? -1 : 1;

      if (d.handle.includes("w")) x = d.origin.x + d.origin.width - size * signW;

      if (d.handle.includes("n")) y = d.origin.y + d.origin.height - size * signH;
      width = size * signW;
      height = size * signH;
    }
    // Plan 79 step 37: Alt = resize from centre. We double the delta on
    // the active axis and re-anchor the origin so the ROI centre stays
    // fixed. Handles that only touch one axis (n/s/e/w) leave the other
    // axis untouched. Combines cleanly with Shift (aspect-locked resize
    // still pivots on the centre).
    if (event.altKey) {
      const cx = d.origin.x + d.origin.width / 2;
      const cy = d.origin.y + d.origin.height / 2;

      if (d.handle.includes("w") || d.handle.includes("e")) {
        // Signed width relative to the fixed centre.
        const halfW = d.handle.includes("w") ? cx - x : x + width - cx;
        width = halfW * 2;
        x = cx - halfW;
      }

      if (d.handle.includes("n") || d.handle.includes("s")) {
        const halfH = d.handle.includes("n") ? cy - y : y + height - cy;
        height = halfH * 2;
        y = cy - halfH;
      }
    }

    if (width < 8) {
      width = 8;

      if (d.handle.includes("w")) x = d.origin.x + d.origin.width - 8;
    }

    if (height < 8) {
      height = 8;

      if (d.handle.includes("n")) y = d.origin.y + d.origin.height - 8;
    }
    // Plan 79 step 39: snap runs BEFORE the image-bounds clamp so the
    // user sees discrete grid stops even when the pointer overshoots
    // the edge; the clamp then keeps the ROI inside the image.
    const snapped = snapRect({ x, y, width, height }, snap);
    // Smart-align: after grid snap and before image clamp, nudge the
    // active edges to sibling / image lines so the user sees clear
    // alignment feedback during placement. Tolerance is in image px and
    // scales inversely with zoom so it feels like a fixed screen band.
    // User-tunable smart-align band. `snap.alignTolerancePx` is in SCREEN
    // pixels (see snap.ts); divide by zoom to convert to image space so
    // the perceived pull-in stays constant across zoom levels. Floor of
    // 1 px keeps behaviour predictable when the user zooms far in.
    const screenTolerance = snap.alignTolerancePx ?? 6;
    const tolerance = Math.max(1, screenTolerance / Math.max(viewport.zoom, 0.0001));
    const siblings = rules
      .filter((r) => r.id !== d.origin.id && !r.isHidden)
      .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
    const aligned = computeAlignment(snapped, siblings, {
      tolerance,
      imageBounds: IMAGE_BOUNDS,
      handle: d.handle,
    });
    setAlignGuides(mergeGuides(aligned.guides));

    if (snap.debug) {
      setAlignDebug(aligned.debug ?? null);
      setLastTolerancePx(screenTolerance);
    }

    const clamped = clampRectToBounds(aligned.rect, IMAGE_BOUNDS);
    onResize(d.origin.id, clamped);
    forceRender((n) => n + 1);
  };

  const onHandleUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
      dragRef.current = null;
    }

    if (alignGuides.length > 0) setAlignGuides([]);

    if (alignDebug) setAlignDebug(null);
    setIsResizing(false);
  };

  const setRotation = (id: string, deg: number) => {
    // Normalise to (-180, 180] so the readout stays compact. Shared with
    // the drag path via `normalizeAngle` (Plan 80 step 27).
    const d = normalizeAngle(deg);
    setRotations((prev) => ({ ...prev, [id]: d }));
    onRotate?.(id, d);
  };

  const onRotateDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!rule || !boxCenter) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    // Convert overlay-local centre to client coords using the target rect.
    const overlayRect = (
      event.currentTarget as HTMLDivElement
    ).parentElement!.getBoundingClientRect();
    rotateRef.current = {
      id: rule.id,
      cx: overlayRect.left + boxCenter.x,
      cy: overlayRect.top + boxCenter.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startAngle: theta,
    };
    setIsRotating(true);

    if (import.meta.env.DEV) {
      console.debug("[SelectionOverlay] rotate:start", { id: rule.id, theta });
    }
  };

  const onRotateMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const r = rotateRef.current;

    if (!r) return;
    const a0 = Math.atan2(r.startClientY - r.cy, r.startClientX - r.cx);
    const a1 = Math.atan2(event.clientY - r.cy, event.clientX - r.cx);
    // Plan 80 step 25/27: snap-to-15° default; Alt rotates freely.
    // Post-Phase I: enforce the rule's angleMin / angleMax acceptance
    // zone at the interaction seam so the ROI physically cannot rotate
    // past the bounds (no silent clamp on persist / render). Bounds
    // come from the same params the HUD writes, keeping one source of
    // truth.
    const params = (rule?.params ?? {}) as Record<string, unknown>;
    const angleMin = typeof params.angleMin === "number" ? params.angleMin : undefined;
    const angleMax = typeof params.angleMax === "number" ? params.angleMax : undefined;
    // Rotation snap: per-rule override wins, then the global UI-prefs
    // default. Alt held during the drag forces continuous rotation so
    // operators can nudge past a coarse preset without visiting menus.
    const perRuleSnap =
      typeof params.rotationSnap === "number" && Number.isFinite(params.rotationSnap)
        ? (params.rotationSnap as number)
        : undefined;
    const snapStep = event.altKey
      ? 0
      : perRuleSnap !== undefined
        ? perRuleSnap
        : rotationSnapDefault;
    const deg = computeRotation({
      startAngle: r.startAngle,
      a0,
      a1,
      snapStep,
      angleMin,
      angleMax,
    });
    setRotation(r.id, deg);
    setAtAngleBound(isAtAngleBound(deg, angleMin, angleMax));
  };

  const onRotateUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (rotateRef.current) {
      (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);

      if (import.meta.env.DEV) {
        console.debug("[SelectionOverlay] rotate:end", {
          id: rotateRef.current.id,
          theta: rotations[rotateRef.current.id] ?? 0,
        });
      }

      rotateRef.current = null;
    }

    setIsRotating(false);
    setAtAngleBound(false);
  };

  // Keyboard-driven rotation. Focus a rotate handle and press
  // ArrowLeft / ArrowRight to nudge by 1°; Shift = 15°, Alt = 0.1°.
  // Home = 0°. Bounds from angleMin/angleMax are enforced.
  const onRotateKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!rule) return;
    let delta = 0;
    let absolute: number | null = null;

    if (KeyboardKeyType.isArrowRight(event.key) || KeyboardKeyType.isArrowUp(event.key)) delta = 1;
    else if (KeyboardKeyType.isArrowLeft(event.key) || KeyboardKeyType.isArrowDown(event.key))
      delta = -1;
    else if (KeyboardKeyType.isHome(event.key)) absolute = 0;
    else if (KeyboardKeyType.isPageUp(event.key)) delta = 15;
    else if (KeyboardKeyType.isPageDown(event.key)) delta = -15;
    else return;
    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) delta *= 15;
    else if (event.altKey) delta *= 0.1;
    const params = (rule.params ?? {}) as Record<string, unknown>;
    const angleMin = typeof params.angleMin === "number" ? params.angleMin : undefined;
    const angleMax = typeof params.angleMax === "number" ? params.angleMax : undefined;
    let next = absolute != null ? absolute : theta + delta;
    next = normalizeAngle(next);

    if (angleMin != null && next < angleMin) next = angleMin;

    if (angleMax != null && next > angleMax) next = angleMax;
    setRotation(rule.id, next);
    setAtAngleBound(isAtAngleBound(next, angleMin, angleMax));
  };

  // Keyboard-driven resize. Focus a resize grip and press arrow keys to
  // nudge the corresponding edge(s) by 1 px (Shift = 10 px). Alt mirrors
  // the delta on the opposite edge, matching the pointer "resize from
  // centre" affordance. Clamped to the image bounds and a min of 8 px.
  const onResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, handle: string) => {
    if (!rule) return;
    let dx = 0;
    let dy = 0;

    if (KeyboardKeyType.isArrowLeft(event.key)) dx = -1;
    else if (KeyboardKeyType.isArrowRight(event.key)) dx = 1;
    else if (KeyboardKeyType.isArrowUp(event.key)) dy = -1;
    else if (KeyboardKeyType.isArrowDown(event.key)) dy = 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 10 : 1;
    dx *= step;
    dy *= step;
    let { x, y, width, height } = rule;

    if (handle.includes("w")) {
      x = rule.x + dx;
      width = rule.width - dx;
    }

    if (handle.includes("e")) {
      width = rule.width + dx;
    }

    if (handle.includes("n")) {
      y = rule.y + dy;
      height = rule.height - dy;
    }

    if (handle.includes("s")) {
      height = rule.height + dy;
    }

    if (event.altKey) {
      const cx = rule.x + rule.width / 2;
      const cy = rule.y + rule.height / 2;

      if (handle.includes("w") || handle.includes("e")) {
        const halfW = handle.includes("w") ? cx - x : x + width - cx;
        width = halfW * 2;
        x = cx - halfW;
      }

      if (handle.includes("n") || handle.includes("s")) {
        const halfH = handle.includes("n") ? cy - y : y + height - cy;
        height = halfH * 2;
        y = cy - halfH;
      }
    }

    if (width < 8) {
      width = 8;

      if (handle.includes("w")) x = rule.x + rule.width - 8;
    }

    if (height < 8) {
      height = 8;

      if (handle.includes("n")) y = rule.y + rule.height - 8;
    }

    const clamped = clampRectToBounds({ x, y, width, height }, IMAGE_BOUNDS);
    onResize(rule.id, clamped);
  };

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
          {(() => {
            // Angle-zone overlay: show while actively rotating or
            // resizing a rectangular ROI when the rule has finite
            // angleMin / angleMax params. Renders under the selection
            // frame so shape edges stay on top.
            if (RuleKindType.isRectangle(rule.kind) === false) return null;

            if (!isRotating && !isResizing) return null;
            const p = (rule.params ?? {}) as Record<string, unknown>;
            const aMin = typeof p.angleMin === "number" ? p.angleMin : undefined;
            const aMax = typeof p.angleMax === "number" ? p.angleMax : undefined;

            if (aMin === undefined || aMax === undefined) return null;

            if (!boxCenter) return null;
            const halfW = (br.x - tl.x) / 2;
            const halfH = (br.y - tl.y) / 2;
            const radius = Math.max(halfW, halfH) + 28;

            return (
              <AngleZoneOverlay
                cx={boxCenter.x}
                cy={boxCenter.y}
                radius={radius}
                angleMin={aMin}
                angleMax={aMax}
                theta={theta}
                atBound={atAngleBound}
              />
            );
          })()}
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
          {roiPreviewSharpen
            ? null
            : (() => {
                const w = Math.max(0, br.x - tl.x);
                const h = Math.max(0, br.y - tl.y);
                const cw = canvasSize.width;
                const ch = canvasSize.height;
                const cx = tl.x + w / 2;
                const cy = tl.y + h / 2;
                const rot = theta ? `rotate(${theta} ${cx} ${cy})` : "";
                // Outer mask: white full canvas with a black bbox (rotated)
                // punched out. Blur shows everywhere the mask is white.
                const outerMask =
                  `<svg xmlns='http://www.w3.org/2000/svg' width='${cw}' height='${ch}' viewBox='0 0 ${cw} ${ch}'>` +
                  `<rect width='100%' height='100%' fill='white'/>` +
                  `<rect x='${tl.x}' y='${tl.y}' width='${w}' height='${h}' fill='black' transform='${rot}'/>` +
                  `</svg>`;
                // Inner mask (only meaningful for circle kind): white bbox
                // with the inscribed ellipse (the shape) punched out.
                const innerMask =
                  `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>` +
                  `<rect width='100%' height='100%' fill='white'/>` +
                  (RuleKindType.isCircle(rule.kind)
                    ? `<ellipse cx='${w / 2}' cy='${h / 2}' rx='${w / 2}' ry='${h / 2}' fill='black'/>`
                    : `<rect width='100%' height='100%' fill='black'/>`) +
                  `</svg>`;
                const outerMaskUrl = svgMaskDataUrl(outerMask);
                const innerMaskUrl = svgMaskDataUrl(innerMask);

                return (
                  <>
                    {/* Layer 1: heavy blur everywhere outside the bbox. */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        backdropFilter: `blur(${OUTER_BLUR_PX}px)`,
                        maskImage: outerMaskUrl,
                        WebkitMaskImage: outerMaskUrl,
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                      }}
                    />
                    {/* Layer 2: light blur in the bbox band around the shape.
                    For non-circle kinds shape == bbox, so this layer is
                    fully masked out and contributes nothing. */}
                    {RuleKindType.isCircle(rule.kind) ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute"
                        style={{
                          left: tl.x,
                          top: tl.y,
                          width: w,
                          height: h,
                          transform: rotateTransform,
                          transformOrigin: "center center",
                          backdropFilter: `blur(${INNER_BAND_BLUR_PX}px)`,
                          maskImage: innerMaskUrl,
                          WebkitMaskImage: innerMaskUrl,
                          maskRepeat: "no-repeat",
                          WebkitMaskRepeat: "no-repeat",
                        }}
                      />
                    ) : null}
                    {/* Parameter visualization: colored guides that render
                    outside the shape so the operator can see how radius
                    and threshold reshape the acceptance region without
                    tinting the shape interior. */}
                    {(() => {
                      const p = (rule.params ?? {}) as Record<string, unknown>;
                      const radiusParam = typeof p.radius === "number" ? p.radius : 0;
                      const thresholdParam = typeof p.threshold === "number" ? p.threshold : 0;
                      const similarityParam = typeof p.similarity === "number" ? p.similarity : 0;

                      if (!radiusParam && !thresholdParam && !similarityParam) return null;
                      const halfW = w / 2;
                      const halfH = h / 2;
                      const rx = halfW + radiusParam;
                      const ry = halfH + radiusParam;
                      const thBand = Math.max(4, (thresholdParam / 100) * 24);
                      const simBand = Math.max(4, (similarityParam / 100) * 18);
                      const pad = Math.max(radiusParam + thBand + simBand + 4, 24);
                      const vbW = w + pad * 2;
                      const vbH = h + pad * 2;

                      return (
                        <svg
                          aria-hidden
                          className="pointer-events-none absolute"
                          width={vbW}
                          height={vbH}
                          style={{
                            left: tl.x - pad,
                            top: tl.y - pad,
                            transform: rotateTransform,
                            transformOrigin: "center center",
                            overflow: "visible",
                          }}
                        >
                          {thresholdParam > 0 ? (
                            RuleKindType.isCircle(rule.kind) ? (
                              <ellipse
                                cx={pad + halfW}
                                cy={pad + halfH}
                                rx={halfW + thBand}
                                ry={halfH + thBand}
                                fill="none"
                                stroke="rgb(56 189 248)"
                                strokeOpacity={0.35 + (thresholdParam / 100) * 0.35}
                                strokeWidth={thBand}
                              />
                            ) : (
                              <rect
                                x={pad - thBand / 2}
                                y={pad - thBand / 2}
                                width={w + thBand}
                                height={h + thBand}
                                fill="none"
                                stroke="rgb(56 189 248)"
                                strokeOpacity={0.35 + (thresholdParam / 100) * 0.35}
                                strokeWidth={thBand}
                                rx={2}
                              />
                            )
                          ) : null}
                          {similarityParam > 0 ? (
                            RuleKindType.isCircle(rule.kind) ? (
                              <ellipse
                                cx={pad + halfW}
                                cy={pad + halfH}
                                rx={halfW + thBand + simBand}
                                ry={halfH + thBand + simBand}
                                fill="none"
                                stroke="rgb(232 121 249)"
                                strokeOpacity={0.5}
                                strokeWidth={1.5}
                                strokeDasharray="4 3"
                              />
                            ) : null
                          ) : null}
                          {radiusParam > 0 ? (
                            RuleKindType.isCircle(rule.kind) ? (
                              <ellipse
                                cx={pad + halfW}
                                cy={pad + halfH}
                                rx={rx}
                                ry={ry}
                                fill="none"
                                stroke="rgb(251 146 60)"
                                strokeOpacity={0.85}
                                strokeWidth={1.5}
                                strokeDasharray="6 4"
                              />
                            ) : (
                              <rect
                                x={pad - radiusParam}
                                y={pad - radiusParam}
                                width={w + radiusParam * 2}
                                height={h + radiusParam * 2}
                                fill="none"
                                stroke="rgb(251 146 60)"
                                strokeOpacity={0.85}
                                strokeWidth={1.5}
                                strokeDasharray="6 4"
                                rx={4}
                              />
                            )
                          ) : null}
                        </svg>
                      );
                    })()}
                  </>
                );
              })()}
          {/* Plan 79 step 33: stacked 13px tabular-numeric badges above
              the ROI. Position badge shows image-space X/Y; size badge
              shows W x H. Falls back to below the ROI when the shape
              hugs the top edge so nothing renders off-canvas. The name
              chip is folded into the same stack so it never overlaps the
              ROI's own on-canvas label. */}
          {(() => {
            // Plan 100 Phase I: two rows above the ROI. Row 1 shows the
            // numeric readouts (X·Y and W×H, plus θ when non-zero) side
            // by side. Row 2 is the name chip, rendered larger and
            // directly above the shape so it reads as the primary label.
            const rows = 2;
            const needed = 20 /* numeric row */ + 24 /* name row */ + 6;
            const stackAbove = tl.y - needed >= 0;
            const stackTop = stackAbove ? tl.y - needed : br.y + 6;

            return (
              <div
                data-testid="rule-position-badge"
                className="pointer-events-none absolute z-40 flex flex-col items-start gap-1"
                style={{ left: tl.x, top: stackTop }}
              >
                {/* Row 1: compact numeric badges, side by side. */}
                <div className="pointer-events-none flex items-center gap-1">
                  <span
                    className="pointer-events-auto flex items-center gap-1 whitespace-nowrap rounded-sm border bg-popover/95 px-1.5 py-0.5 font-mono text-[13px] font-medium leading-none text-foreground shadow-sm tabular-nums backdrop-blur-sm"
                    style={{ borderColor: ringColor }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <span className="opacity-60">X</span>
                    <BadgeNumberField
                      value={rule.x}
                      ariaLabel="X position (px)"
                      min={0}
                      max={Math.max(0, IMAGE_BOUNDS.width - rule.width)}
                      disabled={rule.isLocked}
                      onCommit={(nx) =>
                        onResize(rule.id, {
                          x: nx,
                          y: rule.y,
                          width: rule.width,
                          height: rule.height,
                        })
                      }
                    />
                    <span className="opacity-60">· Y</span>
                    <BadgeNumberField
                      value={rule.y}
                      ariaLabel="Y position (px)"
                      min={0}
                      max={Math.max(0, IMAGE_BOUNDS.height - rule.height)}
                      disabled={rule.isLocked}
                      onCommit={(ny) =>
                        onResize(rule.id, {
                          x: rule.x,
                          y: ny,
                          width: rule.width,
                          height: rule.height,
                        })
                      }
                    />
                    <span
                      className="ml-0.5 rounded-sm bg-muted/70 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                      aria-hidden="true"
                    >
                      px
                    </span>
                  </span>
                  <span
                    data-testid="rule-size-badge"
                    className="pointer-events-auto flex items-center gap-1 whitespace-nowrap rounded-sm border bg-popover/95 px-1.5 py-0.5 font-mono text-[13px] font-medium leading-none text-foreground shadow-sm tabular-nums backdrop-blur-sm"
                    style={{ borderColor: ringColor }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <BadgeNumberField
                      value={rule.width}
                      ariaLabel="Width (px)"
                      min={8}
                      max={Math.max(8, IMAGE_BOUNDS.width - rule.x)}
                      disabled={rule.isLocked}
                      onCommit={(nw) =>
                        onResize(rule.id, {
                          x: rule.x,
                          y: rule.y,
                          width: nw,
                          height: rule.height,
                        })
                      }
                    />
                    <span className="opacity-60">×</span>
                    <BadgeNumberField
                      value={rule.height}
                      ariaLabel="Height (px)"
                      min={8}
                      max={Math.max(8, IMAGE_BOUNDS.height - rule.y)}
                      disabled={rule.isLocked}
                      onCommit={(nh) =>
                        onResize(rule.id, {
                          x: rule.x,
                          y: rule.y,
                          width: rule.width,
                          height: nh,
                        })
                      }
                    />
                    <span
                      className="ml-0.5 rounded-sm bg-muted/70 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                      aria-hidden="true"
                    >
                      px
                    </span>
                  </span>
                  {/* Sharpen preview toggle: flips the kind-specific
                      backdrop filter on/off so the operator can compare
                      the crisp underlying image against the styled
                      preview. Persisted in ui-prefs. */}
                  <button
                    type="button"
                    data-testid="rule-sharpen-toggle"
                    aria-pressed={roiPreviewSharpen}
                    aria-label={
                      roiPreviewSharpen
                        ? "Sharpen preview on. Click to compare with styled preview."
                        : "Styled preview on. Click to sharpen."
                    }
                    title={
                      roiPreviewSharpen
                        ? "Sharpen: on (crisp). Click to compare."
                        : "Sharpen: off (styled). Click to sharpen."
                    }
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRoiPreviewSharpen();
                    }}
                    className={`pointer-events-auto whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[13px] font-medium leading-none shadow-sm backdrop-blur-sm hover:brightness-110 ${
                      roiPreviewSharpen
                        ? "bg-popover/95 text-foreground"
                        : "bg-muted/80 text-muted-foreground"
                    }`}
                    style={{ borderColor: ringColor }}
                  >
                    {roiPreviewSharpen ? "◈ Sharp" : "◇ Styled"}
                  </button>
                </div>
                {/* Row 2: primary name chip, larger + closer to the ROI. */}
                <div className="pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
                  <InlineEdit
                    ref={renameRef}
                    value={rule.name}
                    ariaLabel={`Rename ${rule.name}`}
                    onCommit={(next) => setRuleName(rule.id, next)}
                    disabled={rule.isLocked}
                    inputClassName="h-6 rounded-sm border bg-popover px-2 text-[13px] font-semibold leading-none text-foreground shadow-md outline-none focus:ring-2"
                    inputStyle={{ borderColor: ringColor, minWidth: 160 }}
                  >
                    <button
                      type="button"
                      data-testid="rule-name-chip"
                      title="Double-click or F2 to rename"
                      aria-label={`Rename ${rule.name}`}
                      onDoubleClick={() => renameRef.current?.beginEdit()}
                      className="flex h-6 max-w-[280px] items-center gap-1.5 rounded-sm border bg-popover/95 px-2 text-[13px] font-semibold leading-none text-foreground shadow-md backdrop-blur-sm hover:bg-popover"
                      style={{ borderColor: ringColor }}
                    >
                      <span className="font-mono text-[11px] opacity-70">{rule.kind}</span>
                      <span className="truncate">{rule.name}</span>
                    </button>
                  </InlineEdit>
                </div>
              </div>
            );
          })()}
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
      {showHandles && tl && br && boxCenter
        ? (() => {
            const rad = (theta * Math.PI) / 180;
            const halfW = (br.x - tl.x) / 2;
            const halfH = (br.y - tl.y) / 2;
            // Rotate handles at ALL FOUR corners so operators can grab
            // whichever corner is closest; every handle drives the same
            // rotate pointer sequence, so users can rotate freely in any
            // direction (slide, rotate, or free-form) from any corner.
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const corners: Array<{ id: string; ax: number; ay: number }> = [
              { id: "ne", ax: halfW + 14, ay: -halfH - 14 },
              { id: "nw", ax: -halfW - 14, ay: -halfH - 14 },
              { id: "se", ax: halfW + 14, ay: halfH + 14 },
              { id: "sw", ax: -halfW - 14, ay: halfH + 14 },
            ];
            const positions = corners.map((c) => ({
              id: c.id,
              hx: boxCenter.x + c.ax * cos - c.ay * sin,
              hy: boxCenter.y + c.ax * sin + c.ay * cos,
            }));
            const primary = positions[0];

            return (
              <>
                {positions.map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    aria-label={`Rotate (${p.id})`}
                    tabIndex={atAngleBound ? -1 : 0}
                    data-testid={
                      p.id === "ne" ? "rule-rotate-handle" : `rule-rotate-handle-${p.id}`
                    }
                    data-at-bound={atAngleBound ? "true" : undefined}
                    aria-disabled={atAngleBound || undefined}
                    className="pointer-events-auto absolute z-40 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    style={{
                      left: p.hx,
                      top: p.hy,
                      cursor: atAngleBound ? "not-allowed" : "alias",
                      touchAction: "none",
                    }}
                    onPointerDown={onRotateDown}
                    onPointerMove={onRotateMove}
                    onPointerUp={onRotateUp}
                    onPointerCancel={onRotateUp}
                    onKeyDown={onRotateKeyDown}
                  >
                    {/* Plan 87 Step 10: outer 28x28 transparent hit target,
                      inner 20x20 visible pip. Visual footprint unchanged,
                      pointer/keyboard target now clears WCAG 2.5.5. */}
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-md transition group-hover:brightness-110 ${
                        atAngleBound ? "bg-destructive" : "bg-ca-select"
                      }`}
                    >
                      <RotateCw size={11} className="text-white" />
                    </span>
                  </div>
                ))}
                {isRotating ? (
                  <span
                    data-testid="rule-rotate-live-badge"
                    aria-live="polite"
                    data-at-bound={atAngleBound ? "true" : undefined}
                    className={`pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap rounded-sm border bg-popover/95 px-1.5 py-0.5 font-mono text-[13px] leading-none shadow-md tabular-nums backdrop-blur-sm ${
                      atAngleBound ? "text-destructive" : "text-foreground"
                    }`}
                    style={{
                      left: primary.hx,
                      top: primary.hy - 18,
                      borderColor: atAngleBound ? "hsl(var(--destructive))" : ringColor,
                    }}
                  >
                    θ {theta.toFixed(1)}°{atAngleBound ? " · limit" : ""}
                  </span>
                ) : theta !== 0 ? (
                  /* Plan 79 Step 35: persistent θ badge above the rotate
                     handle whenever the ROI is rotated. Same anchor as the
                     live drag chip so operators see one authoritative angle
                     readout in one place. Hidden at 0°. */
                  <span
                    data-testid="rule-rotation-badge"
                    className="pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap rounded-sm border bg-popover/95 px-1.5 py-0.5 font-mono text-[13px] font-medium leading-none text-foreground shadow-sm tabular-nums backdrop-blur-sm"
                    style={{
                      left: primary.hx,
                      top: primary.hy - 18,
                      borderColor: ringColor,
                    }}
                  >
                    θ {theta.toFixed(1)}°
                  </span>
                ) : null}
              </>
            );
          })()
        : null}
      {showHandles && tl && br && boxCenter
        ? (() => {
            // Resize grips must ride along with the rotated bounding
            // rectangle. Compute their axis-aligned position, then
            // rotate that offset around boxCenter by theta so grips
            // stay glued to the visual edges/corners regardless of the
            // current rotation. Cursor angles are also offset by theta
            // so a rotated N-edge shows an N-oriented cursor.
            const rad = (theta * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            // Derive the cursor per-handle from the handle's own
            // resize-axis in image space, then rotate that axis by
            // theta and snap to the nearest 45° cursor. Doing it
            // geometrically (from sx/sy) instead of via a base-cursor
            // lookup keeps every handle correct: edges point along
            // their outward normal, corners along the true diagonal,
            // and mirrored handles (e.g. nw/se) resolve identically
            // because cursors are undirected.
            const cursorForHandle = (sx: number, sy: number): string => {
              // Axis vector in image space, pre-rotation (E=+x, S=+y).
              const vx = sx - 0.5;
              const vy = sy - 0.5;

              if (vx === 0 && vy === 0) return "move";
              // Rotate by theta.
              const rx = vx * cos - vy * sin;
              const ry = vx * sin + vy * cos;
              // Angle in degrees, 0 = east, positive = clockwise
              // (screen y-down). Fold to [0,180) since cursors are
              // undirected, then snap to the nearest 45°.
              let deg = (Math.atan2(ry, rx) * 180) / Math.PI;
              deg = ((deg % 180) + 180) % 180;
              const snap = Math.round(deg / 45) % 4;
              switch (snap) {
                case 0:
                  return "ew-resize";
                case 1:
                  return "nwse-resize";
                case 2:
                  return "ns-resize";
                case 3:
                  return "nesw-resize";
                default:
                  return "ew-resize";
              }
            };

            return HANDLES.map((h) => {
              const ax = tl.x + (br.x - tl.x) * h.sx - boxCenter.x;
              const ay = tl.y + (br.y - tl.y) * h.sy - boxCenter.y;
              const x = boxCenter.x + ax * cos - ay * sin;
              const y = boxCenter.y + ax * sin + ay * cos;

              return (
                <div
                  key={h.id}
                  role="button"
                  aria-label={`Resize ${h.id}`}
                  tabIndex={0}
                  data-testid={`rule-resize-handle-${h.id}`}
                  className="pointer-events-auto absolute z-50 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  style={{
                    left: x,
                    top: y,
                    cursor: cursorForHandle(h.sx, h.sy),
                    touchAction: "none",
                  }}
                  onPointerDown={(e) => onHandleDown(e, h.id, { x, y })}
                  onPointerMove={onHandleMove}
                  onPointerUp={onHandleUp}
                  onPointerCancel={onHandleUp}
                  onKeyDown={(e) => onResizeKeyDown(e, h.id)}
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-sm border-2 border-white bg-ca-select shadow-md"
                  />
                </div>
              );
            });
          })()
        : null}
      {/* Plan 65 step 27: on-canvas quick actions floating above the selected
          shape (Figma-style). Duplicate copies the rule + its params via the
          existing `duplicate` action; delete is disabled while the rule is
          locked (the same guard that hides drag handles and blocks the
          context-menu delete). Only rendered for a single-selection to
          keep the affordance unambiguous. */}
      {rule && tl && br
        ? (() => {
            // Dock the quick-actions strip to the OUTSIDE-RIGHT edge of the ROI as
            // a vertical stack so it never collides with the X·Y / W×H / name-chip
            // stack sitting above the shape, or with the rotation handle sitting
            // above the top-right corner. Flip to outside-LEFT when the shape
            // hugs the right canvas edge so buttons never render off-canvas.
            const GAP = 8;
            const STRIP_W = 28; // one column of 24px buttons + padding
            let left = br.x + GAP;
            if (left + STRIP_W > canvasSize.width) {
              left = tl.x - GAP - STRIP_W;
            }
            const STRIP_H = 64; // rough height of two 24px buttons + padding
            // clamp left to stay on screen
            left = Math.max(8, Math.min(left, canvasSize.width - STRIP_W - 8));
            const top = Math.max(8, Math.min(tl.y, canvasSize.height - STRIP_H - 8));

            return (
              <div
                className="pointer-events-auto absolute z-40 flex flex-col items-center gap-1 rounded-md border border-ca-border bg-ca-panel-2/95 p-1 shadow-md backdrop-blur-sm"
                style={{ left, top }}
                onPointerDown={(e) => e.stopPropagation()}
                role="toolbar"
                aria-label={`Quick actions for ${rule.name}`}
                data-testid="rule-quick-actions"
              >
                <button
                  type="button"
                  aria-label={`Duplicate ${rule.name}`}
                  title="Duplicate (copies all properties)"
                  className="flex h-6 w-6 items-center justify-center rounded-sm text-ca-ink hover:bg-ca-panel"
                  onClick={() => onAction(rule.id, RuleActionKindType.Duplicate)}
                  data-testid="rule-quick-duplicate"
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  aria-label={
                    rule.isLocked ? `Cannot delete locked ${rule.name}` : `Delete ${rule.name}`
                  }
                  title={rule.isLocked ? "Unlock first (right-click, Unlock)" : "Delete"}
                  disabled={rule.isLocked}
                  className="flex h-6 w-6 items-center justify-center rounded-sm text-ca-ng hover:bg-ca-panel hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => onAction(rule.id, RuleActionKindType.Delete)}
                  data-testid="rule-quick-delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })()
        : null}
      {/* Floating properties HUD. Renders compact numeric inputs for the
          params that exist on the current rule (threshold, radius, ...)
          right next to the selection so operators can tune values while
          watching the canvas. Purely presentational; writes back via the
          existing `updateParams` store action. */}
      {rule && tl && br
        ? (() => {
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
          })()
        : null}
      {contextMenu && menuRule && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuElRef}
              role="menu"
              data-testid="rule-context-menu"
              className="pointer-events-auto fixed z-[9999] max-h-[85vh] min-w-[220px] max-w-[280px] overflow-y-auto rounded-md border border-ca-border bg-ca-panel-2 py-1 shadow-2xl text-hmi-body text-ca-ink"
              style={{
                left: menuPos?.left ?? contextMenu.x,
                top: menuPos?.top ?? contextMenu.y,
                visibility: menuPos ? "visible" : "hidden",
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="flex items-center justify-between gap-2 border-b border-ca-border px-3 py-1.5 text-hmi-caption text-ca-ink-muted">
                <span className="truncate">{menuRule.name}</span>
                <span
                  className="rounded-sm border border-ca-border px-1 py-0.5 font-mono text-[10px]"
                  title="Execution order"
                >
                  #{rules.findIndex((r) => r.id === menuRule.id) + 1}
                </span>
              </div>
              <div className="px-3 py-1.5">
                <div className="mb-1 text-hmi-caption text-ca-ink-muted">Change to</div>
                <div
                  className="flex items-center gap-1"
                  role="group"
                  aria-label="Change control type"
                >
                  {KIND_ORDER.map((k) => {
                    const Icon = KIND_ICON[k];
                    const isCurrent = k === menuRule.kind;

                    return (
                      <button
                        key={k}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isCurrent}
                        disabled={isCurrent || menuRule.isLocked}
                        title={editorKindLabel(k)}
                        aria-label={`Change to ${editorKindLabel(k)}`}
                        className="flex h-8 w-8 items-center justify-center rounded border border-ca-border bg-ca-panel hover:bg-ca-panel/60 disabled:cursor-not-allowed disabled:opacity-40 aria-checked:ring-2 aria-checked:ring-[var(--ca-select,#8b5cf6)]"
                        style={{ color: KIND_COLOR[k] }}
                        onClick={() => {
                          onChangeKind(menuRule.id, k);
                          onCloseContextMenu();
                        }}
                      >
                        <Icon size={14} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="my-1 border-t border-ca-border" />
              {onSetColor ? (
                <div className="px-3 py-1.5">
                  <div className="mb-1 flex items-center gap-1 text-hmi-caption text-ca-ink-muted">
                    <Palette size={12} /> Color
                  </div>
                  <div
                    role="group"
                    aria-label="Rule color"
                    className="flex flex-wrap items-center gap-1"
                  >
                    {COLOR_SWATCHES.map((c) => {
                      const current = (menuRule.params?.color as string | undefined) ?? null;
                      const isCurrent = current === c.value;

                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={isCurrent}
                          aria-label={c.label}
                          title={c.label}
                          onClick={() => {
                            onSetColor(menuRule.id, c.value);
                            onCloseContextMenu();
                          }}
                          className="h-5 w-5 rounded-full border border-ca-border aria-checked:ring-2 aria-checked:ring-[var(--ca-select,#8b5cf6)]"
                          style={{
                            background: c.value ?? "#22c55e",
                          }}
                        />
                      );
                    })}
                    <label
                      className="relative flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-ca-border ring-offset-1 hover:ring-1 hover:ring-[var(--ca-select,#8b5cf6)]"
                      title="Custom color"
                      aria-label="Pick a custom color"
                      style={{
                        background:
                          "conic-gradient(from 0deg,#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444)",
                      }}
                    >
                      <input
                        type="color"
                        value={(menuRule.params?.color as string | undefined) ?? "#22c55e"}
                        onChange={(e) => {
                          onSetColor(menuRule.id, e.currentTarget.value);
                        }}
                        onBlur={onCloseContextMenu}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label="Custom color hex value"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
              {onRotate ? (
                <>
                  <div className="my-1 border-t border-ca-border" />
                  <div className="px-3 py-1.5">
                    <div className="mb-1 flex items-center gap-1 text-hmi-caption text-ca-ink-muted">
                      <RotateCw size={12} /> Rotate
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-1"
                      role="group"
                      aria-label="Rotate"
                    >
                      {[0, 90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          disabled={menuRule.isLocked}
                          onClick={() => {
                            onRotate(menuRule.id, deg);
                            onCloseContextMenu();
                          }}
                          className="rounded border border-ca-border bg-ca-panel px-2 py-1 font-mono text-[11px] hover:bg-ca-panel/60 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deg}°
                        </button>
                      ))}
                      <button
                        type="button"
                        title="Rotate -15°"
                        disabled={menuRule.isLocked}
                        onClick={() => {
                          const curr = Number(menuRule.rotation ?? 0);
                          onRotate(menuRule.id, (((curr - 15) % 360) + 360) % 360);
                        }}
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded border border-ca-border bg-ca-panel hover:bg-ca-panel/60 disabled:opacity-40"
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        type="button"
                        title="Rotate +15°"
                        disabled={menuRule.isLocked}
                        onClick={() => {
                          const curr = Number(menuRule.rotation ?? 0);
                          onRotate(menuRule.id, (curr + 15) % 360);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded border border-ca-border bg-ca-panel hover:bg-ca-panel/60 disabled:opacity-40"
                      >
                        <RotateCw size={12} />
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
              <MenuSection label="Edit">
                <MenuItem
                  icon={<Pencil size={14} />}
                  label="Rename"
                  shortcut="F2"
                  disabled={menuRule.isLocked}
                  onClick={() => {
                    onAction(menuRule.id, RuleActionKindType.Rename);
                    onCloseContextMenu();
                  }}
                />
                <MenuItem
                  icon={<Copy size={14} />}
                  label="Duplicate"
                  shortcut="Ctrl+D"
                  onClick={() => {
                    onAction(menuRule.id, RuleActionKindType.Duplicate);
                    onCloseContextMenu();
                  }}
                />
              </MenuSection>
              <MenuSection label="Run order">
                <RunOrderQuickBar
                  currentIndex={rules.findIndex((r) => r.id === menuRule.id)}
                  total={rules.length}
                  disabled={menuRule.isLocked}
                  onJump={(zeroIdx) => {
                    onAction(menuRule.id, RuleActionKindType.Movetoindex, zeroIdx);
                    onCloseContextMenu();
                  }}
                  onStep={(dir) => {
                    onAction(
                      menuRule.id,
                      dir === -1 ? RuleActionKindType.Moveup : RuleActionKindType.Movedown,
                    );
                  }}
                  onEdge={(edge) => {
                    onAction(
                      menuRule.id,
                      edge === RunOrderQuickBarEdgeType.Start
                        ? RuleActionKindType.Sendtoback
                        : RuleActionKindType.Bringtofront,
                    );
                    onCloseContextMenu();
                  }}
                />
                <MenuItem
                  icon={<ArrowUpToLine size={14} />}
                  label="Bring to Front"
                  shortcut="Ctrl+Shift+]"
                  disabled={menuRule.isLocked}
                  onClick={() => {
                    onAction(menuRule.id, RuleActionKindType.Bringtofront);
                    onCloseContextMenu();
                  }}
                />
                <MenuItem
                  icon={<ArrowUp size={14} />}
                  label="Bring Forward"
                  shortcut="Ctrl+]"
                  disabled={menuRule.isLocked}
                  onClick={() => {
                    onAction(menuRule.id, RuleActionKindType.Moveup);
                    onCloseContextMenu();
                  }}
                />
                <MenuItem
                  icon={<ArrowDown size={14} />}
                  label="Send Backward"
                  shortcut="Ctrl+["
                  disabled={menuRule.isLocked}
                  onClick={() => {
                    onAction(menuRule.id, RuleActionKindType.Movedown);
                    onCloseContextMenu();
                  }}
                />
                <MenuItem
                  icon={<ArrowDownToLine size={14} />}
                  label="Send to Back"
                  shortcut="Ctrl+Shift+["
                  disabled={menuRule.isLocked}
                  onClick={() => {
                    onAction(menuRule.id, RuleActionKindType.Sendtoback);
                    onCloseContextMenu();
                  }}
                />
              </MenuSection>
              <MenuSection label="State">
                <MenuItem
                  icon={menuRule.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                  label={menuRule.isLocked ? "Unlock" : "Lock"}
                  shortcut="L"
                  onClick={() => {
                    onAction(menuRule.id, RuleActionKindType.Togglelock);
                    onCloseContextMenu();
                  }}
                />
                <MenuItem
                  icon={menuRule.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  label={menuRule.isHidden ? "Show" : "Hide"}
                  shortcut="H"
                  onClick={() => {
                    onAction(menuRule.id, RuleActionKindType.Togglehidden);
                    onCloseContextMenu();
                  }}
                />
                <MenuItem
                  icon={<GroupIcon size={14} />}
                  label="Copy ID"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      void navigator.clipboard.writeText(menuRule.id);
                    }

                    onCloseContextMenu();
                  }}
                />
              </MenuSection>
              <MenuSection label="Danger zone" tone="danger">
                <MenuItem
                  icon={<Trash2 size={14} />}
                  label="Delete"
                  shortcut="Del"
                  danger
                  disabled={menuRule.isLocked}
                  disabledHint={menuRule.isLocked ? "Unlock to delete" : undefined}
                  onClick={() => {
                    onAction(menuRule.id, RuleActionKindType.Delete);
                    onCloseContextMenu();
                  }}
                />
              </MenuSection>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}


