// Plan 86 Step 33: layered swatches read.
//
// Root cause the hook fixes, in one sentence: SwatchesPane read only from
// the legacy IndexedDB swatches facade, so selecting a v2 seed profile with
// seeded swatch rows never changed the palette strip.
//
// Contract: when an active v2 profile has seeded rows in `swatchesFacade`
// (Plan 86 registry), return their `hex` values sorted by `order`. Otherwise
// fall back to the legacy `useSwatches()` list unchanged.

import { swatchesFacade, type SwatchRow } from "@/lib/facades/slice-facades";
import { useFacadeOrStore } from "@/lib/facades/useFacadeOrStore";
import { useSwatches as useLegacySwatches } from "@/lib/swatches/facade";

type SeededSwatch = SwatchRow & { hex?: string; order?: number };

export function useSeededSwatches(): readonly string[] {
  // Call the legacy hook unconditionally to satisfy the rules of hooks;
  // useFacadeOrStore will ignore it when a v2 profile is active.
  const legacy = useLegacySwatches();
  const rows = useFacadeOrStore<SwatchRow, readonly string[]>(swatchesFacade, () => legacy);

  if (rows === legacy) return legacy;
  const seeded = rows as readonly SeededSwatch[];

  if (seeded.length === 0) return legacy;

  return [...seeded]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((r) => r.hex)
    .filter((h): h is string => typeof h === "string" && h.length > 0);
}
