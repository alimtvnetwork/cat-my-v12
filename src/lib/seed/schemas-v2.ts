// Plan 86 v2 seed bundle validator.
//
// Runs at facade load time. Bad JSON surfaces as a `SeedBundleValidationError`
// carrying a structured `.issues[]` list (kind + path + expected + got +
// message). The orchestrator wraps that into a CapturedError with a
// correlationId (per spec/21-app/40-error-manage.md Appendix A) — never a
// silent render glitch.
//
// Shape frozen by:
//   .lovable/plans/subtasks/86-ui-v4-json-seed-facade-completion/
//     SS-10-frozen-seed-surface-matrix.md
//
// What this file enforces:
//   1. Zod shape:      per-slice row schemas, required cross-slice FK fields
//                      typed as non-empty strings so a missing `projectId` on
//                      a sample yields "samples[3].projectId: Required".
//   2. Integrity:      6 frozen profile ids present, no duplicate row ids,
//                      no unsupported top-level slices.
//   3. Referential:    every cross-slice foreign key resolves to a row in
//                      the target slice (project → profile/camera/ruleset,
//                      ruleset ↔ rules, rule → ruleset/category, sample →
//                      project/camera, propertyPreset → swatch, emptyState
//                      ctaArgs.profileId → profile, command args.profileId
//                      → profile). Bidirectional check for ruleset.ruleIds
//                      vs rule.rulesetId so a rule and its ruleset can't
//                      silently disagree.
import { z, ZodError } from "zod";

// ---------------------------------------------------------------------------
// Frozen constants (SS-07, SS-08, SS-10). Update in this file only via an
// explicit plan step; otherwise the ratchet is meaningless.
// ---------------------------------------------------------------------------

export const FROZEN_PROFILE_IDS = [
  "prof-default-pcb",
  "prof-soic-inspection",
  "prof-connector-bank",
  "prof-blister-qa",
  "prof-empty-preview",
  "prof-error-preview",
  "prof-ui-craft-demo",
] as const;

export const SLICE_ID_PREFIX = {
  categories: "cat-",
  cameras: "cam-",
  micSettings: "mic-",
  swatches: "sw-",
  propertyPresets: "pp-",
  settings: "set-",
  projects: "proj-",
  rulesets: "rs-",
  rules: "rule-",
  samples: "smp-",
  commands: "cmd-",
  emptyStates: "es-",
  errorScenarios: "err-",
  referenceImages: "ref-",
} as const;

export type SliceKey = keyof typeof SLICE_ID_PREFIX;

// ---------------------------------------------------------------------------
// Row schemas. Every row carries `id` and (optionally) `profileId`. Slices
// with real cross-slice FKs declare those FK fields typed so a missing or
// empty value surfaces as a Zod issue with a precise path.
// ---------------------------------------------------------------------------

const idField = z.string().min(1, "must be a non-empty string");
const profileIdField = z.enum(FROZEN_PROFILE_IDS);
const fkField = z.string().min(1, "must be a non-empty string");

const baseRow = z.object({
  id: idField,
  profileId: profileIdField.optional(),
});

const rowSchemaFor = (prefix: string) =>
  baseRow.passthrough().refine((row) => row.id.startsWith(prefix), {
    message: `id must start with "${prefix}"`,
    path: ["id"],
  });

const projectRowSchema = baseRow
  .extend({
    profileId: profileIdField, // required on projects
    defaultCameraId: fkField.optional(),
    defaultRulesetId: fkField.nullish(),
    paletteSwatchIds: z.array(fkField).optional(),
  })
  .passthrough()
  .refine((r) => r.id.startsWith(SLICE_ID_PREFIX.projects), {
    message: `id must start with "${SLICE_ID_PREFIX.projects}"`,
    path: ["id"],
  });

const rulesetRowSchema = baseRow
  .extend({
    categoryId: fkField.optional(),
    ruleIds: z.array(fkField).optional(),
  })
  .passthrough()
  .refine((r) => r.id.startsWith(SLICE_ID_PREFIX.rulesets), {
    message: `id must start with "${SLICE_ID_PREFIX.rulesets}"`,
    path: ["id"],
  });

const ruleRowSchema = baseRow
  .extend({
    rulesetId: fkField.optional(),
    categoryId: fkField.optional(),
  })
  .passthrough()
  .refine((r) => r.id.startsWith(SLICE_ID_PREFIX.rules), {
    message: `id must start with "${SLICE_ID_PREFIX.rules}"`,
    path: ["id"],
  });

const sampleRowSchema = baseRow
  .extend({
    projectId: fkField, // required
    cameraId: fkField.optional(),
  })
  .passthrough()
  .refine((r) => r.id.startsWith(SLICE_ID_PREFIX.samples), {
    message: `id must start with "${SLICE_ID_PREFIX.samples}"`,
    path: ["id"],
  });

