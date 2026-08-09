import { EditorRuleKindType } from "@/lib/editor/types";
import { ToleranceKindType } from "@/lib/rules/draftStore";
import { DraftOriginType } from "@/lib/rules/draftStore";
// Plan 90 Step 139. Envelope adapter: legacy `useProjectStore` RuleSet
// (with EditorRule[]) -> `RuleSetEnvelope` (Step 132 wire contract).
//
// Root cause this closes: Steps 132-138 built the entire draft ->
// save -> reconcile -> boot-toast chain on top of `RuleSetEnvelope`,
// but no code produced one. The editor writes `EditorRule[]` into
// `useProjectStore` and nothing calls `putDraft`, so `reconcileDrafts`
// walks an empty key set and the whole pipeline is inert in real use.
// This module is the single seam that converts the legacy in-memory
// shape into the wire envelope so the Save button (Step 140) can
// serialize it verbatim to `PUT /rules/{id}`.
//
// Scope (deliberate):
//   - Forward only: `projectRulesetToEnvelope`. Reverse mapping
//     (`envelopeToProjectRuleset`) lands in Step 142 alongside the
//     SQLite `RuleFacade` because that is when server-committed data
//     first re-enters the editor.
//   - Lossy fields (EditorRule.kind letter, isHidden, isLocked,
//     rotation, family, sourceRuleId) are preserved verbatim under
//     namespaced `_Legacy*` keys in `RuleItem.Params` so a future
//     reverse mapping is deterministic and no editor state is silently
//     dropped on save.
//   - Category rows (`isCategory: true`) are structural in the legacy
//     store and are NOT part of `RuleSetEnvelope.Rules`. They are
//     recorded under `DraftMeta.ClientId` context via a summary log
//     line so operators can see when they are stripped.
//
// EditorRuleKind -> RuleKind mapping (PROVISIONAL, documented as such
// in spec/21-app/80-ruleset-draft-save.md; each letter maps to the
// closest domain kind so wire validation passes and Params preserve
// the raw letter for a lossless reverse mapping in Step 142):
//   C ("check")   -> "match"
//   R ("region")  -> "presence"
//   K ("keep")    -> "match"
//   S ("skip")    -> "absence"
//   E ("exact")   -> "measure"

import type { EditorRule, EditorRuleKind } from "../editor/types";
import type { RuleSet } from "../projects/store";
import {
  RULESET_SCHEMA_VERSION,
  RuleKindType,
  type RuleSetEnvelope,
  type RuleItem,
  type RuleKind,
  type DraftOrigin,
} from "./draftStore";
import { toIntId } from "./rule-id-alias";
import { fromRulesetIntId, toRulesetIntId } from "./ruleset-id-alias";

const KIND_MAP: Record<EditorRuleKind, RuleKind> = {
  C: RuleKindType.Match,
  R: RuleKindType.Presence,
  K: RuleKindType.Match,
  S: RuleKindType.Absence,
  E: RuleKindType.Measure,
};

const CLIENT_ID_STORAGE_KEY = "ca.envelopeClientId.v1";

