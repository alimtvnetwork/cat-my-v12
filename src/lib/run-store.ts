import { create } from "zustand";
import { RunLockStateType, setRunLock } from "@/lib/rpc/guards";
import { makeProjectRepositoryFacade } from "@/lib/projects/facade";

export enum RunStatusType {
  Idle = "idle",
  Running = "running",
}
export type RunStatus = RunStatusType;

export interface RunCounters {
  total: number;
  ok: number;
  ng: number;
}

export interface NgEvent {
  id: string;
  ts: string;
  frame: number;
  tool: string;
  reason: string;
  score: number;
}

export interface RunSettings {
  autoResetOnStart: boolean;
  soundOnNg: boolean;
  targetFps: number;
}

export interface RunHistoryEntry {
  id: string;
  startedAt: number;
  endedAt: number;
  counters: RunCounters;
  settings: RunSettings;
}

export interface RunError {
  message: string;
  stack?: string;
  ts: string;
}

// Preserve the pre-facade `ca-hmi:` namespace so operators keep their
// persisted run settings + last 20 history entries across the swap.
const SETTINGS_KEY = "ca-hmi:run.settings";
const HISTORY_KEY = "ca-hmi:run.history";
const HISTORY_MAX = 20;

function facadeReadJson<T>(key: string): Promise<T | null> {
  return makeProjectRepositoryFacade()
    .readItem(key)
    .then((raw) => {
      if (raw === null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch (err) {
        console.warn("[run-store] parse failed", key, err);

        return null;
      }
    });
}

async function facadeReadJsonWithMigration<T>(key: string): Promise<T | null> {
  const facade = makeProjectRepositoryFacade();
  let raw = await facade.readItem(key);

  if (raw === null && typeof window !== "undefined") {
    try {
      const legacy = window.localStorage.getItem(key);

      if (legacy !== null) {
        console.info("[run-store] migrating legacy localStorage payload", key);
        await facade.writeItem(key, legacy);
        window.localStorage.removeItem(key);
        raw = legacy;
      }
    } catch {
      /* ignore */
    }
  }

  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn("[run-store] parse failed", key, err);

    return null;
  }
}

function facadeWriteJson<T>(key: string, value: T): void {
  makeProjectRepositoryFacade()
    .writeItem(key, JSON.stringify(value))
    .catch((err) => console.warn("[run-store] persist failed", key, err));
}
// Referenced only via the migration path; keep the strict-mode elimination happy.
void facadeReadJson;

const DEFAULT_SETTINGS: RunSettings = {
  autoResetOnStart: true,
  soundOnNg: false,
  targetFps: 5,
};

interface RunState {
  status: RunStatus;
  counters: RunCounters;
  startedAt: number | null;
  ngEvents: NgEvent[];
  settings: RunSettings;
  history: RunHistoryEntry[];
  error: RunError | null;
  hydrated: boolean;
  start: () => void;
  stop: () => void;
  tick: (judgment: "ok" | "ng", meta?: { tool?: string; reason?: string; score?: number }) => void;
  reset: () => void;
  hydrate: () => void;
  setSettings: (patch: Partial<RunSettings>) => void;
  rerun: (id: string) => void;
  clearHistory: () => void;
  setError: (err: RunError | null) => void;
}

const NG_REASONS = [
  "Score below threshold",
  "Pattern not found",
  "Edge count mismatch",
  "Anchor drift",
];
const TOOLS = ["Pattern Match", "Edge Detect", "Area Measure", "Anchor"];

function pushHistoryEntry(list: RunHistoryEntry[], entry: RunHistoryEntry): RunHistoryEntry[] {
  const next = [entry, ...list].slice(0, HISTORY_MAX);
  facadeWriteJson(HISTORY_KEY, next);

  return next;
}

export const useRunStore = create<RunState>((set, get) => ({
  status: RunStatusType.Idle,
  counters: { total: 0, ok: 0, ng: 0 },
  startedAt: null,
  ngEvents: [],
  settings: DEFAULT_SETTINGS,
  history: [],
  error: null,
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    // Mark hydrated eagerly so double-invocation from React StrictMode
    // does not fire two migration reads.
    set({ hydrated: true });
    void Promise.all([
      facadeReadJsonWithMigration<RunSettings>(SETTINGS_KEY),
      facadeReadJsonWithMigration<RunHistoryEntry[]>(HISTORY_KEY),
    ])
      .then(([settings, history]) => {
        set({
          settings: { ...DEFAULT_SETTINGS, ...(settings ?? {}) },
          history: Array.isArray(history) ? history : [],
        });
      })
      .catch((err) => console.warn("[run-store] hydrate failed", err));
  },
  setSettings: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch };
      facadeWriteJson(SETTINGS_KEY, next);

      return { settings: next };
    }),
  rerun: (id) => {
    const entry = get().history.find((h) => h.id === id);

    if (!entry) return;
    const next = { ...get().settings, ...entry.settings };
    facadeWriteJson(SETTINGS_KEY, next);
    set({ settings: next, counters: { total: 0, ok: 0, ng: 0 }, ngEvents: [] });
    get().start();
  },
  clearHistory: () => {
    facadeWriteJson(HISTORY_KEY, []);
    set({ history: [] });
  },
  setError: (err) => set({ error: err }),
  start: () => {
    setRunLock(RunLockStateType.Running);
    const s = get();
    const reset = s.settings.autoResetOnStart;
    set({
      status: RunStatusType.Running,
      startedAt: Date.now(),
      counters: reset ? { total: 0, ok: 0, ng: 0 } : s.counters,
      ngEvents: reset ? [] : s.ngEvents,
      error: null,
    });
  },
  stop: () => {
    setRunLock(RunLockStateType.Idle);
    const s = get();

    if (s.startedAt && s.counters.total > 0) {
      const entry: RunHistoryEntry = {
        id: `run-${s.startedAt}`,
        startedAt: s.startedAt,
        endedAt: Date.now(),
        counters: s.counters,
        settings: s.settings,
      };
      set({ status: RunStatusType.Idle, history: pushHistoryEntry(s.history, entry) });
    } else {
      set({ status: RunStatusType.Idle });
    }
  },
  tick: (judgment, meta) =>
    set((s) => {
      const nextTotal = s.counters.total + 1;
      const isNg = judgment === "ng";
      const ngEvents = isNg
        ? [
            {
              id: `ng-${nextTotal}-${Math.random().toString(36).slice(2, 6)}`,
              ts: new Date().toLocaleTimeString(),
              frame: nextTotal,
              tool: meta?.tool ?? TOOLS[Math.floor(Math.random() * TOOLS.length)],
              reason: meta?.reason ?? NG_REASONS[Math.floor(Math.random() * NG_REASONS.length)],
              score: meta?.score ?? Math.round(Math.random() * 60),
            },
            ...s.ngEvents,
          ].slice(0, 100)
        : s.ngEvents;

      return {
        counters: {
          total: nextTotal,
          ok: s.counters.ok + (isNg ? 0 : 1),
          ng: s.counters.ng + (isNg ? 1 : 0),
        },
        ngEvents,
      };
    }),
  reset: () => {
    setRunLock(RunLockStateType.Idle);
    set({
      status: RunStatusType.Idle,
      counters: { total: 0, ok: 0, ng: 0 },
      startedAt: null,
      ngEvents: [],
    });
  },
}));