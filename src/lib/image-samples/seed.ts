// ImageSamples sample seed.
//
// Adds deterministic uploaded-pocket samples per persisted project when the
// image samples facade is empty. Idempotent.

import { makeImageSamplesFacade } from "./facade";
import { useProjectStore } from "@/lib/projects/store";
import type { ImageSample } from "./model";
import pocket1Filled from "@/assets/samples/pocket-1-filled.jpg";
import pocket2EmptyMixed from "@/assets/samples/pocket-2-empty-mixed.jpg";
import pocket2Filled from "@/assets/samples/pocket-2-filled.jpg";
import pocket3Filled from "@/assets/samples/pocket-3-filled.jpg";
import pocket4Filled from "@/assets/samples/pocket-4-filled.jpg";
import pocket5Partial from "@/assets/samples/pocket-5-partial.jpg";

const DEFAULT_PHOTOS: readonly { url: string; label: string }[] = [
  { url: pocket4Filled, label: "SOIC pockets, 4-up" },
  { url: pocket2Filled, label: "SOIC pockets, 2-up" },
  { url: pocket5Partial, label: "SOIC partial fill" },
];

const PROJECT_PHOTOS: Record<string, readonly { url: string; label: string }[]> = {
  "Bottle Line Inspection": [
    { url: pocket2Filled, label: "SOIC pockets, 2-up" },
    { url: pocket2EmptyMixed, label: "SOIC missing pocket" },
    { url: pocket1Filled, label: "SOIC single pocket" },
  ],
  "PCB Assembly Check": DEFAULT_PHOTOS,
  "Blister Pack QA": [
    { url: pocket4Filled, label: "SOIC pockets, 4-up" },
    { url: pocket5Partial, label: "SOIC partial fill" },
    { url: pocket3Filled, label: "SOIC pockets, 3-up" },
  ],
};

/**
 * Plan 100 Phase G step 69: seed 3 deterministic uploaded-pocket samples
 * per persisted project so contact sheet and drag-reorder flows have visible
 * operator-provided content on first launch.
 */
const FRAMES: readonly { suffix: string; label: string }[] = [
  { suffix: "a", label: "Frame A" },
  { suffix: "b", label: "Frame B" },
  { suffix: "c", label: "Frame C" },
];

export async function autoSeedImageSamplesIfEmpty(): Promise<void> {
  if (typeof window === "undefined") return;
  const facade = makeImageSamplesFacade();
  await facade.__hydrate();

  if (facade.listAll().length > 0) return;
  const projects = Object.values(useProjectStore.getState().projects);

  if (projects.length === 0) return;
  const now = Date.now();
  let seeded = 0;
  for (const [i, project] of projects.entries()) {
    const photos = PROJECT_PHOTOS[project.name] ?? DEFAULT_PHOTOS;
    for (const [f, frame] of FRAMES.entries()) {
      const photo = photos[f % photos.length];
      const dataUrl = photo.url;
      const sample: ImageSample = {
        id: `sample-seed-${project.id}-${frame.suffix}`,
        projectId: project.id,
        name: `${project.name} · ${photo.label} · ${frame.label}`,
        dataUrl,
        width: 640,
        height: 480,
        byteSize: dataUrl.length,
        capturedAt: new Date(now - i * 60_000 - f * 15_000).toISOString(),
        source: "upload",
      };
      try {
        await facade.save(sample);
        seeded += 1;
      } catch (err) {
        console.warn("[image-samples/seed] save failed", { id: sample.id, err });
      }
    }
  }

  if (seeded > 0) console.info("[image-samples/seed] seeded %d sample(s)", seeded);
}
