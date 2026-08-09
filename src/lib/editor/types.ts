export enum EditorRuleKindType {
  C = "C",
  R = "R",
  K = "K",
  S = "S",
  E = "E",
}
export type EditorRuleKind = EditorRuleKindType;

export enum EditorToolFamilyType {
  Rect = "rect",
  Anchor = "anchor",
}
export type EditorToolFamily = EditorToolFamilyType;

export interface EditorPoint {
  x: number;
  y: number;
}

export interface EditorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EditorRuleParams = Record<string, string | number | boolean>;

export interface EditorRule {
  id: string;
  name: string;
  kind: EditorRuleKind;
  family?: EditorToolFamily;
  isHidden: boolean;
  isLocked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  params?: EditorRuleParams;
  /**
   * Plan 67 step 23 (Reference vs Copy clone).
   * When present, this rule was cloned as a reference to the rule with
   * this id. Downstream code treats these as chained (mask source,
   * positional anchor). Not persisted for plain copies.
   */
  sourceRuleId?: string;
  /**
   * Plan 79 step 36: on-canvas rotation about the ROI centre in degrees,
   * clockwise, normalised to `(-180, 180]`. Omitted / undefined means
   * 0 deg. Renderer + hit-test still operate on the axis-aligned
   * bounding box for now; rotation is visual and drives export /
   * downstream chain metadata.
   */
  rotation?: number;
  /**
   * Issue #28: per-ruleset editor lists split into Rules and Categories
   * tabs. Categories are optional grouping rows sourced from the shared
   * library; plain rules omit this flag.
   */
  isCategory?: boolean;
}

export interface PendingShape extends EditorRect {
  kind: EditorRuleKind;
  family: EditorToolFamily;
  name: string;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface RenderState {
  size: CanvasSize;
  dpr: number;
  viewport: Viewport;
  imageBounds: EditorRect;
  rules: readonly EditorRule[];
  selectedIds: readonly string[];
  hoverId: string | null;
  pendingShape: PendingShape | null;
  /** When true and something is selected, dim/blur pixels outside selection. */
  spotlight?: boolean;
  /** Tunable focus appearance when `spotlight` is on and a selection exists. */
  focus?: {
    /** Gaussian blur in px applied to the out-of-focus reference. */
    blurPx: number;
    /** 0..1 black overlay strength on the out-of-focus reference. */
    dim: number;
    /** When true, out-of-focus pixels are fully hidden (isolate mode). */
    isolate: boolean;
  };
  /**
   * Show per-rule threshold visualization (min/max radius rings, edge
   * threshold label, acceptance similarity badge). Off keeps the canvas
   * clean; on helps operators tune the rule.
   */
  showThresholds?: boolean;
  /**
   * Per-rule reveal alpha (0..1) used by the spotlight transition. When
   * provided, the renderer includes any rule with alpha > 0 in the
   * focused set and scales its crisp reveal by the alpha. Missing keys
   * fall back to 1 for currently-selected rules and 0 otherwise.
   */
  focusAlphas?: Readonly<Record<string, number>>;
  /**
   * 0..1 global blend used to fade the base blur/dim of the reference
   * as the spotlight animates in or out. Defaults to 1 when a focus is
   * active and 0 otherwise.
   */
  focusProgress?: number;
  /**
   * Preview mode controls which rules receive a crisp ROI reveal:
   *   - "off": no reveal, no blur. The reference is drawn plain.
   *   - "selection": only currently-selected rules (default legacy).
   *   - "all-rules": every visible non-hidden rule.
   * When omitted, the renderer falls back to legacy `spotlight` +
   * `selectedIds` behavior.
   */
  previewMode?: "off" | "selection" | "all-rules";
  /**
   * Transient override: when true, ignore `previewMode` and draw the
   * whole reference crisp (no blur, no dim). Rules still overlay their
   * boxes / labels / thresholds. Used for "peek full image".
   */
  peekAll?: boolean;
  /**
   * Rule ids flagged as "should be absent" (at least one acceptance
   * condition has `presence === "absent"`). These rules do NOT receive a
   * crisp ROI reveal in the focus pass; instead a warning cross is
   * drawn over their bounds so the operator can visualize that the
   * target must not be present there.
   */
  absentRuleIds?: readonly string[];
  /**
   * When true, an extra debug pass is drawn after the main frame
   * showing per-rule mask alpha (magenta), the spotlight clip region
   * (dashed cyan outline), and the effective ROI (green wash). Used
   * to visually verify what the worker will evaluate. Default false.
   */
  debugOverlay?: boolean;
}

export interface ToolModifierKeys {
  shiftKey: boolean;
  altKey: boolean;
}

export enum LogLevelType {
  Info = "info",
  Warn = "warn",
  Error = "error",
}
export type LogLevel = LogLevelType;

export interface LogEntry {
  code: string;
  level: LogLevel;
  timestamp: number;
  correlationId: string;
  fields: Record<string, string | number | boolean | null>;
}
