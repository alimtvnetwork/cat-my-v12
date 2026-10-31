/**
 * Bundled sample inspection images.
 *
 * These are imported (not referenced by "/src/..." URL strings) so Vite
 * emits hashed production URLs. Plain "/src/..." strings resolve in
 * `vite dev` but 404 in the packaged exe build, where only the build
 * output is served - that mismatch made sample images vanish in the
 * installed app while working fine in development.
 */
import pocket1FilledUrl from "@/assets/samples/pocket-1-filled.jpg";
import pocket2EmptyMixedUrl from "@/assets/samples/pocket-2-empty-mixed.jpg";
import pocket2FilledUrl from "@/assets/samples/pocket-2-filled.jpg";
import pocket5PartialUrl from "@/assets/samples/pocket-5-partial.jpg";

export const SAMPLE_IMAGE_POCKET_1_FILLED: string = pocket1FilledUrl;
export const SAMPLE_IMAGE_POCKET_2_EMPTY_MIXED: string = pocket2EmptyMixedUrl;
export const SAMPLE_IMAGE_POCKET_2_FILLED: string = pocket2FilledUrl;
export const SAMPLE_IMAGE_POCKET_5_PARTIAL: string = pocket5PartialUrl;
