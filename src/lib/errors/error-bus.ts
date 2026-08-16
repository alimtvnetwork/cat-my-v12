import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 43 slice-1 step 3: error-bus. In-memory pub/sub for ErrorRecord.
// Also exposes `installGlobalErrorHandlers()` that binds `window.onerror`
// and `window.onunhandledrejection` so nothing dies silently.

import { makeErrorRecord, type ErrorRecord, type ErrorSource } from "./error-record";
import type { UiErrorCode } from "./ui-codes";

type Listener = (rec: ErrorRecord) => void;

const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);

  return () => {
    listeners.delete(fn);
  };
}

/**
 * Structured detail payload accepted by `reportError`. When the emission
 * carries a registry-defined code (plan 65 step 3), the `code` field is
 * typed against `UiErrorCode` so every call site is checked against
 * `src/lib/errors/registry.ts`. Additional keys are free-form for
 * observability context (panelId, caller, distance, etc.).
 */
export type ReportErrorDetail = { code?: UiErrorCode } & Record<string, unknown>;

export function reportError(
  source: ErrorSource,
  err: unknown,
  detail?: ReportErrorDetail,
): ErrorRecord {
  const rec = makeErrorRecord(source, err, detail);
  // Surface: log every emission so devs see it in the console even when no
  // dialog is mounted (e.g. Prod mode + suppressed toast).
  ClientLogger.error(
    `[error-bus] ${rec.source} id=${rec.id} name=${rec.name ?? "Error"} msg=${rec.message}`,
  );
  for (const fn of listeners) {
    try {
      fn(rec);
    } catch (listenerErr) {
      ClientLogger.error("[error-bus] listener threw", listenerErr);
    }
  }

  return rec;
}

// Test hook: clear listeners between tests. Not exported from the barrel.
export function __resetErrorBusForTest(): void {
  listeners.clear();
}

export function installGlobalErrorHandlers(): () => void {
  // Delegates to the single-mount installer in `globalCapture.ts`. The
  // installer registers `window.error` + `unhandledrejection` exactly once
  // per session and fans each event out to BOTH the error-bus (via
  // `reportError` from inside globalCapture) AND the Global Error Modal
  // store, so callers of either entry point observe a single set of
  // listeners with no double-reporting.
  //
  // Dynamic import breaks the circular dependency between this file and
  // `globalCapture.ts` (which itself imports `reportError` from here).
  if (typeof window === "undefined") return () => {};
  let uninstall: (() => void) | null = null;
  void import("./globalCapture").then((m) => {
    uninstall = m.installGlobalErrorCapture();
  });

  return () => {
    uninstall?.();
    uninstall = null;
  };
}
