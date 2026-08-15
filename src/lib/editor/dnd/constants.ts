// Plan 41 phase 1 (step 7). Shared movement step sizes for keyboard DnD so
// arrow-key handlers and pointer nudges import from one place.

import { DndAxisType } from "@/types/rules/DndAxis";

export enum DndStepType {
  Fine = "Fine",
  Coarse = "Coarse",
}

export const DND_STEP: Readonly<Record<DndStepType, number>> = Object.freeze({
  [DndStepType.Fine]: 1,
  [DndStepType.Coarse]: 10,
});

/** Convenience: axis-scoped step lookup for future 2D anisotropy. */
export function stepFor(_axis: DndAxisType, kind: DndStepType): number {
  return DND_STEP[kind];
}

export namespace DndStepType {
  export function isFine(val: string | null | undefined): boolean {
    return val === DndStepType.Fine;
  }
  export function isCoarse(val: string | null | undefined): boolean {
    return val === DndStepType.Coarse;
  }
}
