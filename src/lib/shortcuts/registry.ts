import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Shortcut registry for Plan 100 §13. Single source of truth consumed by
 * ShortcutProvider (dispatch), ShortcutCheatSheet (listing), and
 * AltMnemonicLayer (Alt letter highlights).
 *
 * See spec/21-app/53-ui-improvements-v4.md §13 and
 * .lovable/spec/commands/29-fullscreen-and-shortcut-conventions.md.
 *
 * Error surfacing: duplicate ids emit a dev warning routed through
 * console.warn with {shortcutId, existingScope, incomingScope}. Handlers
 * that throw are caught and forwarded to showToastError so a broken
 * shortcut cannot silently swallow user input (per §21).
 */
import { useEffect, useState } from "react";
import { scopeRank, type ShortcutScopeType } from "./scopes";

export interface ShortcutDefinition {
  id: string;
  scope: ShortcutScopeType;
  combo: string;
  label: string;
  group: string;
  when?: () => boolean;
  run: (event: KeyboardEvent) => void;
}

type Listener = () => void;

const shortcuts = new Map<string, ShortcutDefinition>();
const listeners = new Set<Listener>();
let snapshot: ShortcutDefinition[] = [];

function emit(): void {
  snapshot = Array.from(shortcuts.values());
  for (const listener of listeners) listener();
}

export function registerShortcut(def: ShortcutDefinition): () => void {
  const existing = shortcuts.get(def.id);

  if (existing && existing.scope !== def.scope) {
    // Dev observability: duplicate id across scopes is almost always a bug.
    ClientLogger.warn("[shortcuts] duplicate id", {
      shortcutId: def.id,
      existingScope: existing.scope,
      incomingScope: def.scope,
    });
  }

  shortcuts.set(def.id, def);
  emit();

  return () => {
    const current = shortcuts.get(def.id);

    if (current === def) {
      shortcuts.delete(def.id);
      emit();
    }
  };
}

export function listShortcuts(): ShortcutDefinition[] {
  return snapshot;
}

/**
 * Plan 100 Phase F step 57: dev-time duplicate combo audit.
 *
 * Returns groups of shortcuts that share the exact same `combo + scope`,
 * which almost always indicates a collision (only one handler will win
 * via `resolveShortcut`, the others are dead code). Route-scoped clashes
 * across different routes are NOT flagged, because only one route is
 * active at a time.
 *
 * A key of `"scope::combo"` is used so callers can render deterministic
 * headings. `console.warn` is emitted once per detection call so silent
 * conflicts fail loudly per V4 spec §21.
 */
export interface DuplicateComboGroup {
  key: string;
  scope: ShortcutScopeType;
  combo: string;
  defs: ShortcutDefinition[];
}

const warnedCollisions = new Set<string>();

export function listDuplicateCombos(options: { warn?: boolean } = {}): DuplicateComboGroup[] {
  const byKey = new Map<string, DuplicateComboGroup>();
  for (const def of shortcuts.values()) {
    const key = `${def.scope}::${def.combo}`;
    let group = byKey.get(key);

    if (!group) {
      group = { key, scope: def.scope, combo: def.combo, defs: [] };
      byKey.set(key, group);
    }

    group.defs.push(def);
  }

  const dupes: DuplicateComboGroup[] = [];
  for (const group of byKey.values()) {
    if (group.defs.length > 1) {
      dupes.push(group);
      const signature = `${group.key}::${group.defs
        .map((d) => d.id)
        .sort()
        .join(",")}`;

      if (options.warn !== false && warnedCollisions.has(signature) === false) {
        warnedCollisions.add(signature);
        ClientLogger.warn("[shortcuts] combo collision", {
          scope: group.scope,
          combo: group.combo,
          ids: group.defs.map((d) => d.id),
        });
      }
    }
  }

  return dupes;
}

/** React hook mirror of `listDuplicateCombos` that recomputes on registry changes. */
export function useDuplicateCombos(): DuplicateComboGroup[] {
  const defs = useShortcuts();
  void defs;

  return listDuplicateCombos({ warn: true });
}

/**
 * Resolve which shortcut wins for a given combo, honoring scope precedence
 * (lower rank number wins) and each shortcut's `when` predicate.
 */
export function resolveShortcut(
  combo: string,
  activeRouteScope?: ShortcutScopeType,
): ShortcutDefinition | undefined {
  let best: ShortcutDefinition | undefined;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const def of shortcuts.values()) {
    if (def.combo !== combo) continue;

    if (def.scope.startsWith("route:") && def.scope !== activeRouteScope) continue;

    if (def.when && def.when() === false) continue;
    const rank = scopeRank(def.scope);

    if (rank < bestRank) {
      best = def;
      bestRank = rank;
    }
  }

  return best;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ShortcutDefinition[] {
  return snapshot;
}

/** React hook: subscribe to the registry so cheat sheet re-renders on register/unregister. */
export function useShortcuts(): ShortcutDefinition[] {
  const [defs, setDefs] = useState(getSnapshot);
  useEffect(() => subscribe(() => setDefs(getSnapshot())), []);

  return defs;
}