const propertyPresetRowSchema = baseRow
  .extend({
    swatchId: fkField.optional(),
  })
  .passthrough()
  .refine((r) => r.id.startsWith(SLICE_ID_PREFIX.propertyPresets), {
    message: `id must start with "${SLICE_ID_PREFIX.propertyPresets}"`,
    path: ["id"],
  });

const commandRowSchema = baseRow
  .extend({
    action: z.string().min(1, "must be a non-empty string"),
    args: z.record(z.unknown()).optional(),
  })
  .passthrough()
  .refine((r) => r.id.startsWith(SLICE_ID_PREFIX.commands), {
    message: `id must start with "${SLICE_ID_PREFIX.commands}"`,
    path: ["id"],
  });

const emptyStateRowSchema = baseRow
  .extend({
    surface: z.string().min(1, "must be a non-empty string"),
    ctaCommandId: z.string().nullish(),
    ctaArgs: z.record(z.unknown()).optional().nullable(),
  })
  .passthrough()
  .refine((r) => r.id.startsWith(SLICE_ID_PREFIX.emptyStates), {
    message: `id must start with "${SLICE_ID_PREFIX.emptyStates}"`,
    path: ["id"],
  });

const profileSchema = z.object({
  id: z.enum(FROZEN_PROFILE_IDS),
  name: z.string().min(1, "must be a non-empty string"),
  isDefault: z.boolean(),
});

export const seedBundleV2Schema = z
  .object({
    version: z.string().min(1, "must be a non-empty string"),
    schemaVersion: z.literal("plan86.v2"),
    profiles: z.array(profileSchema),
    categories: z.array(rowSchemaFor(SLICE_ID_PREFIX.categories)),
    cameras: z.array(rowSchemaFor(SLICE_ID_PREFIX.cameras)),
    micSettings: z.array(rowSchemaFor(SLICE_ID_PREFIX.micSettings)),
    swatches: z.array(rowSchemaFor(SLICE_ID_PREFIX.swatches)),
    propertyPresets: z.array(propertyPresetRowSchema),
    settings: z.array(rowSchemaFor(SLICE_ID_PREFIX.settings)),
    projects: z.array(projectRowSchema),
    rulesets: z.array(rulesetRowSchema),
    rules: z.array(ruleRowSchema),
    samples: z.array(sampleRowSchema),
    commands: z.array(commandRowSchema),
    emptyStates: z.array(emptyStateRowSchema),
    errorScenarios: z.array(rowSchemaFor(SLICE_ID_PREFIX.errorScenarios)),
    referenceImages: z.array(rowSchemaFor(SLICE_ID_PREFIX.referenceImages)).optional(),
  })
  // Passthrough at the top level too, so a stray `$comment` field doesn't
  // fail-loud; it just carries through.
  .passthrough();

export type SeedBundleV2 = z.infer<typeof seedBundleV2Schema>;

// ---------------------------------------------------------------------------
// Structured issue model. Every validation problem — shape, integrity, or
// referential — lands here so callers can render the same UI/log for all
// three tiers without string-parsing.
// ---------------------------------------------------------------------------

export enum SeedIssueKindType {
  Shape = "shape",
  Integrity = "integrity",
  Reference = "reference",
}
export type SeedIssueKind = SeedIssueKindType;

export interface SeedIssue {
  kind: SeedIssueKind;
  path: string; // e.g. "samples[3].projectId" or "rulesets[1].ruleIds[2]"
  message: string;
  expected?: string; // human-readable expectation (e.g. "id in slice `cameras`")
  got?: string; // actual offending value if applicable
}

export class SeedBundleValidationError extends Error {
  readonly issues: SeedIssue[];
  constructor(issues: SeedIssue[]) {
    super(formatIssues(issues));
    this.name = "SeedBundleValidationError";
    this.issues = issues;
  }
}

function formatIssues(issues: SeedIssue[]): string {
  const lines = issues.map((i) => {
    const bits = [`[${i.kind}]`, i.path, "-", i.message];

    if (i.expected) bits.push(`(expected: ${i.expected})`);

    if (i.got !== undefined) bits.push(`(got: ${JSON.stringify(i.got)})`);

    return "  " + bits.join(" ");
  });

  return `[seed-bundle-v2] ${issues.length} issue(s):\n${lines.join("\n")}`;
}

function zodIssuesToSeedIssues(err: ZodError): SeedIssue[] {
  return err.issues.map((iss) => ({
    kind: SeedIssueKindType.Shape,
    path: iss.path.length
      ? iss.path
          .map((seg, i) =>
            typeof seg === "number" ? `[${seg}]` : i === 0 ? String(seg) : `.${String(seg)}`,
          )
          .join("")
      : "<root>",
    message: iss.message,
  }));
}

