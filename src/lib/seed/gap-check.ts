// Seed bundle gap checker.
//
// Cross-references every "by-name" pointer in the seed bundle against the
// entities that the side seeders (rules, cameras, mic-settings, image
// samples) actually produce. Emits one structured finding per broken link
// so operators can see, at a glance, which link in the swatches ->
// categories -> rules -> rulesets -> cameras -> mic-settings -> projects
// -> image-samples chain is dangling.
//
// Pure and synchronous: given a bundle + the known name sets, it returns a
// report. No IndexedDB / no React. The orchestrator supplies the name sets
// at runtime; tests can supply stubs to exercise every gap kind.

import type { CatSeedBundle } from "./types";

export enum SeedGapKindType {
  ProjectCameraname = "project.cameraName",
  ProjectMicsettingsname = "project.micSettingsName",
  ProjectCategory = "project.category",
  RulesetCategoryname = "ruleset.categoryName",
  RuletemplateSuggestedcategory = "ruleTemplate.suggestedCategory",
  SampleimageAssetid = "sampleImage.assetId",
  SampleimageDuplicateid = "sampleImage.duplicateId",
  ProgramProjectname = "program.projectName",
  ProgramRulesetname = "program.rulesetName",
  RuleSwatchcolor = "rule.swatchColor",
}
export type SeedGapKind = SeedGapKindType;

export interface SeedGapFinding {
  /** Machine-readable category, one of `SeedGapKind`. */
  kind: SeedGapKind;
  /** The owning entity, e.g. "PCB Assembly Check" or "prog-pcb-ic". */
  owner: string;
  /** The missing/invalid reference value. */
  ref: string;
  /** One-line human explanation, safe to render in a table cell. */
  message: string;
}

export class SeedGapReport {
  ok: boolean;
  findings: SeedGapFinding[];
  /** Rollup by kind, for the diagnostics badge. */
  countsByKind: Record<SeedGapKind, number>;
  /** Counts of each entity we scanned, for context in the UI. */
  scanned: {
    projects: number;
    categories: number;
    ruleTemplates: number;
    sampleImages: number;
    programs: number;
    swatches: number;
  };

  constructor(data: {
    ok: boolean;
    findings: SeedGapFinding[];
    countsByKind: Record<SeedGapKind, number>;
    scanned: {
      projects: number;
      categories: number;
      ruleTemplates: number;
      sampleImages: number;
      programs: number;
      swatches: number;
    };
  }) {
    this.ok = data.ok;
    this.findings = data.findings;
    this.countsByKind = data.countsByKind;
    this.scanned = data.scanned;
  }

  isInvalid(): boolean {

    return this.ok === false;
  }

  hasInaccurateSpace(): boolean {

    return this.ok === false;
  }
}

export interface SeedGapInputs {
  /** Camera names produced by `autoSeedCamerasIfEmpty` (or facade.list). */
  cameraNames: ReadonlySet<string>;
  /** Mic-settings names produced by `autoSeedMicSettingsIfEmpty`. */
  micSettingsNames: ReadonlySet<string>;
  /** Sample ids exposed by `SAMPLE_LIBRARY` in editor/sample-library. */
  sampleLibraryIds: ReadonlySet<string>;
  /** Legal swatch hex values (lowercase, with leading `#`). Optional. */
  swatches?: ReadonlySet<string>;
}

const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

function emptyCounts(): Record<SeedGapKind, number> {

  return {
    "project.cameraName": 0,
    "project.micSettingsName": 0,
    "project.category": 0,
    "ruleset.categoryName": 0,
    "ruleTemplate.suggestedCategory": 0,
    "sampleImage.assetId": 0,
    "sampleImage.duplicateId": 0,
    "program.projectName": 0,
    "program.rulesetName": 0,
    "rule.swatchColor": 0,
  };
}

/**
 * Walk the bundle and report every dangling pointer. Returns
 * `{ ok: true, findings: [] }` when every link resolves.
 */
