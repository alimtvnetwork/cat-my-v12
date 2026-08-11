// Built-in sample gallery used by the setup canvas and reference image card.
// Every sample declares the field-of-view (FOV) label so operators can pick
// the pocket count that matches their camera. See
// spec/21-app/61-sample-images-and-focus.md for the contract shipped to the
// Python backend.
import pocket1Filled from "@/assets/samples/pocket-1-filled.jpg";
import pocket2Filled from "@/assets/samples/pocket-2-filled.jpg";
import pocket3Filled from "@/assets/samples/pocket-3-filled.jpg";
import pocket4Filled from "@/assets/samples/pocket-4-filled.jpg";
import pocket5Partial from "@/assets/samples/pocket-5-partial.jpg";
import pocket2EmptyMixed from "@/assets/samples/pocket-2-empty-mixed.jpg";
import { StorageKey } from "@/lib/constants";

export enum SampleCategoryType {
  Pcb = "pcb",
  CarrierTape = "carrier-tape",
}
export type SampleCategory = SampleCategoryType;

export interface SampleImage {
  id: string;
  label: string;
  category: SampleCategory;
  /** Pockets visible in this framing, when the sample is a carrier tape. */
  pocketCount?: 2 | 3 | 4 | number;
  /** Human-readable field-of-view hint. */
  fov: string;
  url: string;
}

export const SAMPLE_LIBRARY: readonly SampleImage[] = [
  {
    id: "pcb-default",
    label: "SOIC pocket reference",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 4,
    fov: "Default pocket FOV",
    url: pocket4Filled,
  },
  {
    id: "carrier-tape-1",
    label: "SOIC chip, 1 pocket",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 1,
    fov: "Macro FOV",
    url: pocket1Filled,
  },
  {
    id: "carrier-tape-2",
    label: "SOIC chips, 2 pockets",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 2,
    fov: "Narrow FOV",
    url: pocket2Filled,
  },
  {
    id: "carrier-tape-3",
    label: "SOIC chips, 3 pockets",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 3,
    fov: "Standard FOV",
    url: pocket3Filled,
  },
  {
    id: "carrier-tape-4",
    label: "SOIC chips, 4 pockets",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 4,
    fov: "Wide FOV",
    url: pocket4Filled,
  },
  {
    id: "pocket-1-chip",
    label: "SOIC chip, 1 pocket",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 1,
    fov: "Macro FOV",
    url: pocket1Filled,
  },
  {
    id: "pocket-2-chip",
    label: "SOIC chips, 2 pockets",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 2,
    fov: "Narrow FOV",
    url: pocket2Filled,
  },
  {
    id: "pocket-3-chip",
    label: "SOIC chips, 3 pockets",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 3,
    fov: "Standard FOV",
    url: pocket3Filled,
  },
  {
    id: "pocket-4-chip",
    label: "SOIC chips, 4 pockets",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 4,
    fov: "Wide FOV",
    url: pocket4Filled,
  },
  {
    id: "pocket-5-partial",
    label: "5 pockets, 2 empty (partial fill)",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 5,
    fov: "Wide FOV",
    url: pocket5Partial,
  },
  {
    id: "pocket-2-empty-mixed",
    label: "2 pockets, 1 empty + 1 chip",
    category: SampleCategoryType.CarrierTape,
    pocketCount: 2,
    fov: "Narrow FOV",
    url: pocket2EmptyMixed,
  },
];

export function findSample(id: string): SampleImage | undefined {
  return SAMPLE_LIBRARY.find((s) => s.id === id);
}

// Default sample shown when no reference image has been captured or picked.
// Operators overwhelmingly start with a pocket / carrier-tape framing, so
// the 4-pocket carrier-tape view is the default. PCB remains one click away
// in the sample dropdown.
export const DEFAULT_SAMPLE_ID = "carrier-tape-4";
export const defaultSampleUrl: string = pocket4Filled;
export const pcbSampleUrl: string = pocket4Filled;

// Persisted key for the operator's last sample pick from the viewport POV
// menu. Restored on reopen so the editor comes back with the same framing.
export const SAMPLE_SELECTION_STORAGE_KEY = "ca.editor.reference.sampleId";

// Camera-control storage key shared with CameraPreview. Kept in sync here
// so picking a pocket sample can seed POV plus dependent slider values
// (brightness, contrast, exposure, saturation, enhance) that best match
// the chosen FOV.
export const CAMERA_CONTROLS_STORAGE_KEY: string = StorageKey.CameraControls;

export interface SamplePovBinding {
  povId: string;
  brightness: number;
  contrast: number;
  exposure: number;
  enhance: number;
  saturation: number;
  gain: number;
}

// POV / slider preset per sample. Wider FOV keeps neutral tuning; narrower
// framings tilt the camera and lift contrast / saturation slightly so the
// pocket edges pop on the reference image.
export const SAMPLE_POV_MAP: Record<string, SamplePovBinding> = {
  "pcb-default": {
    povId: "top-down",
    brightness: 1.0,
    contrast: 1.0,
    exposure: 0,
    enhance: 0,
    saturation: 100,
    gain: 0,
  },
  "carrier-tape-4": {
    povId: "top-down",
    brightness: 1.0,
    contrast: 1.0,
    exposure: 0,
    enhance: 0,
    saturation: 100,
    gain: 0,
  },
  "carrier-tape-3": {
    povId: "tilt-30",
    brightness: 1.02,
    contrast: 1.05,
    exposure: 3,
    enhance: 5,
    saturation: 105,
    gain: 5,
  },
  "carrier-tape-2": {
    povId: "tilt-30",
    brightness: 1.04,
    contrast: 1.08,
    exposure: 5,
    enhance: 10,
    saturation: 110,
    gain: 10,
  },
  "carrier-tape-1": {
    povId: "tilt-45",
    brightness: 1.08,
    contrast: 1.12,
    exposure: 8,
    enhance: 20,
    saturation: 115,
    gain: 15,
  },
};