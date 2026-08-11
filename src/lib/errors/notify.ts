import { AnnouncePriorityType } from "@/lib/a11y/announcer";
// Plan 71 Step 13 + Step 16: shared "global error" surface for React Query
// caches and any imperative call site. Every error routed here is captured in
// the error store (so it shows up in Modal + History) and a toast with a
// "View Details" action is raised. Kept side-effect free at import time so it
// is safe to reference from the SSR-executed router bootstrap.
//
// Spec: spec/03-error-manage/02-error-architecture/04-error-modal/06-suppress-global-error.md §2.1

import { toast } from "sonner";
import { createElement } from "react";

import { useErrorStore } from "./errorStore";
import type { CapturedError } from "@/types/errors";
import { registerRetry, type RetryFn } from "./retry-registry";
import { announce } from "@/lib/a11y/announcer";

// Dedupe repeated error toasts keyed by endpoint (or label). Prevents
// polling endpoints (e.g. GET /api/cli/status) from spawning a new toast
// on every failed poll.
const DEDUPE_WINDOW_MS = 30_000;

// Normalize dedupe key so calls that pass the full URL (with query string)
// collapse together with calls that pass just the path. Falls back to the
// human label, or the error `code` when neither endpoint nor label is set.
function normalizeDedupeKey(
  endpoint: string | undefined,
  method: string | undefined,
  label: string,
  err: unknown,
): string {
  if (endpoint) {
    const withoutQuery = endpoint.split("?")[0];
    const withoutOrigin = withoutQuery.replace(/^https?:\/\/[^/]+/, "");

    return `${(method ?? "GET").toUpperCase()} ${withoutOrigin}`;
  }

  const code = (err as { code?: unknown } | null)?.code;

  if (typeof code === "string" && code.length > 0) return `code:${code}`;

  return label;
}

interface ActiveToast {
  toastId: string | number;
  firstAt: number;
  count: number;
  correlationId: string;
  captured: CapturedError;
}

const activeToasts = new Map<string, ActiveToast>();

export interface ShowGlobalErrorContext {
  endpoint?: string;
  method?: string;
  source?: string;
  /**
   * Phase H: optional retry callback wired to the toast action AND the
   * Global Error Modal "Retry" button. Kept out of the persisted
   * `CapturedError` (which must stay JSON-serializable) via the retry
   * registry, keyed by correlation id.
   */
  retry?: RetryFn;
  /** Phase H: scope tag surfaced in the History panel filter. */
  scope?: string;
}

function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;

  if (typeof err === "string" && err.length > 0) return err;

  return fallback;
}

// Plan 83 backlog #25: every error toast surfaces a secondary "Copy details"
// chip so users can hand a correlation id + message to support without
// opening the modal. We keep the payload small (id + label + message) and
// fall back to a synchronous prompt-friendly log when clipboard is denied
// (SSR, insecure origin, or permission blocked).
function buildCopyPayload(captured: CapturedError, label: string, message: string): string {
  const parts = [
    `id: ${captured.correlationId}`,
    `code: ${captured.code ?? "E_UNKNOWN"}`,
    `label: ${label}`,
  ];

  if (message && message !== label) parts.push(`message: ${message}`);

  return parts.join("\n");
}

function copyDetailsChip(captured: CapturedError, label: string, message: string) {
  return {
    label: "Copy details",
    onClick: () => {
      const payload = buildCopyPayload(captured, label, message);
      const nav = typeof navigator !== "undefined" ? navigator.clipboard : undefined;

      if (nav?.writeText) {
        nav.writeText(payload).then(
          () => {
            console.info(`[notify] copied details cid=${captured.correlationId}`);
            toast.success("Copied error details");
            announce(
              `Copied error details for correlation id ${captured.correlationId}`,
              AnnouncePriorityType.Polite,
            );
          },
          (e: unknown) => {
            console.error("[notify] clipboard writeText failed", e);
            toast.error("Copy failed — see console for details");
            announce("Copy failed. See console for details.", AnnouncePriorityType.Assertive);
          },
        );

        return;
      }

      console.info(
        `[notify] clipboard unavailable, payload cid=${captured.correlationId}:\n${payload}`,
      );
      toast.error("Clipboard unavailable — details logged to console");
      announce(
        "Clipboard unavailable. Error details were logged to the console.",
        AnnouncePriorityType.Assertive,
      );
    },
  };
}

function clickableTitle(text: string, onClick: () => void) {
  return createElement(
    "button",
    {
      type: "button",
      onClick,
      className:
        "text-left font-medium leading-tight text-xs w-full bg-transparent border-0 p-0 m-0 cursor-pointer hover:underline focus:underline outline-none",
      "aria-label": `${text}. Click to open error details.`,
    },
    text,
  );
}

