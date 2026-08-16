import { ClientLogger } from "@/lib/observability/client-logger";
import { ErrorSourceType } from "@/lib/errors/error-record";
// Single-mount global error handlers.
//
// One and only one place in the app is allowed to attach
// `window.addEventListener('error' | 'unhandledrejection')`. Every uncaught
// runtime error and unhandled promise rejection is fanned out from here to:
//   1. `useErrorStore.captureException` — so it lands in the Global Error
//      Modal + History with a correlation id, stack, and context.
//   2. `reportError` (error-bus) — so `ErrorDialogProvider` and any other
//      subscriber still receive the structured `ErrorRecord`.
//
// The install is idempotent across StrictMode double-mounts and across the
// two legacy entry points (`installGlobalErrorCapture` in this file and
// `installGlobalErrorHandlers` in `error-bus`, which now delegates here).
// This guarantees the listeners are attached exactly once per session so
// errors are never silently swallowed nor double-reported.
import { useErrorStore } from "./errorStore";
import { reportError } from "./error-bus";

let isInstalled = false;
let refCount = 0;

function onWindowError(ev: ErrorEvent): void {
  const err = ev.error ?? ev.message ?? "Unknown window error";
  const context = { filename: ev.filename, lineno: ev.lineno, colno: ev.colno };
  ClientLogger.info("[globalCapture] window.error", context);
  const captured = useErrorStore.getState().captureException(err, {
    triggerComponent: "window",
    triggerAction: "error",
    context,
  });
  // Mirror to the error-bus so ErrorDialogProvider + other subscribers see
  // the same event without needing their own window listeners.
  reportError(ErrorSourceType.WindowOnError, err, {
    ...context,
    correlationId: captured.correlationId,
  });
}

function onUnhandledRejection(ev: PromiseRejectionEvent): void {
  const reason = ev.reason ?? "Unhandled rejection";
  ClientLogger.info("[globalCapture] unhandledrejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  const captured = useErrorStore.getState().captureException(reason, {
    triggerComponent: "window",
    triggerAction: "unhandledrejection",
  });
  reportError(ErrorSourceType.UnhandledRejection, reason, {
    correlationId: captured.correlationId,
  });
}

export function installGlobalErrorCapture(): () => void {
  if (typeof window === "undefined") return () => {};
  refCount += 1;

  if (isInstalled) {
    return () => uninstall();
  }

  isInstalled = true;
  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  ClientLogger.info("[globalCapture] installed window.error + unhandledrejection listeners");

  return () => uninstall();
}

function uninstall(): void {
  if (typeof window === "undefined") return;
  refCount = Math.max(0, refCount - 1);

  if (refCount > 0 || !isInstalled) return;
  window.removeEventListener("error", onWindowError);
  window.removeEventListener("unhandledrejection", onUnhandledRejection);
  isInstalled = false;
  ClientLogger.info("[globalCapture] uninstalled listeners");
}

// Test hook: not exported from the barrel; unit tests only.
export function __resetGlobalCaptureForTest(): void {
  if (typeof window !== "undefined" && isInstalled) {
    window.removeEventListener("error", onWindowError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }

  isInstalled = false;
  refCount = 0;
}
