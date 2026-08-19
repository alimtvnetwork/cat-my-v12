import { ClientLogger } from "@/lib/observability/client-logger";
import { CanvasViewportPresetType, fallbackSize } from "./CanvasViewportConstants";
import type { PanGesture } from "./CanvasViewportUtils";
import { EditorPreviewModeType } from "@/lib/editor/preview-mode-store";
import { useEffect, useMemo, useRef, useState } from "react";
import { IMAGE_BOUNDS, applyWheel, clampPan, coverView, screenToImage } from "@/lib/editor/coords";
import { logger } from "@/lib/editor/errors";
import { hitTest } from "@/lib/editor/hit-test";
import { attachPointerDispatcher, type PointerIntent } from "@/lib/editor/pointer/dispatcher";
import {
  isMarqueeEngaged,
  marqueeFromPoints,
  ruleIdsInMarquee,
  type MarqueeRect,
} from "@/lib/editor/marquee";
import { snapRect } from "@/lib/editor/snap";
import { computeGroupMoveAlignment, mergeGuides, type AlignGuide } from "@/lib/editor/align";
import { AlignmentGuides } from "./AlignmentGuides";
import { CanvasBaseLayer } from "./CanvasBaseLayer";
import { CanvasRoiLayer } from "./CanvasRoiLayer";
import { CanvasResultLayer } from "./CanvasResultLayer";
import {
  DEFAULT_ALIGN_TOLERANCE_PX,
  MAX_ALIGN_TOLERANCE_PX,
  MIN_ALIGN_TOLERANCE_PX,
} from "@/lib/editor/snap";
import {
  getSnapState,
  setSnapEnabled,
  setSnapAlignTolerance,
  setSnapDebug,
  setSnapShowGuides,
  useSnap,
} from "@/lib/editor/snap-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { renderFrame } from "@/lib/editor/render/frame";
import {
  commitRuleGesture,
  editorKindLabel,
  gestureToPendingShape,
  startRuleGesture,
  updateRuleGesture,
  type EditorGesture,
} from "@/lib/editor/tools";
import type {
  CanvasSize,
  EditorPoint,
  EditorRule,
  EditorRuleKind,
  PendingShape,
  RenderState,
  Viewport,
} from "@/lib/editor/types";
import { SelectionOverlay, type RuleActionKind } from "./SelectionOverlay";
import { ValidationHighlightOverlay } from "./ValidationHighlightOverlay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { __LAYER_DND_MIME__ } from "@/hooks/editor/useLayerDnd";
import { DEFAULT_SAMPLE_ID } from "@/lib/editor/sample-library";
import { useSampleLibrary } from "@/lib/editor/useSampleLibrary";
import { setReferenceImage } from "@/lib/stores/reference-image-store";
import { openCameraStream } from "@/lib/camera/live-capture";
import { captureFrameFromStream } from "@/lib/camera/capture-frame";
import { useKeyboardDnd } from "@/lib/editor/dnd/keyboard-controller";
import {
  getPreviewState,
  setPreviewMode,
  setPeekAll,
  subscribe as subscribePreview,
  hydrateFromStorage as hydratePreviewFromStorage,
  type EditorPreviewMode,
} from "@/lib/editor/preview-mode-store";
import { readConditions } from "@/components/editor/panels/AcceptancePanel";
import { AppEvent } from "@/lib/constants";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

interface CanvasViewportProps {
  rules: EditorRule[];
  selectedIds: string[];
  activeKind: EditorRuleKind;
  onCreateRule: (rule: EditorRule) => void;
  onSelectRule: (id: string, source: "canvas-hit") => void;
  onClearSelection?: () => void;
  onMoveRule?: (
    id: string,
    rect: { x: number; y: number; width: number; height: number },
    bounds: typeof IMAGE_BOUNDS,
  ) => void;
  onRuleAction?: (id: string, action: RuleActionKind, payload?: number) => void;
  onChangeRuleKind?: (id: string, kind: EditorRuleKind) => void;
  onSetRuleColor?: (id: string, color: string | null) => void;
  /**
   * Plan 79 step 36: persist rotation from the SelectionOverlay handle
   * onto the rule (`rotation` field). Optional so legacy hosts that
   * do not care about rotation keep working; the overlay falls back to
   * local state when this is omitted.
   */
  onRotateRule?: (id: string, degrees: number) => void;
  /**
   * Plan 79 step 38b: marquee multiselect commit. Fires on `tool-end`
   * after a Shift+drag on empty canvas produced an engaged marquee.
   * Optional so legacy hosts fall back to per-click selection.
   */
  onSelectMany?: (ids: string[], source: "canvas-marquee") => void;
}

interface ShapeDrag {
  id: string;
  start: EditorPoint;
  origin: { x: number; y: number; width: number; height: number };
  /**
   * Multi-select group drag: when the hit belongs to a selection of >1
   * unlocked rules, we translate every member by the same delta and run
   * smart-align against the group. `undefined` for a solo drag.
   */
  members?: ReadonlyArray<{
    id: string;
    origin: { x: number; y: number; width: number; height: number };
  }>;
}