// ---------------------------------------------------------------------------
// Integrity checks that Zod alone cannot express in one pass:
//   1) All 6 frozen profile ids are declared.
//   2) No duplicate ids inside any slice.
//   3) No unsupported top-level slice keys.
// ---------------------------------------------------------------------------

const ALLOWED_TOP_KEYS = new Set<string>([
  "version",
  "schemaVersion",
  "profiles",
  ...(Object.keys(SLICE_ID_PREFIX) as SliceKey[]),
]);

export function checkBundleIntegrity(bundle: SeedBundleV2): string[] {
  return collectIntegrityIssues(bundle).map((i) => formatShortLegacy(i));
}

function formatShortLegacy(i: SeedIssue): string {
  // Back-compat message shape used by existing Step 37 tests.
  if (i.expected === "frozen profile present") return `missing frozen profile: ${i.got ?? ""}`;

  if (i.message.startsWith("duplicate id"))
    return `duplicate id in ${i.path.split("[")[0]}: ${i.got ?? ""}`;

  if (i.message === "unsupported slice") return `unsupported slice: ${i.path}`;

  return i.message;
}

function collectIntegrityIssues(bundle: SeedBundleV2): SeedIssue[] {
  const issues: SeedIssue[] = [];

  const declaredProfiles = new Set(bundle.profiles.map((p) => p.id));
  for (const required of FROZEN_PROFILE_IDS) {
    if (declaredProfiles.has(required) === false) {
      issues.push({
        kind: SeedIssueKindType.Integrity,
        path: "profiles",
        message: `missing frozen profile "${required}"`,
        expected: "frozen profile present",
        got: required,
      });
    }
  }

  for (const slice of Object.keys(SLICE_ID_PREFIX) as SliceKey[]) {
    const rows = bundle[slice] as ReadonlyArray<{ id: string }>;
    const seen = new Set<string>();
    rows.forEach((row, i) => {
      if (seen.has(row.id)) {
        issues.push({
          kind: SeedIssueKindType.Integrity,
          path: `${slice}[${i}].id`,
          message: `duplicate id "${row.id}" within slice "${slice}"`,
          got: row.id,
        });
      }

      seen.add(row.id);
    });
  }

  for (const key of Object.keys(bundle)) {
    if (ALLOWED_TOP_KEYS.has(key)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (bundle as any)[key];

    if (Array.isArray(val) && val.some((r) => r && typeof r === "object" && "id" in r)) {
      issues.push({
        kind: SeedIssueKindType.Integrity,
        path: key,
        message: "unsupported slice",
        expected: `one of: ${[...ALLOWED_TOP_KEYS].join(", ")}`,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Referential integrity. Runs after shape + integrity pass. Every FK issue
// carries the source path, the offending value, and the slice it should
// resolve into.
// ---------------------------------------------------------------------------

export function checkReferentialIntegrity(bundle: SeedBundleV2): SeedIssue[] {
  const issues: SeedIssue[] = [];
  const ids = (rows: ReadonlyArray<{ id: string }>) => new Set(rows.map((r) => r.id));

  const profileIds: ReadonlySet<string> = new Set(bundle.profiles.map((p) => p.id));
  const categoryIds = ids(bundle.categories);
  const cameraIds = ids(bundle.cameras);
  const swatchIds = ids(bundle.swatches);
  const projectIds = ids(bundle.projects);
  const rulesetIds = ids(bundle.rulesets);
  const ruleIds = ids(bundle.rules);

  const fk = (
    kind: SeedIssueKindType,
    path: string,
    got: string,
    inSlice: SliceKey,
    set: ReadonlySet<string>,
  ) => {
    if (set.has(got) === false) {
      issues.push({
        kind,
        path,
        message: `dangling foreign key: "${got}" not found in slice "${inSlice}"`,
        expected: `id in slice \`${inSlice}\``,
        got,
      });
    }
  };

  bundle.projects.forEach((p, i) => {
    if (p.profileId && profileIds.has(p.profileId) === false) {
      issues.push({
        kind: SeedIssueKindType.Reference,
        path: `projects[${i}].profileId`,
        message: `dangling foreign key: "${p.profileId}" not found in slice "profiles"`,
        expected: "id in slice `profiles`",
        got: p.profileId,
      });
    }

    const proj = p as typeof p & {
      defaultCameraId?: string;
      defaultRulesetId?: string;
      paletteSwatchIds?: string[];
    };

    if (proj.defaultCameraId)
      fk(
        SeedIssueKindType.Reference,
        `projects[${i}].defaultCameraId`,
        proj.defaultCameraId,
        "cameras",
        cameraIds,
      );

    if (proj.defaultRulesetId)
      fk(
        SeedIssueKindType.Reference,
        `projects[${i}].defaultRulesetId`,
        proj.defaultRulesetId,
        "rulesets",
        rulesetIds,
      );
    (proj.paletteSwatchIds ?? []).forEach((sid, j) =>
      fk(
        SeedIssueKindType.Reference,
        `projects[${i}].paletteSwatchIds[${j}]`,
        sid,
        "swatches",
        swatchIds,
      ),
    );
  });

  bundle.rulesets.forEach((rs, i) => {
    const set = rs as typeof rs & { categoryId?: string; ruleIds?: string[] };

    if (set.categoryId)
      fk(
        SeedIssueKindType.Reference,
        `rulesets[${i}].categoryId`,
        set.categoryId,
        "categories",
        categoryIds,
      );
    (set.ruleIds ?? []).forEach((rid, j) =>
      fk(SeedIssueKindType.Reference, `rulesets[${i}].ruleIds[${j}]`, rid, "rules", ruleIds),
    );
  });

  bundle.rules.forEach((r, i) => {
    const rule = r as typeof r & { rulesetId?: string; categoryId?: string };

    if (rule.rulesetId) {
      fk(
        SeedIssueKindType.Reference,
        `rules[${i}].rulesetId`,
        rule.rulesetId,
        "rulesets",
        rulesetIds,
      );
      const parent = bundle.rulesets.find((x) => x.id === rule.rulesetId) as
        | ((typeof bundle.rulesets)[number] & { ruleIds?: string[] })
        | undefined;

      if (parent && (parent.ruleIds ?? []).includes(rule.id) === false) {
        issues.push({
          kind: SeedIssueKindType.Reference,
          path: `rules[${i}].rulesetId`,
          message: `rule "${rule.id}" points at ruleset "${rule.rulesetId}" but that ruleset does not list it in ruleIds`,
          expected: `rulesets["${rule.rulesetId}"].ruleIds contains "${rule.id}"`,
          got: rule.rulesetId,
        });
      }
    }

    if (rule.categoryId)
      fk(
        SeedIssueKindType.Reference,
        `rules[${i}].categoryId`,
        rule.categoryId,
        "categories",
        categoryIds,
      );
  });

  bundle.samples.forEach((s, i) => {
    const sample = s as typeof s & { projectId: string; cameraId?: string };
    fk(
      SeedIssueKindType.Reference,
      `samples[${i}].projectId`,
      sample.projectId,
      "projects",
      projectIds,
    );

    if (sample.cameraId)
      fk(
        SeedIssueKindType.Reference,
        `samples[${i}].cameraId`,
        sample.cameraId,
        "cameras",
        cameraIds,
      );
  });

  bundle.propertyPresets.forEach((pp, i) => {
    const preset = pp as typeof pp & { swatchId?: string };

    if (preset.swatchId)
      fk(
        SeedIssueKindType.Reference,
        `propertyPresets[${i}].swatchId`,
        preset.swatchId,
        "swatches",
        swatchIds,
      );
  });

  bundle.emptyStates.forEach((e, i) => {
    const es = e as typeof e & {
      ctaArgs?: { profileId?: unknown } | null;
    };
    const pid = es.ctaArgs?.profileId;

    if (typeof pid === "string" && profileIds.has(pid) === false) {
      issues.push({
        kind: SeedIssueKindType.Reference,
        path: `emptyStates[${i}].ctaArgs.profileId`,
        message: `dangling foreign key: "${pid}" not found in slice "profiles"`,
        expected: "id in slice `profiles`",
        got: pid,
      });
    }
  });

  bundle.commands.forEach((c, i) => {
    const cmd = c as typeof c & { args?: { profileId?: unknown } };
    const pid = cmd.args?.profileId;

    if (typeof pid === "string" && profileIds.has(pid) === false) {
      issues.push({
        kind: SeedIssueKindType.Reference,
        path: `commands[${i}].args.profileId`,
        message: `dangling foreign key: "${pid}" not found in slice "profiles"`,
        expected: "id in slice `profiles`",
        got: pid,
      });
    }
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Public entry point.
// Shape failures -> SeedBundleValidationError with kind="shape" issues.
// Integrity or referential failures -> SeedBundleValidationError with the
// combined issue list so the caller sees every problem at once, not just
// the first.
// ---------------------------------------------------------------------------

export function parseSeedBundleV2(raw: unknown): SeedBundleV2 {
  const shape = seedBundleV2Schema.safeParse(raw);

  if (shape.success === false) {
    throw new SeedBundleValidationError(zodIssuesToSeedIssues(shape.error));
  }

  const parsed = shape.data;
  const issues: SeedIssue[] = [
    ...collectIntegrityIssues(parsed),
    ...checkReferentialIntegrity(parsed),
  ];

  if (issues.length > 0) {
    throw new SeedBundleValidationError(issues);
  }

  return parsed;
}
