// Zod schemas validating the JSON bundles that back `UiSeedFacade`.
// Every field mirrors `./types.ts`. Validation runs at facade load time
// so bad JSON surfaces as a `CapturedError` instead of a silent render
// glitch downstream (spec/03-error-manage/ hard rule: no silent failure).
import { z } from "zod";
import type {
  CatSeedBundle,
  CatSeedCategory,
  CatSeedProgram,
  CatSeedProject,
  CatSeedRule,
  CatSeedRuleTemplate,
  CatSeedRuleset,
  CatSeedSampleImage,
  CatSeedToolPreset,
} from "./types";

import { CatSeedRuleKindType, CatSeedRuleFamilyType } from "./types";

const ruleKind = z.nativeEnum(CatSeedRuleKindType);
const ruleFamily = z.nativeEnum(CatSeedRuleFamilyType);

export const catSeedRuleSchema = z.object({
  name: z.string().min(1),
  kind: ruleKind,
  family: ruleFamily.optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().nonnegative(),
  height: z.number().finite().nonnegative(),
}) satisfies z.ZodType<CatSeedRule>;

export const catSeedRulesetSchema: z.ZodType<CatSeedRuleset> = z.object({
  name: z.string().min(1),
  categoryName: z.string().min(1).optional(),
  rules: z.array(catSeedRuleSchema),
});

export const catSeedProjectSchema: z.ZodType<CatSeedProject> = z.object({
  name: z.string().min(1),
  cameraName: z.string().min(1).optional(),
  micSettingsName: z.string().min(1).optional(),
  categories: z.array(z.string().min(1)),
  rulesets: z.array(catSeedRulesetSchema),
});

export const catSeedCategorySchema: z.ZodType<CatSeedCategory> = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export const catSeedRuleTemplateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: ruleKind,
  suggestedCategory: z.string().optional(),
  description: z.string().optional(),
  defaults: catSeedRuleSchema.partial().optional(),
}) satisfies z.ZodType<CatSeedRuleTemplate>;

export const catSeedToolPresetSchema: z.ZodType<CatSeedToolPreset> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  toolId: z.string().min(1),
  description: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

import { SampleCategoryType } from "@/lib/editor/sample-library";

export const catSeedSampleImageSchema: z.ZodType<CatSeedSampleImage> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: z.nativeEnum(SampleCategoryType),
  pocketCount: z.number().int().nonnegative().optional(),
  fov: z.string().min(1),
  assetId: z.string().min(1),
  povBinding: z
    .object({
      povId: z.string().min(1),
      brightness: z.number(),
      contrast: z.number(),
      exposure: z.number(),
      enhance: z.number(),
      saturation: z.number(),
      gain: z.number(),
    })
    .optional(),
});

export const catSeedProgramSchema: z.ZodType<CatSeedProgram> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  projectName: z.string().min(1),
  rulesetName: z.string().min(1),
});

export const catSeedBundleSchema: z.ZodType<CatSeedBundle> = z.object({
  version: z.string().min(1),
  projects: z.array(catSeedProjectSchema),
  categories: z.array(catSeedCategorySchema),
  ruleTemplates: z.array(catSeedRuleTemplateSchema),
  toolPresets: z.array(catSeedToolPresetSchema),
  sampleImages: z.array(catSeedSampleImageSchema),
  programs: z.array(catSeedProgramSchema),
});

/**
 * Validate an unknown payload as a `CatSeedBundle`. Throws a `ZodError`
 * with the full path list on failure; callers translate that into a
 * `CapturedError` and fall back to a memory facade.
 */
export function parseCatSeedBundle(raw: unknown): CatSeedBundle {

  return catSeedBundleSchema.parse(raw);
}
