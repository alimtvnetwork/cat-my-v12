// UI seed facade domain model (Plan 72, Step 2).
//
// These are the ONLY types UI code touches when consuming seed data. The
// concrete backing (bundled JSON today, remote API tomorrow) is hidden
// behind `UiSeedFacade` (see `./facade.ts` in a later step). Business
// logic must never import a JSON file from `src/lib/seed/data/*` directly.
//
// Naming follows spec/21-app/52-sdk-facade-pattern.md section 4:
//   domain objects are prefixed `Cat<Concept>` so a grep proves no vendor
//   type leaks. `Cat` here means "our own model", not "category".

/** Rule kinds used across the editor (C/R/K/S/E). Mirrors EditorRule.kind. */
export enum CatSeedRuleKindType {
  C = "C",
  R = "R",
  K = "K",
  S = "S",
  E = "E",
}
export type CatSeedRuleKind = CatSeedRuleKindType;

/** Geometry family for a seeded rule. Mirrors EditorRule.family. */
export enum CatSeedRuleFamilyType {
  Rect = "rect",
  Anchor = "anchor",
  Polygon = "polygon",
  Line = "line",
}
export type CatSeedRuleFamily = CatSeedRuleFamilyType;

export interface CatSeedRule {
  name: string;
  kind: CatSeedRuleKind;
  family?: CatSeedRuleFamily;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CatSeedRuleset {
  name: string;
  categoryName?: string;
  rules: CatSeedRule[];
}

export interface CatSeedProject {
  name: string;
  cameraName?: string;
  /**
   * Optional MicSettings preset name. Resolved by the seed-bindings step
   * against `MicSettingsFacade` after both projects and mic settings have
   * seeded. Never a raw id; keeps the seed bundle stable across id churn.
   */
  micSettingsName?: string;
  categories: string[];
  rulesets: CatSeedRuleset[];
}

export interface CatSeedCategory {
  name: string;
  /** Optional short description shown in the category picker tooltip. */
  description?: string;
  /** Optional icon key resolved by the UI. */
  icon?: string;
}

export interface CatSeedRuleTemplate {
  id: string;
  label: string;
  kind: CatSeedRuleKind;
  /** Category the template best fits. Not enforced. */
  suggestedCategory?: string;
  /** Human-readable one-liner used in the template picker. */
  description?: string;
  /** Optional default rule geometry seeded when the template is picked. */
  defaults?: Partial<CatSeedRule>;
}

export interface CatSeedToolPreset {
  id: string;
  label: string;
  /** Editor tool id the preset activates. */
  toolId: string;
  description?: string;
  /** Arbitrary tool-specific parameter bag. Kept as `Record` so slices */
  /** can evolve without a bundle version bump. */
  params?: Record<string, unknown>;
}

import { SampleCategoryType } from "@/lib/editor/sample-library";

export interface CatSeedSampleImage {
  id: string;
  label: string;
  /** Matches `SampleCategory` in `src/lib/editor/sample-library.ts`. */
  category: SampleCategoryType;
  pocketCount?: number;
  fov: string;
  /** Asset id resolved by the loader (bundled import), not a raw URL. */
  assetId: string;
  /**
   * Optional camera POV + slider preset applied when the operator picks
   * this sample. Mirrors `SamplePovBinding` in
   * `src/lib/editor/sample-library.ts`. Kept optional so seed bundles can
   * add POV metadata incrementally without a schema version bump.
   */
  povBinding?: CatSeedSamplePovBinding;
}

export interface CatSeedSamplePovBinding {
  povId: string;
  brightness: number;
  contrast: number;
  exposure: number;
  enhance: number;
  saturation: number;
  gain: number;
}

export interface CatSeedProgram {
  id: string;
  name: string;
  projectName: string;
  rulesetName: string;
}

/** Everything the UI can request. Slice keys are stable and additive. */
export interface CatSeedBundle {
  /** Bumped whenever the JSON schema meaningfully changes. */
  version: string;
  projects: CatSeedProject[];
  categories: CatSeedCategory[];
  ruleTemplates: CatSeedRuleTemplate[];
  toolPresets: CatSeedToolPreset[];
  sampleImages: CatSeedSampleImage[];
  programs: CatSeedProgram[];
}

export type CatSeedBundleSlice = Exclude<keyof CatSeedBundle, "version">;
