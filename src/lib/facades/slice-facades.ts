// Plan 86 Step 27: remaining 12 slice facade singletons (v2 pipeline).
//
// One module for all non-categories slices. Rationale: every row shape is
// bundle-driven and passthrough, so a per-file split would be pure ceremony.
// The categories facade stays in its own file because Step 35 will wrap the
// legacy category storage there specifically (SS-09 invariant 6).
//
// Row types intentionally minimal (id + a couple of hot fields). The memory
// facade preserves unknown keys via structuredClone, so the bundle can grow
// without touching this file. Deep per-field typing lives with each domain's
// domain-facing hooks, not here.

import type { DomainRow } from "./domain-facade";
import { createMemoryDomainFacade } from "./memory-domain-facade";

// --- Master-data slices (no profileId on bundle rows) ----------------------

export interface CameraRow extends DomainRow {
  readonly id: string;
  readonly name: string;
}

export interface MicSettingRow extends DomainRow {
  readonly id: string;
  readonly name: string;
}

export interface SwatchRow extends DomainRow {
  readonly id: string;
  readonly name: string;
  readonly hex: string;
}

export interface PropertyPresetRow extends DomainRow {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
}

export interface SettingRow extends DomainRow {
  readonly id: string;
  readonly key: string;
}

export interface RulesetRow extends DomainRow {
  readonly id: string;
  readonly name: string;
}

export interface RuleRow extends DomainRow {
  readonly id: string;
  readonly name: string;
}

export interface CommandRow extends DomainRow {
  readonly id: string;
  readonly label?: string;
  readonly title?: string;
  readonly hotkey?: string | null;
  readonly group?: string;
  readonly action?: string;
  readonly icon?: string;
  readonly order?: number;
  readonly args?: Record<string, unknown>;
}

export interface EmptyStateRow extends DomainRow {
  readonly id: string;
  readonly surface: string;
  readonly title?: string;
  readonly body?: string;
  readonly ctaLabel?: string | null;
  readonly ctaCommandId?: string | null;
  readonly ctaArgs?: Record<string, unknown> | null;
}

export interface ErrorScenarioRow extends DomainRow {
  readonly id: string;
  readonly code: string;
  readonly surface?: string;
  readonly severity?: "critical" | "error" | "warning" | "info";
  readonly message?: string;
  readonly hint?: string;
}

// --- Per-profile slices (bundle rows carry profileId) ----------------------

export interface ProjectRow extends DomainRow {
  readonly id: string;
  readonly name: string;
  readonly profileId?: string;
}

export interface SampleRow extends DomainRow {
  readonly id: string;
  readonly projectId?: string;
  readonly profileId?: string;
}

// --- Singletons (stable references for useSyncExternalStore + orchestrator) --

export const camerasFacade = createMemoryDomainFacade<CameraRow>("cameras");
export const micSettingsFacade = createMemoryDomainFacade<MicSettingRow>("micSettings");
export const swatchesFacade = createMemoryDomainFacade<SwatchRow>("swatches");
export const propertyPresetsFacade = createMemoryDomainFacade<PropertyPresetRow>("propertyPresets");
export const settingsFacade = createMemoryDomainFacade<SettingRow>("settings");
export const projectsFacade = createMemoryDomainFacade<ProjectRow>("projects");
export const samplesFacade = createMemoryDomainFacade<SampleRow>("samples");
export const rulesetsFacade = createMemoryDomainFacade<RulesetRow>("rulesets");
export const rulesFacade = createMemoryDomainFacade<RuleRow>("rules");
export const commandsFacade = createMemoryDomainFacade<CommandRow>("commands");
export const emptyStatesFacade = createMemoryDomainFacade<EmptyStateRow>("emptyStates");
export const errorScenariosFacade = createMemoryDomainFacade<ErrorScenarioRow>("errorScenarios");
