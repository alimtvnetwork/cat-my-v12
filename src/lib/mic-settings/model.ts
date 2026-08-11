// Plan 79 step 12. MicSettings V4 domain model.
//
// Source of truth: .lovable/plans/subtasks/79-ui-improvements-v4/SS-04-domain-model.md
// CRUD only. Referenced by Project.micSettingsId? (step 16).
// Data-only: no persistence, no component imports. Facade lives in
// src/lib/mic-settings/facade.ts (step 14).

import { z } from "zod";

export type MicSettingsId = string & { readonly __brand: "MicSettingsId" };

export const MicSettingsIdSchema = z
  .string()
  .min(1)
  .max(64)
  .transform((v) => v as MicSettingsId);

const IsoDate = z.string().datetime({ offset: true });

export const MicSettingsSchema = z.object({
  id: MicSettingsIdSchema,
  name: z.string().trim().min(1).max(64),
  params: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().max(500).optional(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});

export type MicSettings = z.output<typeof MicSettingsSchema>;
export type MicSettingsDraft = Omit<MicSettings, "id" | "createdAt" | "updatedAt"> & {
  id?: MicSettingsId;
};

export function isMicSettings(value: unknown): value is MicSettings {
  return MicSettingsSchema.safeParse(value).success;
}

export enum MicSettingsErrorCodeType {
  E_MIC_REFERENCED = "E_MIC_REFERENCED",
  E_MIC_SCHEMA = "E_MIC_SCHEMA",
}
export type MicSettingsErrorCode = MicSettingsErrorCodeType;

export class MicSettingsReferencedError extends Error {
  readonly code = "E_MIC_REFERENCED" as const;
  constructor(
    readonly referrers: { projects: string[] },
    readonly correlationId: string,
  ) {
    super(`MicSettings is referenced by ${referrers.projects.length} project(s)`);
    this.name = "MicSettingsReferencedError";
  }
}

export class MicSettingsValidationError extends Error {
  readonly code = "E_MIC_SCHEMA" as const;
  constructor(
    readonly issues: z.ZodIssue[],
    readonly correlationId: string,
  ) {
    super(`MicSettings failed schema validation (${issues.length} issue(s))`);
    this.name = "MicSettingsValidationError";
  }
}