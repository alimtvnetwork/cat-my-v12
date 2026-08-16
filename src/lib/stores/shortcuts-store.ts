import { ClientLogger } from "@/lib/observability/client-logger";
// Keyboard shortcut registry + user overrides.
//
// One source of truth for the V/R/C/M/T/O/B/F/J bindings surfaced in
// `HmiShell` and `ShortcutsDialog`, plus a settings screen that lets the
// operator remap or reset them. Overrides persist in localStorage
// (StorageKey.Shortcuts); the store is SSR-safe and only reads from
// `window` inside a guard.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { StorageKey } from "@/lib/constants";
import { createFacadeStateStorage } from "@/lib/projects/facade";
import { wireCrossTabRehydrate } from "@/lib/projects/cross-tab";

export enum ShortcutActionIdType {
  Validate = "validate",
  AddRuleRect = "add-rule-rect",
  AddRuleCircle = "add-rule-circle",
  DesignMode = "design-mode",
  ToggleTools = "toggle-tools",
  OpenRecent = "open-recent",
  AddRuleBlob = "add-rule-blob",
  AddRuleFlaw = "add-rule-flaw",
  AddRuleJs = "add-rule-js",
}
export type ShortcutActionId = ShortcutActionIdType;

export interface ShortcutActionSpec {
  id: ShortcutActionId;
  label: string;
  description: string;
  defaultCombo: string;
}

export const SHORTCUT_ACTIONS: readonly ShortcutActionSpec[] = [
  {
    id: ShortcutActionIdType.Validate,
    label: "Validate rule against image",
    description: "Runs the active ruleset against the reference image.",
    defaultCombo: "v",
  },
  {
    id: ShortcutActionIdType.AddRuleRect,
    label: "Add Rectangle rule",
    description: "Inserts a Rectangle rule and opens it for editing.",
    defaultCombo: "r",
  },
  {
    id: ShortcutActionIdType.AddRuleCircle,
    label: "Add Circle rule",
    description: "Inserts a Circle rule and opens it for editing.",
    defaultCombo: "c",
  },
  {
    id: ShortcutActionIdType.DesignMode,
    label: "Toggle Design Mode overlay",
    description: "Shows/hides the design-mode diagnostic overlay.",
    defaultCombo: "m",
  },
  {
    id: ShortcutActionIdType.ToggleTools,
    label: "Toggle Tools palette",
    description: "Docks or hides the Tools palette.",
    defaultCombo: "t",
  },
  {
    id: ShortcutActionIdType.OpenRecent,
    label: "Open Recent projects",
    description: "Jumps to the Projects list.",
    defaultCombo: "o",
  },
  {
    id: ShortcutActionIdType.AddRuleBlob,
    label: "Add Blob detection rule",
    description: "Inserts a Blob detection rule.",
    defaultCombo: "b",
  },
  {
    id: ShortcutActionIdType.AddRuleFlaw,
    label: "Add Flaw detection rule",
    description: "Inserts a Flaw detection rule.",
    defaultCombo: "f",
  },
  {
    id: ShortcutActionIdType.AddRuleJs,
    label: "Add JS Function rule",
    description: "Inserts a JavaScript function rule.",
    defaultCombo: "j",
  },
];

const DEFAULTS: Record<ShortcutActionId, string> = SHORTCUT_ACTIONS.reduce(
  (acc, spec) => {
    acc[spec.id] = spec.defaultCombo;

    return acc;
  },
  {} as Record<ShortcutActionId, string>,
);

const VALID_MODS = new Set(["mod", "meta", "ctrl", "shift", "alt"]);

/**
 * Normalise a combo string to lowercase, dedupe modifiers, and sort them
 * in a stable order so `Shift+Ctrl+k` and `ctrl+shift+K` compare equal.
 * Returns `null` if the combo is empty or refers to a bare modifier key.
 */
export function normalizeCombo(raw: string): string | null {
  const parts = raw
    .toLowerCase()
    .split("+")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 0) return null;
  const key = parts[parts.length - 1];

  if (!key || VALID_MODS.has(key)) return null;
  const mods = new Set(parts.slice(0, -1).filter((p) => VALID_MODS.has(p)));
  const order = ["mod", "meta", "ctrl", "alt", "shift"];
  const sorted = order.filter((m) => mods.has(m));

  return [...sorted, key].join("+");
}

/**
 * Build a combo string from a keyboard event. Bare modifier keydowns
 * (Shift, Control, Meta, Alt) return `null` so the recorder can wait for
 * the "real" key.
 */
