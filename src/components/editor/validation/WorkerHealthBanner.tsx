import { ClientLogger } from "@/lib/observability/client-logger";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { useWorkerHealthStore } from "@/lib/editor/worker-health-store";
import { useVisibleInterval } from "@/hooks/useVisibleInterval";
import { useViewportSafe } from "@/hooks/useViewportSafe";
import { useErrorStore } from "@/lib/stores/errorStore";
import { lookupErrorCode } from "@/lib/errors";
import { buildCapturedError } from "@/types/errors";
import { HttpMethod } from "@/lib/constants";

/**
 * Persistent worker health / offline banner.
 *
 * Rendered once by the /setup layout so every setup subroute shows the
 * same status. Also reused (as a compact variant) inside the validate
 * dialog so both surfaces stay in sync via `useWorkerHealthStore`.
 *
 * Polling is visibility-gated: no round trips while the tab is hidden,
 * an immediate refresh on tab focus so operators see a fresh state.
 */
interface Props {
  /** Poll cadence, ms. `0` disables the poll (dialog uses its own retry). */
  pollMs?: number;
  /** Compact variant used inside the validate dialog. */
  compact?: boolean;
  /** Optional test hook. */
  testId?: string;
}

export function WorkerHealthBanner({
  pollMs = 30_000,
  compact = false,
  testId = "worker-health-banner",
}: Props): React.JSX.Element | null {
  const health = useWorkerHealthStore((s) => s.health);
  const loading = useWorkerHealthStore((s) => s.loading);
  const refresh = useWorkerHealthStore((s) => s.refresh);
  const dismissed = useWorkerHealthStore((s) => s.dismissed);
  const dismissBanner = useWorkerHealthStore((s) => s.dismissBanner);
  const lastCheckedAt = useWorkerHealthStore((s) => s.lastCheckedAt);

  // Inline "Details" disclosure. Full modal-driven flow lands in Plan 71
  // Step 9 (`GlobalErrorModal`); until then Details expands the same card
  // to expose the raw reason, engine/version, latency, and probe timestamp
  // so operators can copy the failure context without leaving the page.
  const [showDetails, setShowDetails] = useState(false);

  // Ref used by `useViewportSafe` to hide the floating card when its
  // bounding rect would clip the viewport (split-view / narrow layouts).
  // Enforces `.lovable/spec/commands/25-hide-clipped-floating-notices.md`.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const fits = useViewportSafe(cardRef);

  // Plan 71 Step 12: wire Details into the Global Error Modal.
  // The inline `<dl>` panel is retained as a compact affordance for the
  // toast surface itself; the button opens the full modal so operators
  // can inspect the E9003 payload, copy JSON, and traverse history.
  const openErrorModal = useErrorStore((s) => s.openErrorModal);

  function openWorkerErrorInModal(): void {
    const meta = lookupErrorCode("E9003");
    const captured = buildCapturedError(
      health?.reason ?? "Worker unreachable",
      {
        endpoint: "worker.health",
        method: HttpMethod.Get,
        triggerComponent: "WorkerHealthBanner",
        triggerAction: "details",
        context: {
          engine: health?.engine,
          version: health?.version,
          latencyMs: health?.latencyMs,
          lastCheckedAt,
          category: meta.category,
          retryable: meta.retryable,
          label: meta.label,
        },
      },
      meta.code,
    );
    ClientLogger.info(
      `[WorkerHealthBanner] open modal code=${meta.code} reason=${captured.message}`,
    );
    openErrorModal(captured);
  }

  // First probe on mount. If another subscriber already has a value, this
  // is still cheap: `refresh()` coalesces with any in-flight call.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useVisibleInterval(() => void refresh(), pollMs, pollMs > 0);

  const ok = health?.ok === true;
  const configured = health?.configured !== false;

  // Floating variant (bottom-right toast) is intentionally silent unless
  // there is a real, actionable offline state to surface:
  //   - hide while the first probe is in flight (no `health` yet); the
  //     initial "Checking Python worker..." card was the "creepy" artifact
  //   - hide the "worker online" success card entirely; ok state is not
  //     actionable and does not deserve chrome
  //   - hide "not configured": the app already falls back to the stub
  //     scorer, nothing for the operator to do from this surface
  //   - honor an explicit dismiss until the next ok -> offline transition
  //     (re-armed inside the store)
  // The compact variant (inside the validate dialog) still renders every
  // state because that surface is dedicated to worker status.
  if (!compact) {
    if (!health) return null;

    if (!configured) return null;

    if (ok) return null;

    if (dismissed) return null;
    // If a prior measurement determined the card would clip the
    // viewport, hide entirely. The compact variant inside the dialog
    // still renders because that surface has explicit width.
    if (!fits) return null;
  }

  // Colors: the floating variant is only rendered for the offline case
  // (see gating above), so it uses the spec's `--toast-error-*` tokens
  // (spec/03-error-manage/02-error-architecture/03-notification-colors.md).
  // The compact variant lives inside the validate dialog and reuses the
  // existing --ca-* semantic tones so it stays consistent with the dialog.
  const compactTone = loading
    ? "border-ca-border bg-ca-panel-2/40 text-ca-ink-muted"
    : ok
      ? "border-ca-ok/40 bg-ca-ok/10 text-ca-ink"
      : "border-ca-ng/50 bg-ca-ng/10 text-ca-ink";

  const floatingTone =
    "border-[hsl(var(--toast-error-border))] bg-[hsl(var(--toast-error-bg))] text-[hsl(var(--toast-error-fg))]";

  const wrapper = compact
    ? `flex items-start gap-hmi-2 rounded-md border px-hmi-3 py-hmi-2 text-hmi-caption ${compactTone}`
    : `fixed top-16 right-4 z-50 flex max-w-xs flex-col gap-hmi-2 rounded-xl border px-hmi-3 py-hmi-2 text-hmi-caption shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ${floatingTone}`;

  return (
    <div
      ref={cardRef}
      role="status"
      aria-live="polite"
      data-testid={testId}
      data-worker-ok={ok ? "true" : "false"}
      className={wrapper}
    >
      <div className="flex items-start gap-hmi-2">
        {loading ? (
          <Loader2 aria-hidden size={14} className="mt-[2px] animate-spin" />
        ) : ok ? (
          <CheckCircle2 aria-hidden size={14} className="mt-[2px] text-ca-ok" />
        ) : (
          <AlertTriangle aria-hidden size={14} className="mt-[2px]" />
        )}
        <div className="flex-1">
          {loading && !health ? (
            <span>Checking Python worker...</span>
          ) : ok ? (
            <span>
              Worker online
              {health?.engine ? ` (${health.engine}` : ""}
              {health?.version ? ` v${health.version}` : ""}
              {health?.engine ? ")" : ""}
              {typeof health?.latencyMs === "number" ? `, ${health.latencyMs} ms` : ""}
            </span>
          ) : !configured ? (
            <span>
              Worker not configured. Set <code>VALIDATION_WORKER_URL</code> to enable real scoring;
              runs use the stub scorer.
            </span>
          ) : (
            <span>
              Worker offline: {health?.reason ?? "unreachable"}. Runs fall back to the stub scorer.
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          data-testid={`${testId}-retry`}
          className="rounded-md border border-current/20 bg-transparent px-hmi-2 py-[2px] text-hmi-caption font-medium hover:bg-current/10 disabled:opacity-40"
        >
          Retry
        </button>
        {!compact ? (
          <>
            <button
              type="button"
              onClick={() => {
                setShowDetails((v) => !v);
                openWorkerErrorInModal();
              }}
              data-testid={`${testId}-details`}
              aria-expanded={showDetails}
              aria-controls={`${testId}-details-panel`}
              className="rounded-md border border-current/20 bg-transparent px-hmi-2 py-[2px] text-hmi-caption font-medium hover:bg-current/10"
            >
              {showDetails ? "Hide" : "Details"}
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              data-testid={`${testId}-dismiss`}
              aria-label="Dismiss worker health notice"
              title="Dismiss"
              className="ml-1 rounded-md px-1 py-[2px] hover:bg-current/10"
            >
              <X aria-hidden size={14} />
            </button>
          </>
        ) : null}
      </div>
      {!compact && showDetails ? (
        <dl
          id={`${testId}-details-panel`}
          data-testid={`${testId}-details-panel`}
          className="grid grid-cols-[auto_1fr] gap-x-hmi-3 gap-y-1 border-t border-current/20 pt-hmi-2 text-hmi-caption"
        >
          <dt className="opacity-70">Code</dt>
          <dd className="font-mono">E9003</dd>
          <dt className="opacity-70">Reason</dt>
          <dd className="break-words">{health?.reason ?? "unreachable"}</dd>
          <dt className="opacity-70">Engine</dt>
          <dd>{health?.engine ?? "-"}</dd>
          <dt className="opacity-70">Version</dt>
          <dd>{health?.version ?? "-"}</dd>
          <dt className="opacity-70">Latency</dt>
          <dd>{typeof health?.latencyMs === "number" ? `${health.latencyMs} ms` : "-"}</dd>
          <dt className="opacity-70">Checked</dt>
          <dd>{lastCheckedAt ? new Date(lastCheckedAt).toLocaleTimeString() : "-"}</dd>
        </dl>
      ) : null}
    </div>
  );
}
