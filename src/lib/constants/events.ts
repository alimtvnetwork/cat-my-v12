// Plan 43 slice-2 step 12 (v3.227.0): reality-aligned CustomEvent name
// registry. Only app-specific custom events live here; standard DOM events
// (`keydown`, `resize`, `storage`, `pointerdown`, etc.) stay as native
// literals since they are part of the DOM API, not this app's contract.
//
// The v3.221.0 aspirational entries were speculative and had zero call
// sites in `src/**`. They are removed so the registry stops lying about the
// contract. Add a NEW event by declaring the field here first, then
// importing `AppEvent.X` at every dispatch/listen site.

export const AppEvent = {
  /** Editor requests the floating inspector open on a target (`CanvasViewport` -> `FloatingInspector`). */
  EditorOpenInspector: "editor:open-inspector",
  /** Editor announces the reference image is ready for downstream renderers (`render/frame.ts` -> `CanvasViewport`). */
  EditorReferenceReady: "editor-reference-ready",
  /** Bug/error modal trigger (`error-bus` -> `BugErrorModal`). */
  BugError: "ca:bug-error",
  /** Menu shortcut command bus (`useMenuShortcuts` -> `run.tsx` and peers). */
  MenuCommand: "ca:menu-command",
} as const;

export type AppEvent = (typeof AppEvent)[keyof typeof AppEvent];

export const ALL_APP_EVENTS: readonly AppEvent[] = Object.freeze([
  AppEvent.EditorOpenInspector,
  AppEvent.EditorReferenceReady,
  AppEvent.BugError,
  AppEvent.MenuCommand,
]);

export function isAppEvent(value: unknown): value is AppEvent {
  return typeof value === "string" && (ALL_APP_EVENTS as readonly string[]).includes(value);
}
