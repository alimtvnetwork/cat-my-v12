import { ClientLogger } from "@/lib/observability/client-logger";
import { HttpMethod } from "@/lib/constants";
// Plan 71 Step 15: error history persistence.
//
// The Zustand `useErrorStore` is in-memory only. To satisfy
// 02-spec/03-error-manage/02-error-architecture/04-error-modal/05-error-history-persistence.md
// we snapshot the bounded FIFO to durable browser storage via the shared
// SDK facade (02-spec/21-app/52-sdk-facade-pattern.md) so history survives
// reloads. IndexedDB is used in the browser (private-mode / SSR fall back
// to the in-memory implementation).
//
// Spec 54: the "eventual backend swap" this file promised has landed.
// `saveErrorHistory` now ALSO syncs new entries to the Task-tier Error
// SplitDB via `POST /errors` (see `BE/routes/errors.py`, migration 0029),
// so errors survive the browser session and the CLI can list them with
// stack traces. The backend sync runs only in Backend mode (see
// `resolveBackendSyncTarget`); in Seed mode there is no backend by
// design, so the sync is skipped and the browser history + export remain
// the record — that skip is intentional, not a swallow.
//
// Persistence failures are NOT log-only anymore (spec 54 §10): a load /
// save / clear failure, and a backend-sync failure, is reported into the
// error store as a synthetic error (cooldown-gated, see below) so it
// shows up in the modal / history drawer instead of vanishing into a
// console line.
//
// Cycle note: this module imports `useErrorStore`, which imports this
// module. The cycle is safe because neither module calls the other's
// bindings during evaluation — the store is only touched inside
// function bodies, after both modules have initialized. The cooldown
// below is what breaks the report loop: a synthetic error's own commit
// re-enters `saveErrorHistory`, and if that save also fails, the second
// report is suppressed inside the cooldown window.
import type { CapturedError } from "@/types/errors";
import { buildCapturedError } from "@/types/errors";
import { makeProjectRepositoryFacade } from "@/lib/projects/facade";
import { useErrorStore } from "@/lib/stores/errorStore";
const HISTORY_KEY = "lovable:error-history:v1";
const MAX_HISTORY = 50;
const BACKEND_STORAGE_KEY = "app.backend.baseUrl";
const DEFAULT_BACKEND_URL = "http://127.0.0.1:8787";
// Only sync when the persisted backend mode is explicitly "backend".
const BACKEND_MODE = "backend";
// Cooldown for store-reported persistence failures: the report itself
// re-enters the persistence path, so without a cooldown a broken store
// would report itself forever. Failures are still logged every time;
// only the store entry is deduplicated.
const PERSISTENCE_REPORT_COOLDOWN_MS = 30000;
let lastPersistenceReportAt = 0;
const syncedCorrelationIds = new Set<string>();
function facade() {
  return makeProjectRepositoryFacade();
}
function resolveBackendSyncTarget(): string | null {
  try {
    const raw = globalThis.localStorage?.getItem(BACKEND_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_BACKEND_URL;
    }
    const parsed = JSON.parse(raw) as unknown;
    const state = (parsed as { state?: unknown }).state;
    const baseUrl = (state as { baseUrl?: unknown } | undefined)?.baseUrl;
    if (typeof baseUrl === "string" && baseUrl.trim().length > 0) {
      return baseUrl.trim();
    }

    return DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}
/** Backend base URL for other loopback POST callers (bug reports).
 *  Null in Seed mode or when no backend is configured. */
export function resolveBackendBaseUrl(): string | null {
  return resolveBackendSyncTarget();
}

/** Configured backend base URL for settings display, or the loopback
 *  default when nothing is configured. Unlike `resolveBackendBaseUrl`
 *  (null outside backend mode, for sync gating), this always returns a
 *  usable URL: settings UI shows and tests against it. Single owner of
 *  the `app.backend.baseUrl` key so settings surfaces never read
 *  localStorage directly (facade single-seam ratchet, spec 21 §52). */
export function resolveConfiguredBackendUrl(): string {
  try {
    const raw = globalThis.localStorage?.getItem(BACKEND_STORAGE_KEY);
    if (!raw) return DEFAULT_BACKEND_URL;
    const parsed = JSON.parse(raw) as unknown;
    const state = (parsed as { state?: unknown }).state as { baseUrl?: unknown } | undefined;
    const baseUrl = state?.baseUrl;
    return typeof baseUrl === "string" && baseUrl.length > 0 ? baseUrl : DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}
function reportPersistenceFailure(operation: string, err: unknown): void {
  ClientLogger.error(`[errors/history] ${operation} failed`, err);
  const now = Date.now();
  if (now - lastPersistenceReportAt < PERSISTENCE_REPORT_COOLDOWN_MS) return;
  lastPersistenceReportAt = now;
  try {
    const synthetic = buildCapturedError(
      err instanceof Error ? err : new Error(`Error history ${operation} failed`),
      {
        triggerComponent: "errors/history-facade",
        triggerAction: operation,
        source: "error-history-persistence",
      },
      "E_HISTORY_PERSISTENCE_FAILED",
    );
    useErrorStore.getState().commit(synthetic);
  } catch (reportErr) {
    // The reporter must never throw: the original failure is already
    // logged above, and a throwing reporter would mask the caller's path.
    ClientLogger.error("[errors/history] persistence-failure report failed", reportErr);
  }
}
export async function loadErrorHistory(): Promise<CapturedError[]> {
  try {
    const raw = await facade().readItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) === false) return [];
    // Trust-but-verify: the shape is app-owned; drop anything without an id.
    return parsed.filter(
      (e): e is CapturedError =>
        !!e && typeof e === "object" && typeof (e as { id?: unknown }).id === "string",
    );
  } catch (err) {
    reportPersistenceFailure("load", err);

    return [];
  }
}
/** POST one error to the Task-tier Error SplitDB. Returns true when the server stored it (or already had it). */
export async function syncErrorToBackend(error: CapturedError): Promise<boolean> {
  const baseUrl = resolveBackendSyncTarget();
  if (baseUrl === null) return false;
  try {
    const res = await fetch(`${baseUrl}/errors`, {
      method: HttpMethod.Post,
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-Id": error.correlationId,
      },
      body: JSON.stringify(error),
    });
    if (!res.ok) {
      reportPersistenceFailure("backend-sync", new Error(`POST /errors -> ${res.status}`));

      return false;
    }
    syncedCorrelationIds.add(error.correlationId);

    return true;
  } catch (err) {
    reportPersistenceFailure("backend-sync", err);

    return false;
  }
}
/** POST every not-yet-synced entry to the Task-tier Error SplitDB. The server dedupes by CorrelationId, so a re-POST after reload is a harmless skip. */
export async function syncErrorHistoryToBackend(history: CapturedError[]): Promise<boolean> {
  const baseUrl = resolveBackendSyncTarget();
  if (baseUrl === null) return false;
  const pending = history.filter((e) => !syncedCorrelationIds.has(e.correlationId));
  if (pending.length === 0) return true;
  try {
    const res = await fetch(`${baseUrl}/errors`, {
      method: HttpMethod.Post,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending),
    });
    if (!res.ok) {
      reportPersistenceFailure("backend-sync", new Error(`POST /errors -> ${res.status}`));

      return false;
    }
    for (const e of pending) syncedCorrelationIds.add(e.correlationId);

    return true;
  } catch (err) {
    reportPersistenceFailure("backend-sync", err);

    return false;
  }
}
export async function saveErrorHistory(history: CapturedError[]): Promise<void> {
  try {
    const trimmed = history.slice(0, MAX_HISTORY);
    await facade().writeItem(HISTORY_KEY, JSON.stringify(trimmed));
    // Fire-and-forget backend sync (failures are reported into the store
    // by the sync path itself, cooldown-gated, so this never swallows).
    void syncErrorHistoryToBackend(trimmed);
  } catch (err) {
    reportPersistenceFailure("save", err);
  }
}
export async function clearPersistedErrorHistory(): Promise<void> {
  try {
    await facade().removeItem(HISTORY_KEY);
  } catch (err) {
    reportPersistenceFailure("clear", err);
  }
}
export const __ERROR_HISTORY_STORAGE_KEY = HISTORY_KEY;
export const __ERROR_HISTORY_MAX = MAX_HISTORY;
