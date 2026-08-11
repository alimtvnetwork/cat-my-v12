// Plan 86 Step 46 (facade-contract deltas): unified seeded reads for the
// surfaces enumerated by SS-10 (Editors, Palettes, Camera+Mic, Home, CTAs).
//
// Every hook here follows the same shape:
//   1. Subscribe to `active-profile` + the target facade.
//   2. When no v2 profile is active, return an empty list / null so the
//      caller's legacy fallback (hardcoded copy or store) keeps working
//      untouched. This mirrors `useFacadeOrStore` (Step 30).
//   3. When a v2 profile is active, return `facade.snapshot(profile)` rows.
//
// The full 13-slice surface is exposed so no consumer has to reach into
// `slice-facades.ts` directly (Step 40 ratchet).
import { useSyncExternalStore } from "react";
import {
  emptyStatesFacade,
  errorScenariosFacade,
  commandsFacade,
  camerasFacade,
  micSettingsFacade,
  swatchesFacade,
  propertyPresetsFacade,
  settingsFacade,
  projectsFacade,
  samplesFacade,
  rulesetsFacade,
  rulesFacade,
  type EmptyStateRow,
  type ErrorScenarioRow,
  type CommandRow,
  type CameraRow,
  type MicSettingRow,
  type SwatchRow,
  type PropertyPresetRow,
  type SettingRow,
  type ProjectRow,
  type SampleRow,
  type RulesetRow,
  type RuleRow,
} from "@/lib/facades/slice-facades";
import { categoriesFacade, type CategoryRow } from "@/lib/facades/categories-facade";
import type { DomainFacade, DomainRow } from "@/lib/facades/domain-facade";
import { getActiveProfile, subscribeActiveProfile } from "@/lib/seed/active-profile";
import { resolveSampleImageUrl } from "@/lib/seed/sample-image-registry";

function useSeededSlice<T extends DomainRow>(facade: DomainFacade<T>): T[] {
  useSyncExternalStore(
    (onChange) => {
      const unsubProfile = subscribeActiveProfile(onChange);
      const unsubFacade = facade.subscribe(onChange);

      return () => {
        unsubProfile();
        unsubFacade();
      };
    },
    () => {
      const profile = getActiveProfile() ?? "";
      const snap = facade.snapshot?.(profile) ?? [];

      return `${profile}:${snap.length}:${snap.map((r) => r.id).join(",")}`;
    },
    () => "",
  );
  const profile = getActiveProfile();

  if (profile === null) return [];

  return facade.snapshot?.(profile) ?? [];
}

// -- CTAs / empty states / errors / commands (existing) ---------------------

export function useSeededEmptyState(surface: string): EmptyStateRow | null {
  const rows = useSeededSlice(emptyStatesFacade);

  return rows.find((r) => r.surface === surface) ?? null;
}

export function useSeededErrorScenarios(): ErrorScenarioRow[] {
  const rows = useSeededSlice(errorScenariosFacade);
  const severityRank: Record<string, number> = {
    critical: 0,
    error: 1,
    warning: 2,
    info: 3,
  };

  return [...rows].sort((a, b) => {
    const sa =
      severityRank[(a as ErrorScenarioRow & { severity?: string }).severity ?? "info"] ?? 9;
    const sb =
      severityRank[(b as ErrorScenarioRow & { severity?: string }).severity ?? "info"] ?? 9;

    if (sa !== sb) return sa - sb;

    return a.code.localeCompare(b.code);
  });
}

export function useSeededCommands(): CommandRow[] {
  const rows = useSeededSlice(commandsFacade);

  return [...rows].sort((a, b) => {
    const oa = (a as CommandRow & { order?: number }).order ?? 999;
    const ob = (b as CommandRow & { order?: number }).order ?? 999;

    return oa - ob;
  });
}

// -- Camera + Mic (settings surfaces) --------------------------------------

export function useSeededCameras(): CameraRow[] {
  return useSeededSlice(camerasFacade);
}

export function useSeededCamera(id: string | null | undefined): CameraRow | null {
  const rows = useSeededCameras();

  if (!id) return null;

  return rows.find((r) => r.id === id) ?? null;
}

export function useSeededMicSettings(): MicSettingRow[] {
  return useSeededSlice(micSettingsFacade);
}

// -- Palettes (ROI setup, properties, swatches) ----------------------------

export function useSeededSwatches(): SwatchRow[] {
  return useSeededSlice(swatchesFacade);
}

export function useSeededPropertyPresets(kind?: string): PropertyPresetRow[] {
  const rows = useSeededSlice(propertyPresetsFacade);

  return kind ? rows.filter((r) => r.kind === kind) : rows;
}

export function useSeededSettings(): SettingRow[] {
  return useSeededSlice(settingsFacade);
}

export function useSeededSetting(key: string): SettingRow | null {
  const rows = useSeededSettings();

  return rows.find((r) => r.key === key) ?? null;
}

// -- Editors + Home (projects, rulesets, rules, samples, categories) -------

export function useSeededProjects(): ProjectRow[] {
  return useSeededSlice(projectsFacade);
}

export function useSeededProject(id: string | null | undefined): ProjectRow | null {
  const rows = useSeededProjects();

  if (!id) return null;

  return rows.find((r) => r.id === id) ?? null;
}

export function useSeededSamplesForProject(projectId: string | null | undefined): SampleRow[] {
  const rows = useSeededSlice(samplesFacade);
  const scoped = projectId ? rows.filter((r) => r.projectId === projectId) : rows;

  // Plan 85 Step 4: overlay the sample-image-registry URL onto image.dataUrl
  // so the ImageSamples facade surfaces real thumbnails for seeded projects.
  return scoped.map((r) => {
    const url = resolveSampleImageUrl(r.id);

    if (!url) return r;
    const img = (r as SampleRow & { image?: { dataUrl?: string | null } }).image;

    if (img && img.dataUrl) return r; // do not clobber a real captured payload

    return { ...r, image: { ...(img ?? {}), dataUrl: url } } as SampleRow;
  });
}

export function useSeededRulesets(): RulesetRow[] {
  return useSeededSlice(rulesetsFacade);
}

export function useSeededRulesForRuleset(rulesetId: string | null | undefined): RuleRow[] {
  const rows = useSeededSlice(rulesFacade);

  if (!rulesetId) return rows;

  return rows.filter((r) => (r as RuleRow & { rulesetId?: string }).rulesetId === rulesetId);
}

export function useSeededCategories(): CategoryRow[] {
  return useSeededSlice(categoriesFacade);
}