export function CanvasViewport({
  rules,
  selectedIds,
  activeKind,
  onCreateRule,
  onSelectRule,
  onClearSelection,
  onMoveRule,
  onRuleAction,
  onChangeRuleKind,
  onSetRuleColor,
  onRotateRule,
  onSelectMany,
}: CanvasViewportProps): React.JSX.Element | null {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; ruleId: string } | null>(
    null,
  );
  const rulesRef = useRef(rules);
  const selectedIdsRef = useRef(selectedIds);
  const activeKindRef = useRef(activeKind);
  const createRef = useRef(onCreateRule);
  const selectRef = useRef(onSelectRule);
  const moveRef = useRef(onMoveRule);
  const gestureRef = useRef<EditorGesture | null>(null);
  const panRef = useRef<PanGesture | null>(null);
  const dragRef = useRef<ShapeDrag | null>(null);
  // Smart-align guides rendered during a group (multi-select) move.
  // Solo drags reuse SelectionOverlay's own guide state; multi-select
  // has no overlay (SelectionOverlay only shows for length===1) so we
  // render them here.
  const [groupAlignGuides, setGroupAlignGuides] = useState<AlignGuide[]>([]);
  // Plan 79 step 38b: marquee gesture state. `originImage` is the image-
  // space anchor, `rect` is the live normalised rect used both for the
  // overlay and the final intersection test.
  const marqueeRef = useRef<{ originImage: EditorPoint } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const selectManyRef = useRef(onSelectMany);
  selectManyRef.current = onSelectMany;
  const readyRef = useRef(false);
  const measuredRef = useRef(false);
  // Plan 79 step 39b: reactive snap state for the HUD pill. The gesture
  // path uses getSnapState() directly (no re-render dependency), but the
  // toggle button needs to reflect the current value.
  const snap = useSnap();
  const manualViewportRef = useRef(false);
  const rejectionTimesRef = useRef<number[]>([]);
  const zoomTimerRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState(fallbackSize);
  const [viewport, setViewport] = useState(() => coverView(IMAGE_BOUNDS, fallbackSize));
  const [pendingShape, setPendingShape] = useState<PendingShape | null>(null);
  const canvasSizeRef = useRef(canvasSize);
  const viewportRef = useRef(viewport);
  const [pointerCoords, setPointerCoords] = useState<{ x: number; y: number } | null>(null);
  const keyboardDnd = useKeyboardDnd();
  const [spotlight, setSpotlight] = useState<boolean>(true);
  const [previewMode, setPreviewModeState] = useState<EditorPreviewMode>(
    () => getPreviewState().mode,
  );
  const [peekAll, setPeekAllState] = useState<boolean>(() => getPreviewState().peekAll);
  const [debugOverlay, setDebugOverlayState] = useState<boolean>(
    () => getPreviewState().debugOverlay,
  );
  useEffect(() => {
    // Hydrate persisted preview mode/debug flag AFTER first render so the
    // client's initial paint matches the SSR HTML (defaults). See
    // preview-mode-store.ts note. This fixes the "Preview: all" vs
    // "Preview: selection" hydration mismatch on the canvas zoom button.
    hydratePreviewFromStorage();

    return subscribePreview((s) => {
      setPreviewModeState(s.mode);
      setPeekAllState(s.peekAll);
      setDebugOverlayState(s.debugOverlay);
    });
  }, []);
  const applyPreviewMode = (mode: EditorPreviewMode) => setPreviewMode(mode);
  const SPOTLIGHT_STORAGE_KEY = "editor.spotlight.v1";
  const SPOTLIGHT_DEFAULTS = { dim: 0.55, blurPx: 6, isolate: false } as const;
  const readSpotlightPrefs = () => {
    if (typeof window === "undefined") return SPOTLIGHT_DEFAULTS;
    try {
      const raw = window.localStorage.getItem(SPOTLIGHT_STORAGE_KEY);

      if (!raw) return SPOTLIGHT_DEFAULTS;
      const parsed = JSON.parse(raw) as Partial<typeof SPOTLIGHT_DEFAULTS>;

      return {
        dim:
          typeof parsed.dim === "number"
            ? Math.max(0, Math.min(1, parsed.dim))
            : SPOTLIGHT_DEFAULTS.dim,
        blurPx:
          typeof parsed.blurPx === "number"
            ? Math.max(0, Math.min(16, parsed.blurPx))
            : SPOTLIGHT_DEFAULTS.blurPx,
        isolate: typeof parsed.isolate === "boolean" ? parsed.isolate : SPOTLIGHT_DEFAULTS.isolate,
      };
    } catch {
      return SPOTLIGHT_DEFAULTS;
    }
  };
  // SSR-safe: seed with defaults so first client render matches server HTML,
  // then hydrate persisted spotlight prefs after mount (see note on
  // hydratePreviewFromStorage above).
  const [focusDim, setFocusDim] = useState<number>(SPOTLIGHT_DEFAULTS.dim);
  const [focusBlur, setFocusBlur] = useState<number>(SPOTLIGHT_DEFAULTS.blurPx);
  const [focusIsolate, setFocusIsolate] = useState<boolean>(SPOTLIGHT_DEFAULTS.isolate);
  const [spotlightHydrated, setSpotlightHydrated] = useState<boolean>(false);
  useEffect(() => {
    const p = readSpotlightPrefs();
    setFocusDim(p.dim);
    setFocusBlur(p.blurPx);
    setFocusIsolate(p.isolate);
    setSpotlightHydrated(true);
    // readSpotlightPrefs is module-scoped and stable; hydrate once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [focusSettingsOpen, setFocusSettingsOpen] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(true);

  // Persist spotlight prefs across sessions.
  useEffect(() => {
    if (typeof window === "undefined" || !spotlightHydrated) return;
    try {
      window.localStorage.setItem(
        SPOTLIGHT_STORAGE_KEY,
        JSON.stringify({ dim: focusDim, blurPx: focusBlur, isolate: focusIsolate }),
      );
    } catch {
      /* ignore quota / private mode */
    }
  }, [focusDim, focusBlur, focusIsolate, spotlightHydrated]);

  const applySpotlightPreset = (preset: CanvasViewportPresetType) => {
    if (preset === CanvasViewportPresetType.Subtle) {
      setFocusDim(0.3);
      setFocusBlur(3);
      setFocusIsolate(false);
    } else if (preset === CanvasViewportPresetType.Standard) {
      setFocusDim(0.55);
      setFocusBlur(6);
      setFocusIsolate(false);
    } else {
      setFocusDim(0.75);
      setFocusBlur(12);
      setFocusIsolate(false);
    }
  };
  const resetSpotlight = () => {
    setFocusDim(SPOTLIGHT_DEFAULTS.dim);
    setFocusBlur(SPOTLIGHT_DEFAULTS.blurPx);
    setFocusIsolate(SPOTLIGHT_DEFAULTS.isolate);
  };
  const [showThresholds, setShowThresholds] = useState<boolean>(true);
  const [sampleId, setSampleId] = useState<string>(DEFAULT_SAMPLE_ID);
  const { library: sampleLibrary } = useSampleLibrary();
  const [customSample, setCustomSample] = useState<{
    id: string;
    label: string;
    url: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentSample = useMemo(
    () =>
      customSample && sampleId === customSample.id
        ? { id: customSample.id, label: customSample.label, url: customSample.url }
        : (sampleLibrary.find((sample) => sample.id === sampleId) ?? sampleLibrary[0]),
    [sampleId, sampleLibrary, customSample],
  );
  const clearSelectionRef = useRef(onClearSelection);
  clearSelectionRef.current = onClearSelection;

  // Spotlight transition state. `focusAlphasRef` holds the current
  // per-rule reveal alpha (0..1); `focusProgressRef` holds the global
  // blur/dim ramp. A single rAF loop tweens these toward their targets
  // whenever the selection or spotlight toggle changes so the ROI swap
  // is fluid instead of snapping.
  const focusAlphasRef = useRef<Record<string, number>>({});
  const focusProgressRef = useRef<number>(0);
  const focusAnimRef = useRef<number | null>(null);
  const focusLastTsRef = useRef<number | null>(null);
  const FOCUS_TAU_MS = 140; // ~0.14s exponential settle, feels snappy but smooth

  // Persist which rule IDs were fully-focused ("crisp") so that returning
  // to one of them restores the crisp ROI reveal immediately, instead of
  // fading in from 0 every time. Kept in a ref for mutation stability and
  // mirrored to sessionStorage so navigating away and back to the preview
  // still snaps a previously-visited rule to crisp.
  const SPOTLIGHT_HISTORY_KEY = "editor.spotlight.crispHistory.v1";
  const focusCrispHistoryRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(SPOTLIGHT_HISTORY_KEY);

      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        focusCrispHistoryRef.current = new Set(
          parsed.filter((x): x is string => typeof x === "string"),
        );
      }
    } catch {
      /* ignore */
    }
  }, []);
  const persistCrispHistory = () => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        SPOTLIGHT_HISTORY_KEY,
        JSON.stringify(Array.from(focusCrispHistoryRef.current)),
      );
    } catch {
      /* ignore */
    }
  };

  const applySample = (id: string) => {
    setSampleId(id);

    if (customSample && id === customSample.id) {
      setReferenceImage(customSample.url);

      return;
    }

    const s = sampleLibrary.find((x) => x.id === id);

    if (!s) return;
    setReferenceImage(s.url);
  };

  const applyCustomImage = (label: string, url: string) => {
    const id = `custom-${Date.now().toString(36)}`;
    setCustomSample({ id, label, url });
    setSampleId(id);
    setReferenceImage(url);
    logger.info("I_UI_SAMPLE_CUSTOM_APPLIED", { source: label });
  };

  const onUploadFile = (file: File) => {
    if (file.type.startsWith("image/") === false) {
      ClientLogger.warn("[canvas-sample] upload rejected: not an image", file.type);

      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : null;

      if (!url) return;
      applyCustomImage(`Uploaded: ${file.name}`, url);
    };
    reader.readAsDataURL(file);
  };

  const captureFromCamera = async () => {
    const result = await openCameraStream();

    if (result.ok === false) {
      ClientLogger.error("[canvas-sample] camera capture failed", result.error);

      return;
    }

    try {
      const frame = await captureFrameFromStream(result.stream.stream);
      applyCustomImage("Camera capture", frame.dataUrl);
    } catch (err) {
      ClientLogger.error("[canvas-sample] captureFrameFromStream threw", err);
    } finally {
      result.stream.close();
    }
  };

  // A rule is "absent-flavored" when the FIRST (primary) acceptance
  // condition marks the target as `presence === "absent"`. The worker
  // evaluates the acceptance list in order and reorderable UI lets the
  // operator pick which condition is primary, so the visual mode
  // (warning cross vs crisp reveal) must follow the same ordering the
  // worker will use. A rule with `[present, absent]` shows crisp; move
  // `absent` to the top and it flips to the cross overlay.
  const absentRuleIds = useMemo<string[]>(() => {
    const out: string[] = [];
    for (const rule of rules) {
      const conditions = readConditions(rule);

      if (conditions.length > 0 && conditions[0].presence === "absent") {
        out.push(rule.id);
      }
    }

    return out;
  }, [rules]);

  // Kick a rAF-driven tween whenever selection / spotlight / preview mode
  // change. The loop keeps running until every alpha (and the global
  // progress) is within epsilon of its target, then stops until the next
  // change.
  useEffect(() => {
    // Resolve which rule ids should be crisp given the current preview
    // mode. `peekAll` and mode="off" both blank the target set so the
    // canvas becomes fully crisp again.
    const previewOn = spotlight && !peekAll;
    const focusIds: string[] = (() => {
      if (!previewOn) return [];

      if (previewMode === "off") return [];

      if (previewMode === "all-rules") {
        return rules.filter((r) => !r.isHidden).map((r) => r.id);
      }

      return selectedIds.slice();
    })();
    const targetProgress = focusIds.length > 0 ? 1 : 0;
    const targetAlphas: Record<string, number> = {};
    for (const id of focusIds) {
      targetAlphas[id] = 1;
      // Pre-seed the current alpha from crisp history so a previously
      // focused rule snaps back to a fully revealed ROI instead of
      // fading in from 0. New rules still animate in from 0.
      if (focusCrispHistoryRef.current.has(id) && (focusAlphasRef.current[id] ?? 0) < 1) {
        focusAlphasRef.current[id] = 1;
      }
    }
    // Ensure previously-focused rules are represented (target 0) so they
    // fade out rather than pop off.
    for (const id of Object.keys(focusAlphasRef.current)) {
      if (!(id in targetAlphas)) targetAlphas[id] = 0;
    }

    const step = (ts: number) => {
      const prev = focusLastTsRef.current;
      focusLastTsRef.current = ts;
      const dt = prev === null ? 16 : Math.min(64, ts - prev);
      // Exponential smoothing toward target: alpha += (target-alpha)*k
      const k = 1 - Math.exp(-dt / FOCUS_TAU_MS);
      const eps = 0.0025;
      let isSettled = true;

      const nextProgress =
        focusProgressRef.current + (targetProgress - focusProgressRef.current) * k;
      focusProgressRef.current = nextProgress;

      if (Math.abs(nextProgress - targetProgress) > eps) isSettled = false;

      const nextAlphas: Record<string, number> = {};
      for (const id of Object.keys(targetAlphas)) {
        const cur = focusAlphasRef.current[id] ?? 0;
        const tgt = targetAlphas[id];
        const next = cur + (tgt - cur) * k;

        if (tgt === 0 && next < eps) {
          // fully faded out; drop from the map
          continue;
        }

        nextAlphas[id] = next;

        if (Math.abs(next - tgt) > eps) isSettled = false;
      }

      focusAlphasRef.current = nextAlphas;

      // Redraw with the tweened values. Read live refs so we don't
      // capture stale rules/viewport across frames.
      draw(
        ref.current,
        canvasSizeRef.current,
        rulesRef.current,
        selectedIdsRef.current,
        pendingShape,
        viewportRef.current,
        readyRef,
        spotlight,
        { dim: focusDim, blurPx: focusBlur, isolate: focusIsolate },
        showThresholds,
        focusAlphasRef.current,
        focusProgressRef.current,
        previewMode,
        peekAll,
        absentRuleIds,
        debugOverlay,
      );

      if (!isSettled) {
        focusAnimRef.current = window.requestAnimationFrame(step);
      } else {
        // Snap to exact targets to avoid lingering sub-epsilon drift.
        focusProgressRef.current = targetProgress;
        const finalAlphas: Record<string, number> = {};
        for (const id of Object.keys(targetAlphas)) {
          if (targetAlphas[id] > 0) finalAlphas[id] = targetAlphas[id];
        }

        focusAlphasRef.current = finalAlphas;
        focusAnimRef.current = null;
        focusLastTsRef.current = null;
        // Record every crisp rule so the next re-select is instant.
        let hasHistoryChanged = false;
        for (const [id, alpha] of Object.entries(finalAlphas)) {
          if (alpha >= 1 - 0.0025 && focusCrispHistoryRef.current.has(id) === false) {
            focusCrispHistoryRef.current.add(id);
            hasHistoryChanged = true;
          }
        }
        // Prune ids that no longer exist among current rules so the
        // history does not grow unbounded across sessions.
        const liveIds = new Set(rulesRef.current.map((r) => r.id));
        for (const id of Array.from(focusCrispHistoryRef.current)) {
          if (liveIds.has(id) === false) {
            focusCrispHistoryRef.current.delete(id);
            hasHistoryChanged = true;
          }
        }

        if (hasHistoryChanged) persistCrispHistory();
      }
    };

    if (focusAnimRef.current !== null) window.cancelAnimationFrame(focusAnimRef.current);
    focusLastTsRef.current = null;
    focusAnimRef.current = window.requestAnimationFrame(step);

    return () => {
      if (focusAnimRef.current !== null) {
        window.cancelAnimationFrame(focusAnimRef.current);
        focusAnimRef.current = null;
      }

      focusLastTsRef.current = null;
    };
    // Only re-run when the target changes; other visual props are handled
    // by the plain draw effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, spotlight, previewMode, peekAll, rules]);

  useEffect(() => {
    rulesRef.current = rules;
    selectedIdsRef.current = selectedIds;
    activeKindRef.current = activeKind;
    createRef.current = onCreateRule;
    selectRef.current = onSelectRule;
    moveRef.current = onMoveRule;
    canvasSizeRef.current = canvasSize;
    viewportRef.current = viewport;
  }, [
    activeKind,
    canvasSize,
    onCreateRule,
    onMoveRule,
    onSelectRule,
    rules,
    selectedIds,
    viewport,
  ]);

  useEffect(
    () =>
      draw(
        ref.current,
        canvasSize,
        rules,
        selectedIds,
        pendingShape,
        viewport,
        readyRef,
        spotlight,
        { dim: focusDim, blurPx: focusBlur, isolate: focusIsolate },
        showThresholds,
        focusAlphasRef.current,
        focusProgressRef.current,
        previewMode,
        peekAll,
        absentRuleIds,
        debugOverlay,
      ),
    [
      canvasSize,
      rules,
      selectedIds,
      pendingShape,
      viewport,
      spotlight,
      focusDim,
      focusBlur,
      focusIsolate,
      showThresholds,
      previewMode,
      peekAll,
      absentRuleIds,
      debugOverlay,
    ],
  );

  useEffect(() => {
    const canvas = ref.current;

    if (canvas === null) return;
    const measure = () => {
      const bounds = canvas.getBoundingClientRect();
      const next = {
        width: Math.max(1, Math.round(bounds.width)),
        height: Math.max(1, Math.round(bounds.height)),
      };
      setCanvasSize((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      );

      if (!measuredRef.current || !manualViewportRef.current) {
        measuredRef.current = true;
        const fitted = coverView(IMAGE_BOUNDS, next);
        viewportRef.current = fitted;
        setViewport(fitted);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  // handleIntent is a hoisted function inside this component and thus
  // recreated every render. Route pointer intents through a ref-of-latest
  // so the mount-only effect stays honest without going stale.
  const handleIntentRef = useRef(handleIntent);
  handleIntentRef.current = handleIntent;
  useEffect(() => {
    const canvas = ref.current;

    if (canvas === null) {
      logger.error("E_UI_CANVAS_MOUNT_MISSING", { component: "CanvasViewport" });

      return;
    }

    const detach = attachPointerDispatcher(canvas, {
      getViewport: () => viewportRef.current,
      getActiveTool: () => activeKindRef.current,
      getDpr: () => window.devicePixelRatio || 1,
      onIntent: (intent) => handleIntentRef.current(intent),
    });
    const onRef = () => setViewport((v) => ({ ...v }));
    canvas.addEventListener(AppEvent.EditorReferenceReady, onRef);

    return () => {
      if (zoomTimerRef.current !== null) window.clearTimeout(zoomTimerRef.current);
      canvas.removeEventListener(AppEvent.EditorReferenceReady, onRef);
      detach();
    };
  }, []);

  return (
    <div className="editor-canvas-wrap relative" ref={wrapRef}>
      <span id="canvas-instructions" className="sr-only">
        Inspection canvas. Arrow keys pan the view. Plus and minus keys zoom in and out. Escape
        cancels the current drawing gesture. Right click a shape for more actions.
      </span>
      <CanvasBaseLayer
        ref={ref}
        role="application"
        aria-label="Inspection canvas"
        aria-describedby="canvas-instructions"
        data-testid="inspection-canvas"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      />
      <CanvasRoiLayer rules={rules} viewport={viewport}>
        <SelectionOverlay
          rules={rules}
          selectedIds={selectedIds}
          viewport={viewport}
          canvasSize={canvasSize}
          contextMenu={contextMenu}
          onCloseContextMenu={() => setContextMenu(null)}
          onResize={(id, rect) => {
            if (moveRef.current) moveRef.current(id, rect, IMAGE_BOUNDS);
          }}
          onAction={(id, action, payload) => {
            if (onRuleAction) onRuleAction(id, action, payload);
          }}
          onChangeKind={(id, kind) => {
            if (onChangeRuleKind) onChangeRuleKind(id, kind);
          }}
          onSetColor={onSetRuleColor ? (id, color) => onSetRuleColor(id, color) : undefined}
          onRotate={onRotateRule ? (id, deg) => onRotateRule(id, deg) : undefined}
        />
        <AlignmentGuides guides={groupAlignGuides} viewport={viewport} canvasSize={canvasSize} />
        {marqueeRect !== null ? (
          <div
            data-testid="canvas-marquee"
            aria-hidden="true"
            className="pointer-events-none absolute rounded-[2px] border border-dashed border-ca-focus bg-ca-focus/10"
            style={{
              left: viewport.panX + marqueeRect.x * viewport.zoom,
              top: viewport.panY + marqueeRect.y * viewport.zoom,
              width: Math.max(1, marqueeRect.width * viewport.zoom),
              height: Math.max(1, marqueeRect.height * viewport.zoom),
            }}
          />
        ) : null}
      </CanvasRoiLayer>
      <CanvasResultLayer visible={showResults}>
        <ValidationHighlightOverlay rules={rules} viewport={viewport} canvasSize={canvasSize} />
      </CanvasResultLayer>
      <div className="editor-canvas-hud" aria-live="polite">
        <span>{editorKindLabel(activeKind)}</span>
        <span className="editor-canvas-hud-secondary">Selected {selectedIds.length}</span>
        {keyboardDnd.activeRect ? (
          <span
            className="editor-canvas-hud-secondary tabular-nums"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {Math.round(keyboardDnd.activeRect.x)}, {Math.round(keyboardDnd.activeRect.y)}
          </span>
        ) : pointerCoords ? (
          <span
            className="editor-canvas-hud-secondary tabular-nums"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {Math.round(pointerCoords.x)}, {Math.round(pointerCoords.y)}
          </span>
        ) : null}
      </div>
      <div className="editor-canvas-hud editor-canvas-zoom">
        <button
          type="button"
          onClick={() => stepZoom(-100)}
          className="editor-canvas-zoom-btn"
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="editor-canvas-zoom-btn editor-canvas-zoom-reset"
          aria-label="Reset zoom to 100%"
          title="Reset zoom to 100% (fit view)"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => stepZoom(100)}
          className="editor-canvas-zoom-btn"
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setSnapEnabled(!snap.enabled)}
          className="editor-canvas-zoom-btn"
          aria-pressed={snap.enabled}
          aria-label={snap.enabled ? "Snap to grid: on" : "Snap to grid: off"}
          title={`Snap to grid (Ctrl/Cmd+;) - ${snap.enabled ? "on" : "off"}, ${snap.gridPx}px`}
          data-testid="canvas-snap-toggle"
          style={{
            color: snap.enabled ? "var(--hmi-color-accent, currentColor)" : undefined,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {snap.enabled ? `⋮⋮ ${snap.gridPx}` : "⋮⋮"}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="editor-canvas-zoom-btn"
              aria-label={`Alignment snap threshold: ${snap.alignTolerancePx ?? DEFAULT_ALIGN_TOLERANCE_PX}px`}
              title={`Alignment snap threshold: ${snap.alignTolerancePx ?? DEFAULT_ALIGN_TOLERANCE_PX}px (screen)`}
              data-testid="canvas-snap-threshold-trigger"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {`◎ ${snap.alignTolerancePx ?? DEFAULT_ALIGN_TOLERANCE_PX}px`}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-64 space-y-2"
            data-testid="canvas-snap-threshold-popover"
          >
            <div className="flex items-baseline justify-between">
              <label htmlFor="canvas-snap-threshold-slider" className="text-xs font-medium">
                Snap threshold
              </label>
              <span
                className="text-xs text-muted-foreground"
                style={{ fontVariantNumeric: "tabular-nums" }}
                data-testid="canvas-snap-threshold-value"
              >
                {snap.alignTolerancePx ?? DEFAULT_ALIGN_TOLERANCE_PX}px
              </span>
            </div>
            <Slider
              id="canvas-snap-threshold-slider"
              data-testid="canvas-snap-threshold-slider"
              min={MIN_ALIGN_TOLERANCE_PX}
              max={MAX_ALIGN_TOLERANCE_PX}
              step={1}
              value={[snap.alignTolerancePx ?? DEFAULT_ALIGN_TOLERANCE_PX]}
              onValueChange={(v) => setSnapAlignTolerance(v[0] ?? DEFAULT_ALIGN_TOLERANCE_PX)}
              aria-label="Snap threshold in screen pixels"
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Screen-space band around alignment guides. Higher values snap ROI edges more
              aggressively; lower values require finer aim.
            </p>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-1 py-1 text-xs hover:bg-muted/40">
              <span className="flex flex-col">
                <span className="font-medium">Show guides</span>
                <span className="text-[10px] text-muted-foreground">
                  Draw alignment lines while dragging or resizing.
                </span>
              </span>
              <input
                type="checkbox"
                checked={snap.showGuides !== false}
                onChange={(e) => setSnapShowGuides(e.currentTarget.checked)}
                data-testid="canvas-snap-show-guides-toggle"
                aria-label="Show alignment guides"
                className="h-3.5 w-3.5"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-1 py-1 text-xs hover:bg-muted/40">
              <span className="flex flex-col">
                <span className="font-medium">Debug overlay</span>
                <span className="text-[10px] text-muted-foreground">
                  Show snap distances and selected guides while dragging.
                </span>
              </span>
              <input
                type="checkbox"
                checked={!!snap.debug}
                onChange={(e) => setSnapDebug(e.currentTarget.checked)}
                data-testid="canvas-snap-debug-toggle"
                aria-label="Show snap debug overlay"
                className="h-3.5 w-3.5"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => setSnapAlignTolerance(DEFAULT_ALIGN_TOLERANCE_PX)}
                data-testid="canvas-snap-threshold-reset"
              >
                Reset to {DEFAULT_ALIGN_TOLERANCE_PX}px
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div
        className="editor-canvas-hud editor-canvas-sample"
        role="group"
        aria-label="Sample image"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="editor-canvas-zoom-btn editor-canvas-sample-trigger"
              aria-label={`Sample image: ${currentSample.label}`}
              title="Sample image"
            >
              <span className="editor-canvas-sample-name">{currentSample.label}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            className="editor-canvas-menu"
            data-testid="canvas-sample-menu"
          >
            <DropdownMenuRadioGroup value={sampleId} onValueChange={applySample}>
              {sampleLibrary.map((s) => (
                <DropdownMenuRadioItem key={s.id} value={s.id} className="editor-canvas-menu-item">
                  {s.label}
                </DropdownMenuRadioItem>
              ))}
              {customSample ? (
                <DropdownMenuRadioItem
                  key={customSample.id}
                  value={customSample.id}
                  className="editor-canvas-menu-item"
                >
                  {customSample.label}
                </DropdownMenuRadioItem>
              ) : null}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="editor-canvas-menu-item"
              onSelect={(e) => {
                e.preventDefault();
                fileInputRef.current?.click();
              }}
            >
              Upload image…
            </DropdownMenuItem>
            <DropdownMenuItem
              className="editor-canvas-menu-item"
              onSelect={(e) => {
                e.preventDefault();
                void captureFromCamera();
              }}
            >
              Take photo from camera…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];

            if (f) onUploadFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => {
            // Cycle preview mode: off -> selection -> all-rules -> off.
            // Also clear the peek override so the choice takes effect.
            const nextMode: EditorPreviewModeType =
              previewMode === EditorPreviewModeType.Off
                ? EditorPreviewModeType.Selection
                : previewMode === EditorPreviewModeType.Selection
                  ? EditorPreviewModeType.AllRules
                  : EditorPreviewModeType.Off;
            applyPreviewMode(nextMode);

            if (peekAll) setPeekAll(false);
          }}
          className="editor-canvas-zoom-btn"
          aria-pressed={previewMode !== "off"}
          title="Cycle preview: Off / Selection / All rules"
        >
          {peekAll
            ? "Peek"
            : previewMode === "off"
              ? "Off"
              : previewMode === "all-rules"
                ? "All"
                : "Sel"}
        </button>
        <button
          type="button"
          onClick={() => setFocusSettingsOpen((v) => !v)}
          className="editor-canvas-zoom-btn"
          aria-expanded={focusSettingsOpen}
          aria-label="Focus settings"
          title={`Spotlight settings (dim ${Math.round(focusDim * 100)}%, blur ${focusBlur}px${focusIsolate ? ", isolated" : ""})`}
        >
          {focusIsolate ? "Iso" : `${Math.round(focusDim * 100)} / ${focusBlur}`}
        </button>
        <button
          type="button"
          onClick={() => setShowThresholds((v) => !v)}
          className="editor-canvas-zoom-btn"
          aria-pressed={showThresholds}
          title="Show rule thresholds (min/max radius, edge, similarity)"
        >
          {showThresholds ? "T on" : "T off"}
        </button>
        <button
          type="button"
          onClick={() => setShowResults((v) => !v)}
          className="editor-canvas-zoom-btn"
          aria-pressed={showResults}
          title={showResults ? "Hide Results (PASS/FAIL)" : "Show Results (PASS/FAIL)"}
        >
          {showResults ? "👁️ On" : "👁️ Off"}
        </button>
        {focusSettingsOpen ? (
          <div className="editor-canvas-focus-popover" role="dialog" aria-label="Focus settings">
            <div className="editor-canvas-focus-modes" role="group" aria-label="Preview mode">
              <span className="editor-canvas-focus-modes-label">Preview</span>
              <div className="editor-canvas-focus-modes-btns">
                <button
                  type="button"
                  className={`editor-canvas-focus-mode-btn${previewMode === "off" ? " is-active" : ""}`}
                  aria-pressed={previewMode === "off"}
                  onClick={() => applyPreviewMode(EditorPreviewModeType.Off)}
                  title="No blur, entire image crisp"
                >
                  Off
                </button>
                <button
                  type="button"
                  className={`editor-canvas-focus-mode-btn${previewMode === "selection" ? " is-active" : ""}`}
                  aria-pressed={previewMode === "selection"}
                  onClick={() => applyPreviewMode(EditorPreviewModeType.Selection)}
                  title="Reveal only the selected rule"
                >
                  Selection
                </button>
                <button
                  type="button"
                  className={`editor-canvas-focus-mode-btn${previewMode === "all-rules" ? " is-active" : ""}`}
                  aria-pressed={previewMode === "all-rules"}
                  onClick={() => applyPreviewMode(EditorPreviewModeType.AllRules)}
                  title="Reveal every rule ROI, blur everything else"
                >
                  All rules
                </button>
              </div>
            </div>
            <label className="editor-canvas-focus-row">
              <input
                type="checkbox"
                checked={peekAll}
                onChange={(e) => setPeekAll(e.target.checked)}
              />
              <span>Peek full image (temporarily unblur)</span>
            </label>
            <div
              className="editor-canvas-focus-presets"
              role="group"
              aria-label="Spotlight presets"
            >
              <button
                type="button"
                className="editor-canvas-focus-preset-btn"
                onClick={() => applySpotlightPreset(CanvasViewportPresetType.Subtle)}
                title="Light dim, small blur"
              >
                Subtle
              </button>
              <button
                type="button"
                className="editor-canvas-focus-preset-btn"
                onClick={() => applySpotlightPreset(CanvasViewportPresetType.Standard)}
                title="Balanced dim and blur"
              >
                Standard
              </button>
              <button
                type="button"
                className="editor-canvas-focus-preset-btn"
                onClick={() => applySpotlightPreset(CanvasViewportPresetType.Strong)}
                title="Strong dim and blur"
              >
                Strong
              </button>
            </div>
            <label className="editor-canvas-focus-row">
              <span>Dim outside</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(focusDim * 100)}
                onChange={(e) =>
                  setFocusDim(Math.max(0, Math.min(100, Number(e.target.value))) / 100)
                }
                aria-label="Dim outside selection"
                disabled={focusIsolate}
              />
              <span className="editor-canvas-focus-value">{Math.round(focusDim * 100)}%</span>
            </label>
            <label className="editor-canvas-focus-row">
              <span>Blur outside</span>
              <input
                type="range"
                min={0}
                max={16}
                step={1}
                value={focusBlur}
                onChange={(e) => setFocusBlur(Math.max(0, Math.min(16, Number(e.target.value))))}
                aria-label="Blur outside selection"
                disabled={focusIsolate}
              />
              <span className="editor-canvas-focus-value">{focusBlur}px</span>
            </label>
            <label className="editor-canvas-focus-row">
              <input
                type="checkbox"
                checked={focusIsolate}
                onChange={(e) => setFocusIsolate(e.target.checked)}
              />
              <span>Isolate (hide everything outside)</span>
            </label>
            <div className="editor-canvas-focus-actions">
              <button
                type="button"
                className="editor-canvas-focus-reset-btn"
                onClick={resetSpotlight}
                title="Restore default dim and blur"
              >
                Reset
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  function stepZoom(deltaY: number): void {
    manualViewportRef.current = true;
    const size = canvasSizeRef.current;
    const vp = viewportRef.current;
    const center = { x: size.width / 2, y: size.height / 2 };
    // deltaY sign matches the wheel convention: negative = zoom in.
    const next = applyWheel(vp, deltaY, center, size, IMAGE_BOUNDS);
    viewportRef.current = next;
    setViewport(next);
    scheduleViewportLog(next);
  }

  function resetZoom(): void {
    manualViewportRef.current = false;
    const size = canvasSizeRef.current;
    const next = coverView(IMAGE_BOUNDS, size);
    viewportRef.current = next;
    setViewport(next);
    scheduleViewportLog(next);
  }

  function handleContextMenu(event: React.MouseEvent<HTMLCanvasElement>): void {
    event.preventDefault();
    const canvas = ref.current;

    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const image = screenToImage(screen, viewportRef.current);
    const hitId = hitTest(image, rulesRef.current);

    if (hitId === null) {
      setContextMenu(null);

      return;
    }

    selectRef.current(hitId, "canvas-hit");
    setContextMenu({ x: event.clientX, y: event.clientY, ruleId: hitId });
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLCanvasElement>): void {
    const canvas = ref.current;

    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const image = screenToImage(screen, viewportRef.current);
    const hitId = hitTest(image, rulesRef.current);

    if (hitId === null) {
      // Double-clicking the empty background toggles the "peek full image"
      // override so the operator can quickly see the raw reference without
      // changing their preview mode.
      event.preventDefault();
      setPeekAll(!peekAll);

      return;
    }

    event.preventDefault();
    selectRef.current(hitId, "canvas-hit");
    window.dispatchEvent(
      new CustomEvent(AppEvent.EditorOpenInspector, {
        detail: { ruleId: hitId, x: event.clientX, y: event.clientY },
      }),
    );
  }

  function handleCanvasDragOver(event: React.DragEvent<HTMLCanvasElement>): void {
    const types = event.dataTransfer.types;

    if (types && Array.from(types).includes(__LAYER_DND_MIME__)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "link";
    }
  }

  function handleCanvasDrop(event: React.DragEvent<HTMLCanvasElement>): void {
    const id =
      event.dataTransfer.getData(__LAYER_DND_MIME__) || event.dataTransfer.getData("text/plain");

    if (!id) return;
    event.preventDefault();
    manualViewportRef.current = true;
    const rule = rulesRef.current.find((r) => r.id === id);

    if (!rule) {
      logger.warn("W_UI_CANVAS_DROP_UNKNOWN_RULE", { ruleId: id });

      return;
    }

    const size = canvasSizeRef.current;
    const vp = viewportRef.current;
    const cx = rule.x + rule.width / 2;
    const cy = rule.y + rule.height / 2;
    const next = clampPan(
      { ...vp, panX: size.width / 2 - cx * vp.zoom, panY: size.height / 2 - cy * vp.zoom },
      IMAGE_BOUNDS,
      size,
    );
    viewportRef.current = next;
    setViewport(next);
    selectRef.current(id, "canvas-hit");
    logger.info("I_UI_CANVAS_DROP_FOCUS", {
      ruleId: id,
      zoom: next.zoom,
      panX: next.panX,
      panY: next.panY,
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>): void {
    const size = canvasSizeRef.current;
    const vp = viewportRef.current;
    const panStep = 40;

    if (KeyboardKeyType.isEscape(event.key)) {
      if (gestureRef.current !== null || panRef.current !== null || pendingShape !== null) {
        event.preventDefault();
        gestureRef.current = null;
        panRef.current = null;
        setPendingShape(null);
      }

      return;
    }

    if (KeyboardKeyType.isArrowKey(event.key)) {
      event.preventDefault();
      manualViewportRef.current = true;
      const dx = KeyboardKeyType.isArrowLeft(event.key)
        ? panStep
        : KeyboardKeyType.isArrowRight(event.key)
          ? -panStep
          : 0;
      const dy = KeyboardKeyType.isArrowUp(event.key)
        ? panStep
        : KeyboardKeyType.isArrowDown(event.key)
          ? -panStep
          : 0;
      const next = clampPan({ ...vp, panX: vp.panX + dx, panY: vp.panY + dy }, IMAGE_BOUNDS, size);
      viewportRef.current = next;
      setViewport(next);

      return;
    }

    if (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_") {
      event.preventDefault();
      manualViewportRef.current = true;
      const deltaY = event.key === "-" || event.key === "_" ? 100 : -100;
      const center = { x: size.width / 2, y: size.height / 2 };
      const next = applyWheel(vp, deltaY, center, size, IMAGE_BOUNDS);
      viewportRef.current = next;
      setViewport(next);
      scheduleViewportLog(next);
    }
  }

  // Re-run whenever intent flows through.
  function handleIntent(intent: PointerIntent): void {
    if ("image" in intent) {
      setPointerCoords({ x: intent.image.x, y: intent.image.y });
    } else if (intent.kind === "cancel") {
      setPointerCoords(null);
    }

    if (intent.kind === "hover") {
      // Reflect rotated-ROI hover on the canvas cursor so operators see
      // a "move" affordance anywhere inside the visible (rotated) body.
      // Resize grips render in SelectionOverlay and set their own cursor
      // (rotation-aware via cursorForHandle); we only handle body hover
      // here. Skip while an active gesture owns the pointer to avoid
      // flicker.
      const canvas = ref.current;

      if (
        canvas !== null &&
        gestureRef.current === null &&
        dragRef.current === null &&
        panRef.current === null
      ) {
        const hoverId = hitTest(intent.image, rulesRef.current);

        if (hoverId !== null) {
          const hit = rulesRef.current.find((r) => r.id === hoverId);
          canvas.style.cursor = hit && hit.isLocked ? "not-allowed" : "move";
        } else {
          canvas.style.cursor = "";
        }
      }

      return;
    }

    if (intent.kind === "pan-start") {
      manualViewportRef.current = true;
      panRef.current = { screen: intent.screen, viewport: viewportRef.current };

      return;
    }

    if (intent.kind === "pan-move") {
      const pan = panRef.current;

      if (pan === null) return;
      const next = clampPan(
        {
          ...pan.viewport,
          panX: pan.viewport.panX + intent.screen.x - pan.screen.x,
          panY: pan.viewport.panY + intent.screen.y - pan.screen.y,
        },
        IMAGE_BOUNDS,
        canvasSizeRef.current,
      );
      viewportRef.current = next;
      setViewport(next);

      return;
    }

    if (intent.kind === "pan-end") {
      panRef.current = null;
      logger.info("I_UI_VIEWPORT_CHANGED", {
        source: "pan",
        zoom: viewportRef.current.zoom,
        panX: viewportRef.current.panX,
        panY: viewportRef.current.panY,
      });

      return;
    }

    if (intent.kind === "zoom") {
      manualViewportRef.current = true;
      const next = applyWheel(
        viewportRef.current,
        intent.deltaY,
        intent.screen,
        canvasSizeRef.current,
        IMAGE_BOUNDS,
      );
      viewportRef.current = next;
      setViewport(next);
      scheduleViewportLog(next);

      return;
    }

    if (intent.kind === "tool-start") {
      const hitId = hitTest(intent.image, rulesRef.current);

      if (hitId !== null) {
        selectRef.current(hitId, "canvas-hit");
        const hit = rulesRef.current.find((r) => r.id === hitId);

        if (hit && !hit.isLocked && moveRef.current) {
          // If the hit is already part of a multi-selection, drag the
          // whole group; otherwise fall back to solo drag semantics.
          const sel = selectedIdsRef.current;
          const isGroup = sel.length > 1 && sel.includes(hitId);
          const groupMembers = isGroup
            ? rulesRef.current
                .filter((r) => sel.includes(r.id) && !r.isLocked)
                .map((r) => ({
                  id: r.id,
                  origin: { x: r.x, y: r.y, width: r.width, height: r.height },
                }))
            : undefined;
          dragRef.current = {
            id: hitId,
            start: intent.image,
            origin: { x: hit.x, y: hit.y, width: hit.width, height: hit.height },
            members: groupMembers && groupMembers.length > 1 ? groupMembers : undefined,
          };
        } else if (hit && hit.isLocked) {
          logger.info("I_UI_RULE_MOVE_BLOCKED", { ruleId: hitId, reason: "locked" });
        }

        return;
      }
      // Plan 79 step 38b: Shift + empty-canvas drag opens a marquee
      // instead of starting a create gesture. `hitTest` already returned
      // null so we know we are on empty space; the modifier check
      // distinguishes marquee from the create-tool flow so single-shape
      // drawing keeps working exactly as before.
      if (intent.modifiers.shiftKey && selectManyRef.current !== undefined) {
        marqueeRef.current = { originImage: intent.image };
        setMarqueeRect({ x: intent.image.x, y: intent.image.y, width: 0, height: 0 });
        logger.info("I_UI_MARQUEE_START", { x: intent.image.x, y: intent.image.y });

        return;
      }
      // Empty-area click: clear selection so the full crisp image is
      // shown again (spotlight only dims when a selection exists). The
      // drawing gesture still starts, so drag-to-create keeps working;
      // a bare click just deselects.
      if (selectedIdsRef.current.length > 0 && clearSelectionRef.current) {
        clearSelectionRef.current();
      }

      const gesture = startRuleGesture(intent.image, activeKindRef.current, IMAGE_BOUNDS);
      gestureRef.current = gesture;
      setPendingShape(gestureToPendingShape(gesture));

      return;
    }

    if (intent.kind === "tool-move") {
      const marquee = marqueeRef.current;

      if (marquee !== null) {
        const rect = marqueeFromPoints(marquee.originImage, intent.image);
        setMarqueeRect(rect);

        return;
      }

      const drag = dragRef.current;

      if (drag !== null && moveRef.current) {
        const dx = intent.image.x - drag.start.x;
        const dy = intent.image.y - drag.start.y;
        const snapState = getSnapState();

        if (drag.members && drag.members.length > 1) {
          // Group move: snap the group's anchor rect to the shared grid
          // so all members shift by identical deltas, then run smart-
          // align against every non-member rule and the image bounds.
          const anchorSnapped = snapRect(
            {
              x: drag.origin.x + dx,
              y: drag.origin.y + dy,
              width: drag.origin.width,
              height: drag.origin.height,
            },
            snapState,
          );
          let gdx = anchorSnapped.x - drag.origin.x;
          let gdy = anchorSnapped.y - drag.origin.y;
          const memberIds = new Set(drag.members.map((m) => m.id));
          const siblings = rulesRef.current
            .filter((r) => memberIds.has(r.id) === false && !r.isHidden)
            .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
          const rects = drag.members.map((m) => m.origin);
          const screenTolerance = snapState.alignTolerancePx ?? 6;
          const tolerance = Math.max(
            1,
            screenTolerance / Math.max(viewportRef.current.zoom, 0.0001),
          );
          const aligned = computeGroupMoveAlignment(rects, { dx: gdx, dy: gdy }, siblings, {
            tolerance,
            imageBounds: IMAGE_BOUNDS,
          });
          gdx = aligned.delta.dx;
          gdy = aligned.delta.dy;
          setGroupAlignGuides(mergeGuides(aligned.guides));
          for (const m of drag.members) {
            moveRef.current(
              m.id,
              {
                x: m.origin.x + gdx,
                y: m.origin.y + gdy,
                width: m.origin.width,
                height: m.origin.height,
              },
              IMAGE_BOUNDS,
            );
          }

          return;
        }
        // Solo drag: snap to grid; SelectionOverlay handles smart-align
        // for the single-selected case.
        const proposed = {
          x: drag.origin.x + dx,
          y: drag.origin.y + dy,
          width: drag.origin.width,
          height: drag.origin.height,
        };
        moveRef.current(drag.id, snapRect(proposed, snapState), IMAGE_BOUNDS);

        return;
      }

      const gesture = gestureRef.current;

      if (gesture === null) return;
      const next = updateRuleGesture(gesture, intent.image, intent.modifiers, IMAGE_BOUNDS);
      gestureRef.current = next;
      setPendingShape(gestureToPendingShape(next));

      return;
    }

    if (dragRef.current !== null) {
      logger.info("I_UI_RULE_MOVE_END", { ruleId: dragRef.current.id });
      dragRef.current = null;
      setGroupAlignGuides([]);

      return;
    }

    if (marqueeRef.current !== null) {
      // tool-end / cancel: commit or discard the marquee.
      const rect = marqueeRect;
      const origin = marqueeRef.current.originImage;
      marqueeRef.current = null;
      setMarqueeRect(null);

      if (intent.kind === "tool-end" && rect !== null && isMarqueeEngaged(rect)) {
        const ids = ruleIdsInMarquee(rect, rulesRef.current);
        selectManyRef.current?.(ids, "canvas-marquee");
        logger.info("I_UI_MARQUEE_COMMIT", {
          count: ids.length,
          width: rect.width,
          height: rect.height,
        });
      } else {
        logger.info("I_UI_MARQUEE_CANCEL", {
          reason: intent.kind === "tool-end" ? "sub-threshold" : "cancel",
          originX: origin.x,
          originY: origin.y,
        });
      }

      return;
    }

    if (intent.kind === "cancel") return;
    const gesture = gestureRef.current;

    if (gesture === null) return;
    const finalGesture = updateRuleGesture(gesture, intent.image, intent.modifiers, IMAGE_BOUNDS);
    const rule = commitRuleGesture(finalGesture, rulesRef.current, nextRuleId());
    gestureRef.current = null;
    setPendingShape(null);

    if (rule === null) {
      logRejected(activeKindRef.current, rejectionTimesRef.current);
      logger.info("I_UI_TOOL_GESTURE_END", {
        tool: activeKindRef.current,
        moved: false,
        durationMs: 0,
      });

      return;
    }

    createRef.current(rule);
    logger.info("I_UI_RULE_CREATED", {
      ruleId: rule.id,
      kind: rule.kind,
      widthPx: rule.width,
      heightPx: rule.height,
    });
    logger.info("I_UI_TOOL_GESTURE_END", { tool: rule.kind, moved: true, durationMs: 0 });
  }

  function scheduleViewportLog(next: Viewport): void {
    if (zoomTimerRef.current !== null) window.clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = window.setTimeout(() => {
      logger.info("I_UI_VIEWPORT_CHANGED", {
        source: "wheel",
        zoom: next.zoom,
        panX: next.panX,
        panY: next.panY,
      });
    }, 120);
  }
}

function draw(
  canvas: HTMLCanvasElement | null,
  canvasSize: CanvasSize,
  rules: EditorRule[],
  selectedIds: string[],
  pendingShape: PendingShape | null,
  viewport: Viewport,
  readyRef: { current: boolean },
  spotlight: boolean,
  focus: { dim: number; blurPx: number; isolate: boolean },
  showThresholds: boolean,
  focusAlphas?: Readonly<Record<string, number>>,
  focusProgress?: number,
  previewMode?: RenderState["previewMode"],
  peekAll?: boolean,
  absentRuleIds?: readonly string[],
  debugOverlay?: boolean,
): void {
  if (canvas === null) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvasSize.width * dpr);
  canvas.height = Math.floor(canvasSize.height * dpr);
  const ctx = canvas.getContext("2d");

  if (ctx === null) {
    logger.error("E_UI_CANVAS_CONTEXT_UNAVAILABLE", { reason: "2d_context_null" });

    return;
  }

  try {
    const state: RenderState = {
      size: canvasSize,
      dpr,
      viewport,
      imageBounds: IMAGE_BOUNDS,
      rules,
      selectedIds,
      hoverId: null,
      pendingShape,
      spotlight,
      focus,
      showThresholds,
      focusAlphas,
      focusProgress,
      previewMode,
      peekAll,
      absentRuleIds,
      debugOverlay,
    };
    renderFrame(ctx, state);

    if (!readyRef.current) {
      readyRef.current = true;
      logger.info("I_UI_CANVAS_READY", {
        rules: rules.length,
        width: canvasSize.width,
        height: canvasSize.height,
      });
    }
  } catch (error) {
    logger.error("E_UI_CANVAS_DRAW_FAILED", {
      message: error instanceof Error ? error.message : "unknown",
    });

    throw error;
  }
}

function nextRuleId(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function logRejected(kind: EditorRuleKind, times: number[]): void {
  const now = Date.now();
  while (times.length > 0 && now - times[0] > 1000) times.shift();

  if (times.length >= 5) return;
  times.push(now);
  logger.warn("W_UI_RULE_CREATE_REJECTED", { kind, reason: "below_min_size" });
}