function getOrCreateClientId(): string {
  if (typeof window === "undefined") {
    // Deterministic SSR fallback so wire tests don't flake; real
    // browser calls always mint (or read) a UUID.
    return "ssr-client";
  }

  try {
    const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);

    if (existing) return existing;
  } catch (err) {
    console.warn("[envelopeAdapter] clientId read failed", err);
  }

  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const id =
    g.crypto?.randomUUID?.() ??
    `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
  } catch (err) {
    console.warn("[envelopeAdapter] clientId write failed", err);
  }

  return id;
}

export interface ToEnvelopeOptions {
  /**
   * Version to stamp into the envelope. Callers own optimistic-lock
   * semantics: pass the last-known server Version (or 0 for a
   * never-saved ruleset). Defaults to 0 so a fresh save is treated as
   * "create-or-fail" by the BE.
   */
  version?: number;
  /**
   * Draft origin. Defaults to `"indexeddb"` because the primary caller
   * writes editor state; pass `"server"` only when mirroring a fetch
   * response back into IDB.
   */
  origin?: DraftOrigin;
  /**
   * Injected clock (ISO-8601 UTC). Test seam.
   */
  now?: () => string;
  /**
   * Injected clientId. Test seam.
   */
  clientId?: string;
}

export interface AdapterResult {
  envelope: RuleSetEnvelope;
  /** Count of `isCategory` rows that were stripped (not part of wire). */
  droppedCategories: number;
}

/**
 * Convert a legacy `RuleSet` (EditorRule[] from `useProjectStore`) into
 * a wire-ready `RuleSetEnvelope`. Never throws for lossless fields; if
 * the ruleset name is empty the BE-rejecting envelope is still returned
 * so the caller's Save flow surfaces the wire error rather than this
 * seam swallowing it.
 */
export function projectRulesetToEnvelope(
  ruleset: RuleSet,
  opts: ToEnvelopeOptions = {},
): AdapterResult {
  const now = opts.now ?? (() => new Date().toISOString());
  const clientId = opts.clientId ?? getOrCreateClientId();

  let droppedCategories = 0;
  const items: RuleItem[] = [];

  for (const r of ruleset.rules) {
    if (r.isCategory === true) {
      droppedCategories += 1;
      continue;
    }

    const kind = KIND_MAP[r.kind];

    if (!kind) {
      // Unknown letter: log + skip. Do NOT default silently; a new
      // EditorRuleKind must be mapped explicitly here.
      console.warn("[envelopeAdapter] unknown EditorRuleKind, skipping rule", {
        RuleId: r.id,
        Kind: r.kind,
      });
      continue;
    }

    const params: Record<string, unknown> = { ...(r.params ?? {}) };
    // Lossless-reverse metadata under a namespaced prefix.
    params._LegacyId = r.id;
    params._LegacyKind = r.kind;

    if (r.rotation !== undefined) params._Rotation = r.rotation;

    if (r.family !== undefined) params._Family = r.family;

    if (r.sourceRuleId !== undefined) params._SourceRuleId = r.sourceRuleId;
    params._IsHidden = r.isHidden;
    params._IsLocked = r.isLocked;

    items.push({
      Id: toIntId(r.id),
      Kind: kind,
      Enabled: !r.isHidden,
      Shape: {
        Type: "rect",
        X: r.x,
        Y: r.y,
        W: r.width,
        H: r.height,
      },
      Tolerance: { Kind: ToleranceKindType.Pct, Value: 5 },
      Params: params,
    });
  }

  const envelope: RuleSetEnvelope = {
    SchemaVersion: RULESET_SCHEMA_VERSION,
    RuleSetId: toRulesetIntId(ruleset.id),
    Name: ruleset.name,
    Version: opts.version ?? 0,
    Enabled: true,
    Rules: items,
    DraftMeta: {
      ClientId: clientId,
      UpdatedAt: now(),
      Origin: opts.origin ?? DraftOriginType.Indexeddb,
    },
  };

  console.info("[envelopeAdapter] serialized", {
    RuleSetId: envelope.RuleSetId,
    LegacyRuleSetId: ruleset.id,
    Rules: envelope.Rules.length,
    DroppedCategories: droppedCategories,
    Version: envelope.Version,
  });

  return { envelope, droppedCategories };
}

// ============================================================================
// Plan 90 Step 142. Reverse adapter.
// ----------------------------------------------------------------------------
// Rebuild a legacy `RuleSet` (as consumed by `useProjectStore`) from a
// server-committed `RuleSetEnvelope`. Used by:
//   - the reload-server conflict resolver, after `loadRuleSet()` mirrors
//     the envelope into IDB, to rebind `useRulesStore.replaceAll(...)`.
//   - `reconcileDrafts()` when the server is authoritative and we want to
//     hydrate the editor from the wire shape without going through
//     localStorage.
//
// Lossless fields (rehydrated verbatim from `_Legacy*` params, added by
// the forward adapter): kind letter, isHidden, isLocked, rotation,
// family, sourceRuleId. Fields the wire doesn't carry (Shape.Type
// beyond "rect", Tolerance.Kind/Value, non-`_Legacy` params) are
// preserved for round-trip stability by dropping only the `_Legacy*`
// namespaced keys back out of `params`.
//
// Category rows are NOT reconstructed; the forward adapter documents
// that they are structural and not part of the wire.
// ============================================================================

const REVERSE_KIND: Record<string, EditorRuleKind> = {
  C: EditorRuleKindType.C,
  R: EditorRuleKindType.R,
  K: EditorRuleKindType.K,
  S: EditorRuleKindType.S,
  E: EditorRuleKindType.E,
};

export interface FromEnvelopeOptions {
  /** Required: which project this ruleset belongs to. */
  projectId: string;
  /** Optional legacy category name (`RuleSet.categoryName`). Defaults to "". */
  categoryName?: string;
  /**
   * Optional override for the string ruleset id. If omitted, we reverse
   * via `fromRulesetIntId`; if that alias is missing we fall back to a
   * deterministic string derived from the integer id so the caller can
   * always mount a route even for envelopes that were minted on a
   * different device.
   */
  rulesetId?: string;
}

function reverseRulesetId(intId: number, override?: string): string {
  if (override && override.length > 0) return override;
  const found = fromRulesetIntId(intId);

  if (found) return found;

  return `rs-${intId}`;
}

export function envelopeToProjectRuleset(
  envelope: RuleSetEnvelope,
  opts: FromEnvelopeOptions,
): RuleSet {
  const rulesetId = reverseRulesetId(envelope.RuleSetId, opts.rulesetId);
  const rules: EditorRule[] = [];
  let unknownKind = 0;

  for (const item of envelope.Rules) {
    const params: Record<string, unknown> = { ...(item.Params ?? {}) };
    const legacyId = typeof params._LegacyId === "string" ? (params._LegacyId as string) : null;
    const legacyKindRaw =
      typeof params._LegacyKind === "string" ? (params._LegacyKind as string) : null;
    const rotation =
      typeof params._Rotation === "number" ? (params._Rotation as number) : undefined;
    const family =
      typeof params._Family === "string" ? (params._Family as EditorRule["family"]) : undefined;
    const sourceRuleId =
      typeof params._SourceRuleId === "string" ? (params._SourceRuleId as string) : undefined;
    const isHidden =
      typeof params._IsHidden === "boolean" ? (params._IsHidden as boolean) : !item.Enabled;
    const isLocked = typeof params._IsLocked === "boolean" ? (params._IsLocked as boolean) : false;

    // Prefer the round-tripped letter; fall back to reverse-mapping the
    // wire Kind (best-effort — the forward map is many-to-one for
    // "match", so without `_LegacyKind` we default to "C").
    let kind: EditorRuleKind;

    if (legacyKindRaw && REVERSE_KIND[legacyKindRaw]) {
      kind = REVERSE_KIND[legacyKindRaw];
    } else {
      unknownKind += 1;
      kind =
        item.Kind === "presence"
          ? EditorRuleKindType.R
          : item.Kind === "absence"
            ? EditorRuleKindType.S
            : item.Kind === "measure"
              ? EditorRuleKindType.E
              : EditorRuleKindType.C;
    }

    for (const k of [
      "_LegacyId",
      "_LegacyKind",
      "_Rotation",
      "_Family",
      "_SourceRuleId",
      "_IsHidden",
      "_IsLocked",
    ]) {
      delete params[k];
    }
    // At this point `params` is EditorRuleParams-shaped (string|number|boolean values),
    // per the forward adapter's contract. Coerce type for the return shape.
    const cleanParams = params as EditorRule["params"];

    rules.push({
      id: legacyId ?? `r-int-${item.Id}`,
      name: legacyId ?? `rule-${item.Id}`,
      kind,
      family,
      isHidden,
      isLocked,
      x: item.Shape.X,
      y: item.Shape.Y,
      width: item.Shape.W,
      height: item.Shape.H,
      params: cleanParams,
      sourceRuleId,
      rotation,
    });
  }

  console.info("[envelopeAdapter] deserialized", {
    RuleSetId: envelope.RuleSetId,
    LegacyRuleSetId: rulesetId,
    Rules: rules.length,
    UnknownKindFallbacks: unknownKind,
    Version: envelope.Version,
  });

  return {
    id: rulesetId,
    projectId: opts.projectId,
    name: envelope.Name,
    categoryName: opts.categoryName ?? "",
    rules,
  };
}