export function runSeedGapCheck(bundle: CatSeedBundle, inputs: SeedGapInputs): SeedGapReport {
  const findings: SeedGapFinding[] = [];
  const counts = emptyCounts();
  const push = (f: SeedGapFinding) => {
    findings.push(f);
    counts[f.kind] += 1;
  };

  const categoryNames = new Set(bundle.categories.map((c) => c.name));
  const projectNames = new Set(bundle.projects.map((p) => p.name));
  const rulesetIndex = new Set<string>();
  for (const p of bundle.projects) {
    for (const rs of p.rulesets ?? []) {
      rulesetIndex.add(`${p.name}::${rs.name}`);
    }
  }

  for (const p of bundle.projects) {
    if (p.cameraName && inputs.cameraNames.has(p.cameraName) === false) {
      push({
        kind: SeedGapKindType.ProjectCameraname,
        owner: p.name,
        ref: p.cameraName,
        message: `Project "${p.name}" references camera "${p.cameraName}" but no seeded camera has that name.`,
      });
    }

    if (p.micSettingsName && inputs.micSettingsNames.has(p.micSettingsName) === false) {
      push({
        kind: SeedGapKindType.ProjectMicsettingsname,
        owner: p.name,
        ref: p.micSettingsName,
        message: `Project "${p.name}" references mic preset "${p.micSettingsName}" but no seeded mic-settings has that name.`,
      });
    }

    for (const cname of p.categories) {
      if (categoryNames.has(cname) === false) {
        push({
          kind: SeedGapKindType.ProjectCategory,
          owner: p.name,
          ref: cname,
          message: `Project "${p.name}" lists category "${cname}" which is not in bundle.categories.`,
        });
      }
    }

    for (const rs of p.rulesets ?? []) {
      if (rs.categoryName && categoryNames.has(rs.categoryName) === false) {
        push({
          kind: SeedGapKindType.RulesetCategoryname,
          owner: `${p.name} / ${rs.name}`,
          ref: rs.categoryName,
          message: `Ruleset "${rs.name}" on project "${p.name}" points at category "${rs.categoryName}" which is not defined.`,
        });
      }
    }
  }

  for (const t of bundle.ruleTemplates) {
    const sc = t.suggestedCategory;

    if (sc && sc !== "None" && categoryNames.has(sc) === false) {
      push({
        kind: SeedGapKindType.RuletemplateSuggestedcategory,
        owner: t.id,
        ref: sc,
        message: `Rule template "${t.id}" suggests category "${sc}" which is not in bundle.categories.`,
      });
    }
  }

  const seenSampleIds = new Set<string>();
  for (const s of bundle.sampleImages) {
    if (seenSampleIds.has(s.id)) {
      push({
        kind: SeedGapKindType.SampleimageDuplicateid,
        owner: s.id,
        ref: s.id,
        message: `Sample image id "${s.id}" is duplicated in bundle.sampleImages.`,
      });
    }

    seenSampleIds.add(s.id);

    if (inputs.sampleLibraryIds.has(s.id) === false) {
      push({
        kind: SeedGapKindType.SampleimageAssetid,
        owner: s.id,
        ref: s.id,
        message: `Sample image "${s.id}" is not registered in SAMPLE_LIBRARY (editor/sample-library.ts).`,
      });
    }
  }

  for (const pr of bundle.programs) {
    if (projectNames.has(pr.projectName) === false) {
      push({
        kind: SeedGapKindType.ProgramProjectname,
        owner: pr.id,
        ref: pr.projectName,
        message: `Program "${pr.id}" points at project "${pr.projectName}" which is not defined.`,
      });
    }

    if (rulesetIndex.has(`${pr.projectName}::${pr.rulesetName}`) === false) {
      push({
        kind: SeedGapKindType.ProgramRulesetname,
        owner: pr.id,
        ref: pr.rulesetName,
        message: `Program "${pr.id}" points at ruleset "${pr.rulesetName}" on project "${pr.projectName}", which is not defined.`,
      });
    }
  }

  // Rule -> swatch color check. The rules library carries params.color as
  // an optional hex string; if a swatch set is supplied and the hex is not
  // in it (or malformed) we surface it. Rule params live in the runtime
  // rules facade, not the bundle, so this only inspects tool-preset color
  // fields shipped in the bundle today.
  if (inputs.swatches) {
    for (const preset of bundle.toolPresets) {
      const color = preset.params && (preset.params as Record<string, unknown>).color;

      if (typeof color !== "string") continue;
      const norm = color.trim().toLowerCase();
      const legal = HEX.test(norm) && inputs.swatches.has(norm);

      if (!legal) {
        push({
          kind: SeedGapKindType.RuleSwatchcolor,
          owner: preset.id,
          ref: color,
          message: `Tool preset "${preset.id}" uses color "${color}" which is not a valid swatch.`,
        });
      }
    }
  }

  return new SeedGapReport({
    ok: findings.length === 0,
    findings,
    countsByKind: counts,
    scanned: {
      projects: bundle.projects.length,
      categories: bundle.categories.length,
      ruleTemplates: bundle.ruleTemplates.length,
      sampleImages: bundle.sampleImages.length,
      programs: bundle.programs.length,
      swatches: inputs.swatches ? inputs.swatches.size : 0,
    },
  });
}

/**
 * Camera names produced by the current camera seeder. Kept in sync with
 * `src/lib/camera/seed.ts`. A test locks this list against the seeder.
 */
export const SEEDED_CAMERA_NAMES: readonly string[] = [
  "Basler acA1920",
  "FLIR Blackfly S",
  "Reference USB Cam",
];

/** Mic-settings preset names produced by `src/lib/mic-settings/seed.ts`. */
export const SEEDED_MIC_SETTINGS_NAMES: readonly string[] = [
  "Clean room baseline",
  "Line-side ambient",
  "Diagnostic capture",
];

export function isInvalid(report: SeedGapReport): boolean {

  return report.ok === false;
}

export function hasInaccurateSpace(report: SeedGapReport): boolean {

  return report.ok === false;
}