export function comboFromEvent(event: KeyboardEvent): string | null {
  const key = event.key;

  if (key === "Shift" || key === "Control" || key === "Meta" || key === "Alt") return null;
  const parts: string[] = [];

  if (event.metaKey) parts.push("meta");

  if (event.ctrlKey) parts.push("ctrl");

  if (event.altKey) parts.push("alt");

  if (event.shiftKey) parts.push("shift");
  parts.push(key.toLowerCase());

  return normalizeCombo(parts.join("+"));
}

function coerceOverrides(input: unknown): Partial<Record<ShortcutActionId, string>> {
  if (!input || typeof input !== "object") return {};
  const out: Partial<Record<ShortcutActionId, string>> = {};
  for (const spec of SHORTCUT_ACTIONS) {
    const v = (input as Record<string, unknown>)[spec.id];

    if (typeof v === "string") {
      const norm = normalizeCombo(v);

      if (norm) out[spec.id] = norm;
    }
  }

  return out;
}

export interface ShortcutsState {
  /** Effective combo per action (defaults merged with overrides). */
  bindings: Record<ShortcutActionId, string>;
  /** Set an override. Pass `null` or a defaulting value to remove. */
  setBinding: (id: ShortcutActionId, combo: string | null) => void;
  /** Reset one action to its factory default. */
  reset: (id: ShortcutActionId) => void;
  /** Reset every action to its factory default. */
  resetAll: () => void;
}

function mergeWithOverrides(
  overrides: Partial<Record<ShortcutActionId, string>>,
): Record<ShortcutActionId, string> {
  const out = { ...DEFAULTS };
  for (const [k, v] of Object.entries(overrides)) {
    if (typeof v === "string") out[k as ShortcutActionId] = v;
  }

  return out;
}

function deriveOverrides(
  bindings: Record<ShortcutActionId, string>,
): Partial<Record<ShortcutActionId, string>> {
  const overrides: Partial<Record<ShortcutActionId, string>> = {};
  for (const spec of SHORTCUT_ACTIONS) {
    if (bindings[spec.id] !== DEFAULTS[spec.id]) overrides[spec.id] = bindings[spec.id];
  }

  return overrides;
}

// Plan 80 step 32: route persistence through the SDK facade (spec 21/52).
// Legacy `ca.shortcuts.v1` persisted a flat overrides object; the zustand
// persist envelope wraps state in `{ state, version }`. `merge` below
// tolerates both shapes so operators don't lose remapped combos on the
// first read after upgrade.
export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set, get) => ({
      bindings: { ...DEFAULTS },
      setBinding: (id, combo) => {
        const bindings = { ...get().bindings };

        if (combo === null) {
          bindings[id] = DEFAULTS[id];
        } else {
          const norm = normalizeCombo(combo);

          if (!norm) {
            ClientLogger.warn("[shortcuts-store] rejected invalid combo", { id, combo });

            return;
          }

          bindings[id] = norm;
        }

        set({ bindings });
        ClientLogger.info("[shortcuts-store] setBinding", { id, combo: bindings[id] });
      },
      reset: (id) => {
        set({ bindings: { ...get().bindings, [id]: DEFAULTS[id] } });
        ClientLogger.info("[shortcuts-store] reset", { id, combo: DEFAULTS[id] });
      },
      resetAll: () => {
        set({ bindings: { ...DEFAULTS } });
        ClientLogger.info("[shortcuts-store] resetAll");
      },
    }),
    {
      name: StorageKey.Shortcuts,
      storage: createJSONStorage(() => createFacadeStateStorage()),
      partialize: (s) => ({ overrides: deriveOverrides(s.bindings) }),
      merge: (persisted, current) => {
        const src = (persisted ?? {}) as Record<string, unknown>;
        const raw = src.overrides && typeof src.overrides === "object" ? src.overrides : src;
        const overrides = coerceOverrides(raw);

        return { ...current, bindings: mergeWithOverrides(overrides) };
      },
    },
  ),
);

/** Read the resolved combo for one action. */
export function useShortcutCombo(id: ShortcutActionId): string {
  return useShortcutsStore((s) => s.bindings[id]);
}

/** Return `[actionA, actionB]` pairs that share the same combo. */
export function findShortcutConflicts(
  bindings: Record<ShortcutActionId, string>,
): ShortcutActionId[][] {
  const groups = new Map<string, ShortcutActionId[]>();
  for (const spec of SHORTCUT_ACTIONS) {
    const combo = bindings[spec.id];
    const bucket = groups.get(combo) ?? [];
    bucket.push(spec.id);
    groups.set(combo, bucket);
  }

  return Array.from(groups.values()).filter((g) => g.length > 1);
}

export const SHORTCUT_DEFAULTS: Readonly<Record<ShortcutActionId, string>> = DEFAULTS;

// Plan 80 step 41: cross-tab sync via BroadcastChannel.
wireCrossTabRehydrate(useShortcutsStore, StorageKey.Shortcuts, "shortcuts-store");
