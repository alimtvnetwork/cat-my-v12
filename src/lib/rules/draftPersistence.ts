import { DraftOriginType } from "@/lib/rules/draftStore";
// Plan 90 Step 141. Editor-mutation -> IndexedDB draft bridge.
//
// Root cause this fixes (one sentence): the ruleset editor commits every
// mutation to `useProjectStore` (zustand + localStorage) but never mirrors
// the change into the IDB draft store, so `reconcileDrafts()` cannot see
// unsaved work and Save conflicts silently discard local edits on reload.
//
// Contract:
//   - `persistRulesetDraft(ruleset, version?)` serializes the legacy
//     ruleset via `projectRulesetToEnvelope` and writes it to IDB with
//     `Origin: "indexeddb"`. Never throws: adapter or IDB failures are
//     logged with the RuleSetId so silent failure is impossible.
//   - Callers pass the last known server `Version` when available so the
//     draft baseline stays aligned with the optimistic-lock cursor;
//     otherwise 0 is used (draft that has never been server-acked).
//   - Debounced per RuleSetId (150 ms) so bursty param drags do not queue
//     one IDB write per keystroke; the last write always wins.

import type { RuleSet } from "@/lib/projects/store";
import { projectRulesetToEnvelope } from "./envelopeAdapter";
import { putDraft } from "./draftStore";

type Timer = ReturnType<typeof setTimeout>;
const timers = new Map<string, Timer>();
const DEBOUNCE_MS = 150;

export interface PersistOptions {
  version?: number;
  /** Bypass debounce (tests / explicit flush). */
  immediate?: boolean;
}

async function writeNow(ruleset: RuleSet, version: number): Promise<void> {
  try {
    const { envelope, droppedCategories } = projectRulesetToEnvelope(ruleset, {
      version,
      origin: DraftOriginType.Indexeddb,
    });
    await putDraft(envelope);
    console.info("[draftPersistence] draft persisted", {
      RuleSetId: envelope.RuleSetId,
      LegacyRuleSetId: ruleset.id,
      Version: envelope.Version,
      Rules: envelope.Rules.length,
      DroppedCategories: droppedCategories,
    });
  } catch (err) {
    console.error("[draftPersistence] failed to persist draft", {
      LegacyRuleSetId: ruleset.id,
      err,
    });
  }
}

export function persistRulesetDraft(ruleset: RuleSet, opts: PersistOptions = {}): void {
  const version = opts.version ?? 0;

  if (opts.immediate) {
    void writeNow(ruleset, version);

    return;
  }

  const key = ruleset.id;
  const existing = timers.get(key);

  if (existing) clearTimeout(existing);
  const t = setTimeout(() => {
    timers.delete(key);
    void writeNow(ruleset, version);
  }, DEBOUNCE_MS);
  timers.set(key, t);
}

/** Test-only: cancel every pending debounced write. */
export function __resetDraftPersistenceForTests(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}
