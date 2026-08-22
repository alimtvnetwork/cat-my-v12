// Plan 41 phase 1 (step 6). Enum for keyboard DnD axis so Home/End and
// arrow bindings can share one vocabulary instead of raw "x" / "y" strings.

export enum DndAxisType {
  X = "x",
  Y = "y",
}

export const ALL_DND_AXES: readonly DndAxisType[] = Object.freeze([DndAxisType.X, DndAxisType.Y]);

export function isDndAxisType(v: unknown): v is DndAxisType {
  return typeof v === "string" && (ALL_DND_AXES as readonly string[]).includes(v);
}

export function isX(val: string | null | undefined): boolean {
  return val === DndAxisType.X;
}
export function isY(val: string | null | undefined): boolean {
  return val === DndAxisType.Y;
}
