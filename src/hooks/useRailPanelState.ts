// Plan 88 step 4: Right-rail panel hidden-state aggregator.
//
// Each CollapsiblePanelSection owns its own open/hidden flags and mirrors
// them to localStorage under `hmi.rail.panel:<key>.hidden`. That is fine
// for the panel itself but leaves consumers such as WindowMenu (step 8),
// keyboard shortcuts, and telemetry with no single source of truth for
// "which panels are currently hidden?". Scanning the DOM works but is
// racy during hydration, and duplicating the storage-key format across
// call sites would drift the moment the primitive changes.
//
// This hook is that single source of truth:
//   • seeds from localStorage synchronously (SSR-safe: returns empty set
//     when window is undefined),
//   • subscribes to the primitive's `hmi:rail-panel:set-hidden`
//     CustomEvent so intra-tab changes are reflected without polling,
//   • subscribes to the browser `storage` event so cross-tab changes are
//     reflected too,
//   • exposes `restorePanel(key)` / `hidePanel(key)` which dispatch the
//     same event the primitive listens for, so callers never touch
//     localStorage directly.
//
// Errors are logged via the shared editor logger (I_/W_ codes) instead
// of swallowed, per project error-handling rules.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RAIL_PANEL_SET_HIDDEN_EVENT,
  broadcastRailPanelHidden,
  type RailPanelSetHiddenDetail,
} from "@/components/editor/rail/CollapsiblePanelSection";
import { logger } from "@/lib/editor/errors";

const STORAGE_PREFIX = "hmi.rail.panel:";
const HIDDEN_SUFFIX = ".hidden";

/** Read every persisted hidden flag from localStorage into a Set. */
function readInitialHidden(): Set<string> {
  const set = new Set<string>();

  if (typeof window === "undefined") return set;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);

      if (!key || key.startsWith(STORAGE_PREFIX) === false || key.endsWith(HIDDEN_SUFFIX) === false)
        continue;

      if (window.localStorage.getItem(key) !== "1") continue;
      const storageKey = key.slice(STORAGE_PREFIX.length, key.length - HIDDEN_SUFFIX.length);

      if (storageKey) set.add(storageKey);
    }
  } catch (err) {
    logger.warn("W_UI_RAIL_PANEL_STATE_READ_FAILED", {
      message: (err as Error).message,
    });
  }

  return set;
}

export interface UseRailPanelStateResult {
  /** Set of storageKeys that are currently hidden. */
  hiddenPanels: ReadonlySet<string>;
  /** Whether a specific panel is hidden. */
  isHidden: (storageKey: string) => boolean;
  /** Restore (unhide) a panel. */
  restorePanel: (storageKey: string) => void;
  /** Hide a panel. */
  hidePanel: (storageKey: string) => void;
  /** Set hidden explicitly. */
  setPanelHidden: (storageKey: string, hidden: boolean) => void;
}

export function useRailPanelState(): UseRailPanelStateResult {
  // Deterministic SSR initial: empty set. Hydration populates from storage.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  // Seed after mount so SSR + hydration match.
  useEffect(() => {
    setHidden(readInitialHidden());
  }, []);

  // Intra-tab: listen to the primitive's CustomEvent.
  useEffect(() => {
    function onSetHidden(ev: Event) {
      const detail = (ev as CustomEvent<RailPanelSetHiddenDetail>).detail;

      if (!detail || !detail.storageKey) return;
      setHidden((prev) => {
        const next = new Set(prev);

        if (detail.hidden) next.add(detail.storageKey);
        else next.delete(detail.storageKey);

        return next;
      });
    }

    window.addEventListener(RAIL_PANEL_SET_HIDDEN_EVENT, onSetHidden);

    return () => window.removeEventListener(RAIL_PANEL_SET_HIDDEN_EVENT, onSetHidden);
  }, []);

  // Cross-tab: listen to the browser storage event.
  useEffect(() => {
    function onStorage(ev: StorageEvent) {
      if (
        !ev.key ||
        ev.key.startsWith(STORAGE_PREFIX) === false ||
        ev.key.endsWith(HIDDEN_SUFFIX) === false
      )
        return;
      const storageKey = ev.key.slice(STORAGE_PREFIX.length, ev.key.length - HIDDEN_SUFFIX.length);

      if (!storageKey) return;
      setHidden((prev) => {
        const next = new Set(prev);

        if (ev.newValue === "1") next.add(storageKey);
        else next.delete(storageKey);

        return next;
      });
    }

    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPanelHidden = useCallback((storageKey: string, next: boolean) => {
    if (!storageKey) {
      logger.warn("W_UI_RAIL_PANEL_STATE_EMPTY_KEY", { hidden: next });

      return;
    }

    broadcastRailPanelHidden(storageKey, next);
    logger.info("I_UI_RAIL_PANEL_SET_HIDDEN", { storageKey, hidden: next });
  }, []);

  const restorePanel = useCallback(
    (storageKey: string) => setPanelHidden(storageKey, false),
    [setPanelHidden],
  );
  const hidePanel = useCallback(
    (storageKey: string) => setPanelHidden(storageKey, true),
    [setPanelHidden],
  );
  const isHidden = useCallback((storageKey: string) => hidden.has(storageKey), [hidden]);

  return useMemo(
    () => ({ hiddenPanels: hidden, isHidden, restorePanel, hidePanel, setPanelHidden }),
    [hidden, isHidden, restorePanel, hidePanel, setPanelHidden],
  );
}
