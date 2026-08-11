// Plan 43 slice-2 step 10 (v3.225.0): reality-aligned browser storage key
// registry. Every entry below is a literal that already exists in the
// codebase and is persisted in user browsers. Do NOT rename an existing
// value: that would silently orphan persisted state on next release.
//
// Add a NEW key by:
// 1. declaring the field here first,
// 2. importing `StorageKey.X` at the call site (never inline the literal),
// 3. bumping the trailing `.vN` suffix if the shape changes.
//
// The v3.220.0 aspirational keys (`ca.home.error-log`, `ca.editor.mode`,
// `ca.editor.last-project-id`, `ca.trial-run.history`,
// `ca.ai-testing.history`) were never used in code and are removed to
// avoid drift. Nothing in `src/**` referenced them.

export const StorageKey = {
  /** Debug: capture-request panel collapsed flag (`CaptureRequestDebugPanel`). */
  CaptureRequestPanelCollapsed: "ca.debug.captureRequestPanel.collapsed",
  /** Ring buffer of recent capture outcomes (`capture-history-store`). */
  CaptureHistory: "ca.captureHistory.v1",
  /** Editor preview-mode preference (`editor/preview-mode-store`). */
  EditorPreviewMode: "editor.previewMode.v1",
  /** Editor preview debug-overlay toggle (`editor/preview-mode-store`). */
  EditorPreviewDebugOverlay: "editor.previewDebugOverlay.v1",
  /** Camera control settings snapshot (`camera/capture-bridge`). */
  CameraControls: "ca.settings.camera.controls",
  /** UI prefs (`ui-prefs-store`). */
  UiPrefs: "ca.uiPrefs.v1",
  /** Persisted reference image data URL (`reference-image-store`). */
  ReferenceImage: "ca.referenceImage.v1",
  /** Active program snapshot (`program-store`, cross-tab). */
  ActiveProgram: "ca.activeProgram.v1",
  /** Projects list-view prefs (`routes/projects.index`). */
  ProjectsListPrefs: "ca:projects:list-prefs:v1",
  /** Selected sample id for viewport (`ViewportImageControls`). */
  SampleSelection: "ca.sample.selection.v1",
  /** Keyboard shortcut overrides (`shortcuts-store`). */
  Shortcuts: "ca.shortcuts.v1",
  /** Lighting setup controls (`lighting/store`). Plan 67 step 16. */
  LightingControls: "ca.settings.lighting.controls.v1",
} as const;

export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

export const ALL_STORAGE_KEYS: readonly StorageKey[] = Object.freeze([
  StorageKey.CaptureRequestPanelCollapsed,
  StorageKey.CaptureHistory,
  StorageKey.EditorPreviewMode,
  StorageKey.EditorPreviewDebugOverlay,
  StorageKey.CameraControls,
  StorageKey.UiPrefs,
  StorageKey.ReferenceImage,
  StorageKey.ActiveProgram,
  StorageKey.ProjectsListPrefs,
  StorageKey.SampleSelection,
  StorageKey.Shortcuts,
  StorageKey.LightingControls,
]);

export function isStorageKey(value: unknown): value is StorageKey {
  return typeof value === "string" && (ALL_STORAGE_KEYS as readonly string[]).includes(value);
}