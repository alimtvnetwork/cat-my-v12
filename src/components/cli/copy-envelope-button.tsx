import { ClientLogger } from "@/lib/observability/client-logger";
import { PriorityType } from "@/components/cli/LiveRegion";
// Plan 90 Step 143: one-click support-triage copier for the full raw
// Universal Response Envelope.
//
// Why this exists (root cause it guards, one sentence): support triage
// currently forces operators to hand-assemble the envelope (BackendMessage +
// frames + methods stack + correlation id + timestamps) from three separate
// modal tabs and paste them piecemeal, so critical fields (e.g.
// DelegatedRequestServer, MethodsStack) routinely go missing from tickets and
// investigations restart from zero.
//
// Contract:
//   - Accepts either a CapturedError (preferred, projects into envelope shape)
//     or an arbitrary envelope-shaped object (for surfaces that already hold
//     the raw wire envelope, e.g. IPC drawers).
//   - Copies pretty-printed JSON (2-space indent) via navigator.clipboard.
//   - Announces success through the shared LiveRegion so SR users get the same
//     signal as sighted users; also fires a sonner toast.
//   - Zero fetching, zero store writes, zero side effects beyond clipboard +
//     announce + toast. Pure presentation button.
//
// Placement: renders inside `EnvelopeErrorPanel` (Step 127) so it appears on
// every error surface that already delegates to that panel (GlobalErrorModal
// Overview tab, ServerErrorFallback, ExitEnvelopeDrawer). Additional bespoke
// surfaces can import and mount it directly.

import { useCallback, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { announce } from "@/components/cli/LiveRegion";
import type { CapturedError } from "@/types/errors";

/** Project a CapturedError into a Universal-Response-Envelope-shaped object.
 *  Field names mirror the wire contract (`Errors`, `MethodsStack`, `RequestedAt`,
 *  `RequestDelegatedAt`, `CorrelationId`) so pasted output round-trips against
 *  BE envelope parsers without renaming. Omitted fields stay omitted (not
 *  null-filled) to avoid faking data that was never present on the wire. */
function projectCapturedErrorToEnvelope(err: CapturedError): Record<string, unknown> {
  const out: Record<string, unknown> = {
    CorrelationId: err.correlationId,
    Code: err.code,
    Level: err.level,
    Message: err.message,
    CreatedAt: err.createdAt,
  };

  if (err.details) out.Details = err.details;

  if (err.endpoint) out.Endpoint = err.endpoint;

  if (err.method) out.Method = err.method;

  if (typeof err.responseStatus === "number") out.ResponseStatus = err.responseStatus;

  if (err.requestedAt) out.RequestedAt = err.requestedAt;

  if (err.requestDelegatedAt) out.RequestDelegatedAt = err.requestDelegatedAt;

  if (err.envelopeErrors) out.Errors = err.envelopeErrors;

  if (err.envelopeMethodsStack) out.MethodsStack = err.envelopeMethodsStack;

  if (err.requestBody !== undefined) out.RequestBody = err.requestBody;

  if (err.context) out.Context = err.context;

  if (err.invocationChain?.length) out.InvocationChain = err.invocationChain;

  return out;
}

export interface CopyEnvelopeButtonProps {
  /** Preferred input: a CapturedError from the errorStore. */
  err?: CapturedError;
  /** Escape hatch: a pre-shaped envelope object (e.g. raw wire payload). */
  envelope?: unknown;
  /** Optional label override (default: "Copy envelope"). */
  label?: string;
  /** Optional short label for compact surfaces (default: "Copy"). */
  compactLabel?: string;
  /** When true, renders only the icon + compact label. */
  compact?: boolean;
  className?: string;
}

export function CopyEnvelopeButton({
  err,
  envelope,
  label = "Copy envelope",
  compactLabel = "Copy",
  compact = false,
  className,
}: CopyEnvelopeButtonProps): React.JSX.Element | null {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(async () => {
    const payload =
      envelope !== undefined ? envelope : err ? projectCapturedErrorToEnvelope(err) : null;

    if (payload === null) {
      // Defensive: if a caller mounts the button with neither prop, surface it
      // loudly rather than silently no-op-ing. This is the observability
      // requirement from the error-management spec.
      ClientLogger.error("[CopyEnvelopeButton] no err or envelope prop provided");
      toast.error("Nothing to copy: envelope missing");

      return;
    }

    let text: string;
    try {
      text = JSON.stringify(payload, null, 2);
    } catch (serErr) {
      ClientLogger.error("[CopyEnvelopeButton] JSON.stringify failed", serErr);
      toast.error("Copy failed: envelope not serializable");

      return;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch (clipErr) {
      ClientLogger.error("[CopyEnvelopeButton] clipboard write failed", clipErr);
      toast.error("Copy failed: clipboard denied");

      return;
    }

    ClientLogger.info(`[CopyEnvelopeButton] copied envelope (${text.length} bytes)`);
    setCopied(true);
    toast.success("Envelope copied to clipboard");
    announce(`Envelope copied, ${text.length} bytes`, { priority: PriorityType.Polite });
    // Reset the visual affordance after 2s so repeat copies still signal.
    window.setTimeout(() => setCopied(false), 2000);
  }, [err, envelope]);

  const Icon = copied ? Check : Copy;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      className={className}
      data-testid="copy-envelope-button"
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{compact ? compactLabel : label}</span>
    </Button>
  );
}
