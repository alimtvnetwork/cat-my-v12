// Plan 86 Step 22: DomainFacade<T> contract.
//
// Frozen by:
//   .lovable/plans/subtasks/86-ui-v4-json-seed-facade-completion/
//     SS-09-facade-contract-additions.md
//
// This is the SINGLE seam every per-slice facade (projects, categories,
// rulesets, rules, cameras, micSettings, samples, swatches, propertyPresets,
// settings, commands, emptyStates, errorScenarios) MUST implement.
//
// Rules (see SS-09 "Invariants"):
//   1. Profile isolation: every seeded record carries `profile: <prof-id>`;
//      `upsertMany` and `resetProfile` operate strictly within that scope.
//      User-created records (no `profile`) are invisible to `resetProfile`
//      and untouched by `upsertMany`.
//   2. Id-keyed upsert: matches on SS-08 stable ids; duplicate ids in a
//      single call are a validation error, not last-write-wins.
//   3. Dependency order is orchestrator-owned (SS-09 point 3), not per-facade.
//   4. Errors surface through the 3-tier error funnel; no silent swallows.
//   5. UI code imports only from `src/lib/facades/*`; storage primitives
//      never leak into route/component modules (ratchet in Step 40).
//
// Do NOT widen this interface without a plan step: the ratchet is only
// meaningful if the shape is stable.

import type { SliceKey } from "@/lib/seed/schemas-v2";
import type { ReferenceImage } from "@/types/vision/ReferenceImage";

export interface CameraStatusResponse {
  status: "connected" | "disconnected" | "error";
  message?: string;
}

export interface VisionFacade {
  captureImage(cameraId: string): Promise<ReferenceImage>;
  getCameraStatus(cameraId: string): Promise<CameraStatusResponse>;
  getReference(projectId: string): Promise<ReferenceImage | undefined>;
  setReference(projectId: string, imageId: number): Promise<void>;
  updateTriggerMode(cameraId: string, mode: string): Promise<void>;
  updateCameraSetting(cameraId: string, key: string, value: number | string): Promise<void>;
}

/** Every domain row MUST carry a stable id (SS-08 prefixed). */
export interface DomainRow {
  readonly id: string;
  /** Present on seeded rows only. User-created rows omit it (see invariant 1). */
  readonly profile?: string;
}

/** Result of an idempotent bulk-seed write. */
export interface UpsertManyResult {
  created: number;
  updated: number;
  skipped: number;
}

/** Result of a profile-scoped destructive reset. */
export interface ResetProfileResult {
  removed: number;
}

/**
 * The frozen contract every per-slice facade implements. See SS-09.
 * `T` is the slice row shape (e.g. `ProjectRow`, `RuleRow`).
 */
export interface DomainFacade<T extends DomainRow> {
  /** Which slice this facade owns. Matches SS-10 slice keys. */
  readonly slice: SliceKey;

  // ---- Reads ---------------------------------------------------------------
  /** All rows for a profile (or all rows if `profileId` omitted). */
  list(profileId?: string): Promise<T[]>;
  /** Single row by id; resolves to `undefined` on miss (never throws for miss). */
  get(id: string): Promise<T | undefined>;
  /** Cheap count matching `list(profileId)`. */
  count(profileId?: string): Promise<number>;
  /**
   * Plan 86 Step 30 (backward-compatible optional): synchronous snapshot
   * of `list(profileId)` for `useSyncExternalStore` integration. Memory
   * facade implements it. Async SDK facades may omit it, in which case
   * `useFacadeOrStore` returns the fallback branch.
   */
  snapshot?(profileId?: string): T[];

  // ---- Single-row writes (user-facing UI) ----------------------------------
  create(input: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;

  // ---- Seed primitives (orchestrator-only) ---------------------------------
  /**
   * Idempotent bulk write for seeding. Records get tagged with
   * `profile: opts.profileId`. Duplicate ids in `records` MUST throw.
   */
  upsertMany(records: readonly T[], opts: { profileId: string }): Promise<UpsertManyResult>;

  /**
   * Remove every row whose `profile === profileId`. User rows (no profile)
   * are untouched. Never removes rows from other profiles.
   */
  resetProfile(profileId: string): Promise<ResetProfileResult>;

  // ---- Observability -------------------------------------------------------
  /** Notify on any change to this slice. Returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
}

/**
 * Registry type: orchestrator (Step 25) accepts a full mapping of
 * `SliceKey -> DomainFacade`. Kept intentionally loose on the row type
 * because each slice pins its own row shape at the concrete facade.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DomainFacadeRegistry = Partial<Record<SliceKey, DomainFacade<any>>>;