export function showGlobalError(err: unknown, ctx: ShowGlobalErrorContext = {}): void {
  const label = ctx.endpoint ? `Request failed: ${ctx.endpoint}` : messageOf(err, "Request failed");
  const dedupeKey = normalizeDedupeKey(ctx.endpoint, ctx.method, label, err);
  const now = Date.now();
  const existing = activeToasts.get(dedupeKey);

  if (existing && now - existing.firstAt < DEDUPE_WINDOW_MS) {
    existing.count += 1;
    const msg = messageOf(err, "");
    const stackedLabel = `${label}  ×${existing.count}`;
    toast.error(
      clickableTitle(stackedLabel, () =>
        useErrorStore.getState().openErrorModal(existing.captured),
      ),
      {
        id: existing.toastId,
        description: `${msg}${msg ? " " : ""}[id: ${existing.correlationId}]`,
        duration: 10_000,
        onDismiss: () => activeToasts.delete(dedupeKey),
        onAutoClose: () => activeToasts.delete(dedupeKey),
      },
    );
    console.info(
      `[notify] deduped cid=${existing.correlationId} count=${existing.count} key=${dedupeKey}`,
    );

    return;
  }

  const store = useErrorStore.getState();
  const captured = store.captureException(err, {
    triggerComponent: ctx.source ?? "queryClient",
    triggerAction: ctx.method ?? "request",
    context: { endpoint: ctx.endpoint, method: ctx.method, scope: ctx.scope },
  });
  console.info(
    `[notify] showGlobalError cid=${captured.correlationId} endpoint=${ctx.endpoint ?? "-"} id=${captured.id}`,
  );

  if (ctx.retry) {
    registerRetry(captured.correlationId, ctx.retry, { scope: ctx.scope });
  }

  const message = messageOf(err, "");
  const toastId = toast.error(
    clickableTitle(label, () => useErrorStore.getState().openErrorModal(captured)),
    {
      description: `${message}${message ? " " : ""}[id: ${captured.correlationId}]`,
      duration: 10_000,
      cancel: copyDetailsChip(captured, label, message),
      onDismiss: () => activeToasts.delete(dedupeKey),
      onAutoClose: () => activeToasts.delete(dedupeKey),
      action: ctx.retry
        ? {
            label: "Retry",
            onClick: () => {
              try {
                void ctx.retry?.();
              } catch (e) {
                console.error("[notify] retry threw", e);
              }
            },
          }
        : {
            label: "View Details",
            onClick: () => useErrorStore.getState().openErrorModal(captured),
          },
    },
  );
  activeToasts.set(dedupeKey, {
    toastId,
    firstAt: now,
    count: 1,
    correlationId: captured.correlationId,
    captured,
  });
}

/**
 * Convenience wrapper for imperative call sites (fetch/try-catch). Always call
 * this instead of a bare `toast.error(...)` when the caller wants the error to
 * be inspectable in the Global Error Modal.
 */
export function showApiError(err: unknown, ctx: ShowGlobalErrorContext = {}): void {
  showGlobalError(err, ctx);
}

/**
 * Plan 71 Step 16: replacement for bare `toast.error(label, ...)` at
 * imperative call sites. Captures the error into the store so the user can
 * always click "View Details" to inspect it in the Global Error Modal, and
 * returns the sonner toast id (so callers can dismiss/replace, mirroring the
 * previous `toast.error(...)` return contract).
 */
export function showToastError(
  label: string,
  err?: unknown,
  ctx: ShowGlobalErrorContext = {},
): string | number {
  const store = useErrorStore.getState();
  const source = err ?? new Error(label);
  const captured: CapturedError = store.captureException(source, {
    triggerComponent: ctx.source ?? "toast",
    triggerAction: ctx.method ?? "user-action",
    context: { endpoint: ctx.endpoint, method: ctx.method, label, scope: ctx.scope },
  });

  if (ctx.retry) {
    registerRetry(captured.correlationId, ctx.retry, { scope: ctx.scope });
  }

  const description =
    err instanceof Error
      ? err.message
      : typeof err === "string" && err.length > 0
        ? err
        : undefined;
  console.info(
    `[notify] showToastError cid=${captured.correlationId} id=${captured.id} label=${label}`,
  );

  return toast.error(label, {
    description: description
      ? `${description} [id: ${captured.correlationId}]`
      : `[id: ${captured.correlationId}]`,
    duration: 8_000,
    cancel: copyDetailsChip(captured, label, description ?? ""),
    action: ctx.retry
      ? {
          label: "Retry",
          onClick: () => {
            try {
              void ctx.retry?.();
            } catch (e) {
              console.error("[notify] retry threw", e);
            }
          },
        }
      : {
          label: "View Details",
          onClick: () => useErrorStore.getState().openErrorModal(captured),
        },
  });
}