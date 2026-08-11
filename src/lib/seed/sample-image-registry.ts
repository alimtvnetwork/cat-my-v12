// Plan 85 Step 4: wire seeded sample rows to real image asset URLs.
//
// `bundle.v2.json` intentionally ships `image.dataUrl: null` for every sample
// because JSON cannot carry binary payloads and we do not want to hardcode
// hashed asset URLs in the frozen bundle. This registry maps `smp-*` ids to
// build-time imported asset URLs; `useSeededSamplesForProject` overlays the
// resolved URL onto `image.dataUrl` for consumers.
//
// Missing entries fall back to `null` (the pre-registry behavior), which is
// the contract the ImageSamples empty-state relies on.
import pocket1Filled from "@/assets/samples/pocket-1-filled.jpg";
import pocket2Filled from "@/assets/samples/pocket-2-filled.jpg";
import pocket3Filled from "@/assets/samples/pocket-3-filled.jpg";
import pocket4Filled from "@/assets/samples/pocket-4-filled.jpg";
import pocket5Partial from "@/assets/samples/pocket-5-partial.jpg";
import pocket2EmptyMixed from "@/assets/samples/pocket-2-empty-mixed.jpg";

export const SAMPLE_IMAGE_URLS: Readonly<Record<string, string>> = Object.freeze({
  // PCB refdes + missing-part project: pocket photos of SOIC chips in carrier tape.
  "smp-pcb-refdes-01": pocket4Filled,
  "smp-pcb-refdes-02": pocket3Filled,
  "smp-pcb-missing-01": pocket2EmptyMixed,
  // SOIC solder / fillet inspection: single and paired pockets.
  "smp-soic-solder-01": pocket1Filled,
  "smp-soic-solder-02": pocket2Filled,
  "smp-soic-fillet-01": pocket5Partial,
  // Connector barcode: 4-up strip of chips (labels visible).
  "smp-connector-barcode-01": pocket4Filled,
  // Every seeded visual sample now uses the uploaded pocket-based references.
  "smp-blister-pill-01": pocket4Filled,
  "smp-blister-pill-02": pocket5Partial,
  "smp-blister-count-01": pocket3Filled,
  "smp-carrier-tape-01": pocket4Filled,
  "smp-empty-preview-01": pocket2EmptyMixed,
  "smp-error-preview-01": pocket1Filled,
});

export function resolveSampleImageUrl(sampleId: string): string | null {
  return SAMPLE_IMAGE_URLS[sampleId] ?? null;
}