/**
 * Plan 79 step 40: durable layer state for the editor.
 *
 * Root cause of the bug this addresses (one sentence): the rules-slice
 * mutators (`setHidden`, `setLocked`, `reorderRules`, position/kind
 * updates) never propagate to any facade, so a route change or reload
 * throws away every visibility / lock / order / geometry decision the
 * user just made.
 *
 * Design
 *   - This module is a persistence *side-channel*, not a middleware:
 *     it subscribes to the rules zustand store and writes JSON through
 *     `ProjectRepositoryFacade` (spec 21/52) under a scoped key.
 *   - Hydration is one-shot and idempotent. It only overwrites the
 *     store when persisted data exists; otherwise it lets the caller's
 *     `replaceAll` seed win.
 *   - Writes are debounced (250ms) so rapid drags do not spam IndexedDB.
 *   - The whole thing is opt-in via `enableRulesPersistence(scope)` so
 *     tests and non-editor consumers of `useRulesStore` are unaffected.
 *
 * Observability: every hydrate / write logs through `logger` with the
 * scope + byte size + duration; failures are surfaced, never swallowed.
 */

import { z } from "zod";
import { useRulesStore } from "./rules-slice";
import { logger } from "../errors";
import { makeProjectRepositoryFacade } from "@/lib/projects/facade";
import type { EditorRule } from "../types";
import type { RuleGroup } from "./history-types";

// Full snapshot schema. `unknown` inside params so we never reject an
// otherwise-valid layer state just because a param variant evolved.
const EditorRuleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    kind: z.enum(["C", "R", "K", "S", "E"]),
    isHidden: z.boolean(),
    isLocked: z.boolean(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotation: z.number().optional(),
  })
  .passthrough();

const SnapshotSchema = z.object({
  v: z.literal(1),
  rules: z.array(EditorRuleSchema),
  selectedIds: z.array(z.string()),
  groups: z.array(z.unknown()).default([]),
});

type Snapshot = z.infer<typeof SnapshotSchema>;

const facade = makeProjectRepositoryFacade();
const DEBOUNCE_MS = 250;

function storageKey(scope: string): string {
  return `ca:editor-layers:${scope}:v1`;
}

/**
 * Load persisted layer state and (if present) apply it to the store.
 * Returns `true` when a snapshot was applied, `false` when the store
 * should keep its caller-provided seed.
 */
export async function hydrateRulesFromStorage(scope: string): Promise<boolean> {
  const key = storageKey(scope);
  const started = performance.now();
  const raw = await facade.readItem(key);

  if (!raw) {
    logger.info("I_UI_LAYERS_HYDRATE_EMPTY", { scope });

    return false;
  }

  let parsed: Snapshot;
  try {
    parsed = SnapshotSchema.parse(JSON.parse(raw));
  } catch (err) {
    logger.warn("W_UI_LAYERS_HYDRATE_INVALID", {
      scope,
      reason: err instanceof Error ? err.message : String(err),
    });

    return false;
  }

  useRulesStore.getState().replaceAll(parsed.rules as EditorRule[], parsed.selectedIds);
  logger.info("I_UI_LAYERS_HYDRATED", {
    scope,
    ruleCount: parsed.rules.length,
    selectedCount: parsed.selectedIds.length,
    duration_ms: Math.round(performance.now() - started),
  });

  return true;
}

/**
 * Subscribe to the rules store and write a snapshot on every change.
 * Returns an unsubscribe function.
 */
export function enableRulesPersistence(scope: string): () => void {
  const key = storageKey(scope);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inflight: Promise<void> | null = null;

  const flush = async (): Promise<void> => {
    const state = useRulesStore.getState();
    const snapshot: Snapshot = {
      v: 1,
      rules: state.rules as unknown as Snapshot["rules"],
      selectedIds: state.selectedIds,
      groups: state.groups as unknown as RuleGroup[],
    };
    const started = performance.now();
    const payload = JSON.stringify(snapshot);
    try {
      await facade.writeItem(key, payload);
      logger.info("I_UI_LAYERS_PERSISTED", {
        scope,
        ruleCount: snapshot.rules.length,
        bytes: payload.length,
        duration_ms: Math.round(performance.now() - started),
      });
    } catch (err) {
      logger.error("E_UI_LAYERS_PERSIST_FAILED", {
        scope,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const schedule = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      inflight = flush();
    }, DEBOUNCE_MS);
  };

  const unsub = useRulesStore.subscribe((next, prev) => {
    if (
      next.rules === prev.rules &&
      next.selectedIds === prev.selectedIds &&
      next.groups === prev.groups
    ) {
      return;
    }

    schedule();
  });

  return () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      // Force one final flush so the last mutation isn't lost.
      inflight = flush();
    }

    void inflight;
    unsub();
  };
}

/** Test-only helper: wipe the persisted snapshot for a scope. */
export async function __clearPersistedRulesForTests(scope: string): Promise<void> {
  await facade.removeItem(storageKey(scope));
}