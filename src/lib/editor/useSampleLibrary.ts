// Plan 73 step 31a + Plan 86 Step 31. Adapter that projects the
// `sampleImages` seed slice into the legacy `SampleImage` /
// `SamplePovBinding` shapes the editor consumes.
//
// Read layering (Plan 86 Step 31):
//   1. If a v2 seed profile is active AND `samplesFacade` has rows that
//      carry the editor-library projection keys (`assetId`, `fov`,
//      optionally `pocketCount`, `povBinding`) as extras, use those.
//   2. Else if the v1 `sampleImages` seed slice has rows, use those.
//   3. Else fall back to the bundled `SAMPLE_LIBRARY`.
//
// The v2 bundle's `samples` slice is per-project (different shape), so
// tolerant projection is intentional: we only override when the extras
// look like a library entry. Legacy behaviour is preserved bit-for-bit
// when no profile is active or when the extras are absent.
import { useMemo } from "react";
import { useSeedSlice } from "@/lib/seed/useSeedSlice";
import type { CatSeedSampleImage } from "@/lib/seed/types";
import {
  SAMPLE_LIBRARY,
  SAMPLE_POV_MAP,
  SampleCategoryType,
  type SampleImage,
  type SamplePovBinding,
} from "@/lib/editor/sample-library";
import { useFacadeOrStore } from "@/lib/facades/useFacadeOrStore";
import { samplesFacade, type SampleRow } from "@/lib/facades/slice-facades";

export interface UseSampleLibraryResult {
  library: readonly SampleImage[];
  povMap: Record<string, SamplePovBinding>;
  /** True when data came from the seed facade rather than the fallback. */
  fromSeed: boolean;
  /** True when data came from the v2 facade snapshot (Plan 86 Step 31). */
  fromFacadeV2: boolean;
}

// Local url index built from bundled assets. Seed entries reference an
// `assetId` (stable string) that we resolve back to the bundled URL by
// looking up the legacy library. This keeps asset bundling static while
// letting metadata flow through the facade.
function urlIndex(): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of SAMPLE_LIBRARY) map.set(s.id, s.url);

  return map;
}

function projectEntry(seed: CatSeedSampleImage, urls: Map<string, string>): SampleImage | null {
  const url = urls.get(seed.id) ?? urls.get(seed.assetId);

  if (!url) return null;

  return {
    id: seed.id,
    label: seed.label,
    category: seed.category,
    pocketCount: seed.pocketCount as SampleImage["pocketCount"],
    fov: seed.fov,
    url,
  };
}

/**
 * Best-effort projection from a v2 DomainRow (samples facade) to the
 * legacy CatSeedSampleImage shape. Returns null when the row does not
 * carry the required library keys; those rows are ignored (they are
 * per-project samples, not editor-library entries).
 */
function projectV2Row(row: SampleRow): CatSeedSampleImage | null {
  const anyRow = row as unknown as Record<string, unknown>;
  const assetId = typeof anyRow.assetId === "string" ? anyRow.assetId : null;
  const fov = typeof anyRow.fov === "string" ? anyRow.fov : null;
  const label = typeof anyRow.label === "string" ? anyRow.label : null;
  const category =
    anyRow.category === SampleCategoryType.Pcb || anyRow.category === SampleCategoryType.CarrierTape
      ? anyRow.category
      : null;

  if (!assetId || !fov || !label || !category) return null;
  const pocketCount = typeof anyRow.pocketCount === "number" ? anyRow.pocketCount : undefined;
  const povBinding =
    anyRow.povBinding && typeof anyRow.povBinding === "object"
      ? (anyRow.povBinding as CatSeedSampleImage["povBinding"])
      : undefined;

  return {
    id: row.id,
    label,
    category,
    fov,
    assetId,
    pocketCount,
    povBinding,
  };
}

export function useSampleLibrary(): UseSampleLibraryResult {
  const { data: v1Data } = useSeedSlice("sampleImages");
  const facadeRows = useFacadeOrStore<SampleRow, null>(samplesFacade, () => null);

  return useMemo<UseSampleLibraryResult>(() => {
    const urls = urlIndex();

    // v2 facade path: only overrides when at least one row projects.
    if (Array.isArray(facadeRows) && facadeRows.length > 0) {
      const library: SampleImage[] = [];
      const povMap: Record<string, SamplePovBinding> = {};
      for (const row of facadeRows) {
        const seed = projectV2Row(row);

        if (!seed) continue;
        const entry = projectEntry(seed, urls);

        if (!entry) continue;
        library.push(entry);
        const pov = seed.povBinding ?? SAMPLE_POV_MAP[seed.id];

        if (pov) povMap[seed.id] = pov;
      }

      if (library.length > 0) {
        return { library, povMap, fromSeed: true, fromFacadeV2: true };
      }
      // else fall through to v1 / legacy (rows are per-project samples,
      // not library entries — expected for most v2 profiles today).
    }

    // v1 seed slice path (existing behaviour).
    if (!v1Data || v1Data.length === 0) {
      return {
        library: SAMPLE_LIBRARY,
        povMap: SAMPLE_POV_MAP,
        fromSeed: false,
        fromFacadeV2: false,
      };
    }

    const library: SampleImage[] = [];
    const povMap: Record<string, SamplePovBinding> = {};
    for (const seed of v1Data) {
      const entry = projectEntry(seed, urls);

      if (!entry) continue;
      library.push(entry);
      const pov = seed.povBinding ?? SAMPLE_POV_MAP[seed.id];

      if (pov) povMap[seed.id] = pov;
    }

    if (library.length === 0) {
      return {
        library: SAMPLE_LIBRARY,
        povMap: SAMPLE_POV_MAP,
        fromSeed: false,
        fromFacadeV2: false,
      };
    }

    return { library, povMap, fromSeed: true, fromFacadeV2: false };
  }, [v1Data, facadeRows]);
}
