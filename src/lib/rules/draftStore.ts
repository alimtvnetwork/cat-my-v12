// Plan 90 Step 132. FE IndexedDB draft store for RuleSetEnvelope.
//
// Spec: spec/21-app/80-ruleset-draft-save.md
// BE schema mirror: BE/app/domain/rule_set.py (SCHEMA_VERSION = 1).
//
// Contract:
//   - Every quick edit (drag, keystroke, toggle) in the rule editor calls
//     `putDraft(envelope)` -> writes to IndexedDB under key
//     `rs-draft:<RuleSetId>`. No network round-trip.
//   - The Save button reads the current draft via `getDraft(id)` and POSTs
//     the identical PascalCase envelope to `PUT /rules/{id}` (Step 133).
//   - After a successful save, the BE response is written back via
//     `putDraft({..., DraftMeta.Origin: "server"})` so the draft store
//     always reflects the last-known-committed snapshot.
//
// This module is a browser seam. Do NOT import in server functions.
// PascalCase field names are the wire contract - do NOT camelCase them.

import { get, set, del, keys } from "idb-keyval";

export const RULESET_SCHEMA_VERSION = 1 as const;

export enum RuleKindType {
  Presence = "presence",
  Absence = "absence",
  Match = "match",
  Measure = "measure",
}
export type RuleKind = RuleKindType;
export enum ToleranceKindType {
  Pct = "pct",
  Abs = "abs",
}
export type ToleranceKind = ToleranceKindType;
export enum DraftOriginType {
  Indexeddb = "indexeddb",
  Server = "server",
}
export type DraftOrigin = DraftOriginType;

export interface Shape {
  Type: string;
  X: number;
  Y: number;
  W: number;
  H: number;
}

export interface Tolerance {
  Kind: ToleranceKind;
  Value: number;
}

export interface RuleItem {
  Id: number;
  Kind: RuleKind;
  Enabled: boolean;
  Shape: Shape;
  Tolerance: Tolerance;
  Params: Record<string, unknown>;
}

export interface DraftMeta {
  ClientId: string;
  UpdatedAt: string; // ISO-8601 UTC
  Origin: DraftOrigin;
}

export interface RuleSetEnvelope {
  SchemaVersion: 1;
  RuleSetId: number;
  Name: string;
  Version: number;
  Enabled: boolean;
  Rules: RuleItem[];
  DraftMeta: DraftMeta;
}

const KEY_PREFIX = "rs-draft:";

function keyOf(ruleSetId: number): string {
  if (Number.isInteger(ruleSetId) === false || ruleSetId < 0) {
    throw new Error(`draftStore: invalid RuleSetId ${ruleSetId}`);
  }

  return `${KEY_PREFIX}${ruleSetId}`;
}

/** Guard against writing a payload that would fail BE `parse_envelope`. */
function assertValid(env: RuleSetEnvelope): void {
  if (env.SchemaVersion !== RULESET_SCHEMA_VERSION) {
    throw new Error(`draftStore: SchemaVersion must be ${RULESET_SCHEMA_VERSION}`);
  }

  if (Number.isInteger(env.RuleSetId) === false || env.RuleSetId < 0) {
    throw new Error("draftStore: RuleSetId must be non-negative int");
  }

  if (Number.isInteger(env.Version) === false || env.Version < 0) {
    throw new Error("draftStore: Version must be non-negative int");
  }

  if (typeof env.Name !== "string" || env.Name.trim() === "") {
    throw new Error("draftStore: Name must be non-empty string");
  }

  if (typeof env.Enabled !== "boolean") {
    throw new Error("draftStore: Enabled must be bool");
  }

  if (Array.isArray(env.Rules) === false) {
    throw new Error("draftStore: Rules must be array");
  }

  const seen = new Set<number>();
  for (const r of env.Rules) {
    if (Number.isInteger(r.Id) === false || r.Id <= 0) {
      throw new Error("draftStore: Rules[].Id must be positive int");
    }

    if (seen.has(r.Id)) {
      throw new Error(`draftStore: duplicate Rules[].Id ${r.Id}`);
    }

    seen.add(r.Id);
  }

  const dm = env.DraftMeta;

  if (!dm || typeof dm.ClientId !== "string" || dm.ClientId === "") {
    throw new Error("draftStore: DraftMeta.ClientId required");
  }

  if (typeof dm.UpdatedAt !== "string" || dm.UpdatedAt.includes("T") === false) {
    throw new Error("draftStore: DraftMeta.UpdatedAt must be ISO-8601");
  }

  if (dm.Origin !== "indexeddb" && dm.Origin !== "server") {
    throw new Error("draftStore: DraftMeta.Origin invalid");
  }
}

/** Write (or overwrite) a draft. Refreshes UpdatedAt automatically. */
export async function putDraft(env: RuleSetEnvelope): Promise<RuleSetEnvelope> {
  const stamped: RuleSetEnvelope = {
    ...env,
    DraftMeta: {
      ...env.DraftMeta,
      UpdatedAt: env.DraftMeta.UpdatedAt || new Date().toISOString(),
    },
  };
  assertValid(stamped);
  await set(keyOf(stamped.RuleSetId), stamped);

  return stamped;
}

/** Read the current draft; returns null when no draft has been saved yet. */
export async function getDraft(ruleSetId: number): Promise<RuleSetEnvelope | null> {
  const raw = await get<RuleSetEnvelope>(keyOf(ruleSetId));

  return raw ?? null;
}

/** Drop a draft (e.g. after a successful server commit reconciliation). */
export async function deleteDraft(ruleSetId: number): Promise<void> {
  await del(keyOf(ruleSetId));
}

/** List all local draft ids. Used by Step 135 boot reconciliation. */
export async function listDraftIds(): Promise<number[]> {
  const all = await keys();
  const out: number[] = [];
  for (const k of all) {
    if (typeof k === "string" && k.startsWith(KEY_PREFIX)) {
      const n = Number(k.slice(KEY_PREFIX.length));

      if (Number.isInteger(n)) out.push(n);
    }
  }

  return out.sort((a, b) => a - b);
}
