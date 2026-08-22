// Plan 41 step 5. Enum for the rule drag-and-drop interaction mode. Landed
// ahead of the keyboard-accessible DnD implementation so future call sites
// import a single shared constant instead of comparing raw string literals.
//
// No logic ships with this file. Consumers arrive in Plan 41 steps 10+.

export enum DndModeType {
  /** No drag in progress. */
  Idle = "idle",
  /** Rule grabbed via keyboard (Space/Enter); arrow keys reposition. */
  KeyboardGrabbed = "keyboard-grabbed",
  /** Rule being dragged with a pointer (mouse/touch/pen). */
  PointerDragging = "pointer-dragging",
}

export const ALL_DND_MODES: readonly DndModeType[] = Object.freeze([
  DndModeType.Idle,
  DndModeType.KeyboardGrabbed,
  DndModeType.PointerDragging,
]);

export function isDndModeType(value: unknown): value is DndModeType {
  return typeof value === "string" && (ALL_DND_MODES as readonly string[]).includes(value);
}

export function isIdle(val: string | null | undefined): boolean {
  return val === DndModeType.Idle;
}
export function isKeyboardGrabbed(val: string | null | undefined): boolean {
  return val === DndModeType.KeyboardGrabbed;
}
export function isPointerDragging(val: string | null | undefined): boolean {
  return val === DndModeType.PointerDragging;
}
