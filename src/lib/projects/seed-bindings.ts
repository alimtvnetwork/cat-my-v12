import { ClientLogger } from "@/lib/observability/client-logger";
// Seed-time project bindings (Plan 100 Phase G step 67/68).
//
// Root cause this file addresses: `bundle.json` used to reference cameras
// only via a freeform `cameraName` string that never resolved to a real
// `CameraSetting` id in the facade, so seeded projects opened with
// "Legacy label: X. Pick a CameraSetting above" instead of a live binding.
// Mic settings had the same problem: three presets were seeded into the
// MicSettings facade but no project pointed to them.
//
// This module runs after `runAllSeeders` has finished seeding projects,
// cameras, and mic settings. It resolves the bundle-supplied names into
// facade ids and calls the same `setProjectCamera` / `setProjectMicSettings`
// actions the UI uses, so the persistence path is identical.
//
// Idempotent by design:
//  - Skips a project whose binding already matches the resolved id.
//  - Skips silently when either facade is empty (nothing to bind against).
//  - Logs every mismatch so a name typo in the bundle is visible in the
//    console instead of failing silently.

import { useProjectStore } from "./store";
import { makeCameraFacade } from "@/lib/camera/facade";
import { makeMicSettingsFacade } from "@/lib/mic-settings/facade";
import type { CatSeedProject } from "@/lib/seed/types";

function norm(s: string): string {

  return s.trim().toLowerCase();
}

/**
 * Why every binding lookup carries a `reason` + `available` list: a silent
 * fallback ("just leave the project unbound") makes seed-bundle typos and
 * missing facade rows indistinguishable from an intentional empty binding.
 * The consumer surfaces a contextual error toast with the missing key AND
 * the list of names that WERE resolvable, so an operator can immediately
 * see whether to fix the bundle or add the missing entity.
 */
export enum SeedBindingKindType {
  Camera = "camera",
  MicSettings = "mic-settings",
}
export type SeedBindingKind = SeedBindingKindType;
export enum SeedBindingUnresolvedReasonType {
  NotFound = "not-found",
  EmptyFacade = "empty-facade",
}
export type SeedBindingUnresolvedReason = SeedBindingUnresolvedReasonType;

export interface SeedBindingUnresolved {
  projectName: string;
  missing: SeedBindingKind;
  wanted: string;
  reason: SeedBindingUnresolvedReason;
  /** Names available in the target facade at lookup time (up to 12). */
  available: string[];
  /** One-line remediation guidance for the operator. */
  hint: string;
}

export interface SeedBindingsResult {
  camerasBound: number;
  micSettingsBound: number;
  unresolved: SeedBindingUnresolved[];
}

interface NamedItem {
  name: string;
}

function sampleNames(map: Map<string, NamedItem>): string[] {

  return Array.from(map.values())
    .slice(0, 12)
    .map((r) => r.name);
}

function buildHint(
  kind: SeedBindingKind,
  reason: SeedBindingUnresolvedReason,
  wanted: string,
): string {
  if (reason === SeedBindingUnresolvedReasonType.EmptyFacade) {

    return kind === SeedBindingKindType.Camera
      ? `No cameras exist yet. Create a camera named "${wanted}" under /setup/camera or fix bundle.json.`
      : `No mic settings exist yet. Create a MicSettings preset named "${wanted}" or fix bundle.json.`;
  }

  return kind === SeedBindingKindType.Camera
    ? `Camera "${wanted}" not found. Rename bundle.json cameraName to an existing camera, or add it under /setup/camera.`
    : `MicSettings "${wanted}" not found. Rename bundle.json micSettingsName to an existing preset, or add it.`;
}

export async function bindSeededProjects(
  projects: readonly CatSeedProject[],
): Promise<SeedBindingsResult> {
  const cameraFacade = makeCameraFacade();
  const micFacade = makeMicSettingsFacade();

  const cameras = cameraFacade.list();
  const micRows = micFacade.list();

  const cameraByName = new Map(cameras.map((c) => [norm(c.name), c] as const));
  const micByName = new Map(micRows.map((m) => [norm(m.name), m] as const));

  const result: SeedBindingsResult = {
    camerasBound: 0,
    micSettingsBound: 0,
    unresolved: [],
  };

  const currentProjects = useProjectStore.getState().projects;
  const projectByName = new Map(
    Object.values(currentProjects).map((p) => [norm(p.name), p] as const),
  );

  for (const seed of projects) {
    const project = projectByName.get(norm(seed.name));

    if (!project) continue; // Project not (yet) in store; nothing to bind.

    if (seed.cameraName) {
      const cam = cameraByName.get(norm(seed.cameraName));

      if (!cam) {
        const reason: SeedBindingUnresolvedReason =
          cameras.length === 0
            ? SeedBindingUnresolvedReasonType.EmptyFacade
            : SeedBindingUnresolvedReasonType.NotFound;
        result.unresolved.push({
          projectName: project.name,
          missing: SeedBindingKindType.Camera,
          wanted: seed.cameraName,
          reason,
          available: sampleNames(cameraByName),
          hint: buildHint(SeedBindingKindType.Camera, reason, seed.cameraName),
        });
      } else if (project.cameraSettingId !== cam.id) {
        useProjectStore.getState().setProjectCamera(project.id, cam.id);
        result.camerasBound += 1;
      }
    }

    if (seed.micSettingsName) {
      const mic = micByName.get(norm(seed.micSettingsName));

      if (!mic) {
        const reason: SeedBindingUnresolvedReason =
          micRows.length === 0
            ? SeedBindingUnresolvedReasonType.EmptyFacade
            : SeedBindingUnresolvedReasonType.NotFound;
        result.unresolved.push({
          projectName: project.name,
          missing: SeedBindingKindType.MicSettings,
          wanted: seed.micSettingsName,
          reason,
          available: sampleNames(micByName),
          hint: buildHint(SeedBindingKindType.MicSettings, reason, seed.micSettingsName),
        });
      } else if (project.micSettingsId !== mic.id) {
        useProjectStore.getState().setProjectMicSettings(project.id, mic.id);
        result.micSettingsBound += 1;
      }
    }
  }

  if (result.unresolved.length > 0) {
    ClientLogger.warn("[projects/seed-bindings] unresolved bindings", result.unresolved);
  }

  ClientLogger.info("[projects/seed-bindings] applied", {
    camerasBound: result.camerasBound,
    micSettingsBound: result.micSettingsBound,
    unresolved: result.unresolved.length,
  });

  return result;
}
