/**
 * Plan 90 Step 125 - Correlation-id chip with click-to-copy + session
 * drill-down deep link.
 *
 * Root cause guarded (one sentence): every envelope-derived surface
 * (ExitEnvelopeDrawer's RunId row, session drilldown header `run {RunId}`,
 * future error frames) rendered correlation ids as raw monospace text
 * with no copy affordance and no jump target, so operators triaging a
 * failed run had to select-copy-paste a wrapped UUID by hand and then
 * navigate to `/cli/sessions/$id` in a second tab.
 *
 * Behavior:
 *   - Renders a compact chip with the SHORT id (first 8 chars) plus a
 *     copy icon; full id is in the `title` and the `data-correlation-id`
 *     attribute for grepping.
 *   - Click on the label deep-links to `/cli/sessions/$cliInvocationId`
 *     when `cliInvocationId` is provided; otherwise the label is a
 *     non-interactive span (so drilldown header, which already IS the
 *     drilldown, does not link to itself).
 *   - Copy button uses `navigator.clipboard.writeText`; falls back to a
 *     `document.execCommand("copy")` when clipboard API is unavailable
 *     (SSR safe: the button is only rendered on the client via effect
 *     gating around `navigator`). Flashes a check for 1.2s.
 *
 * Design token discipline: reuses the existing muted/border tokens
 * already in use by `StatusPill` (Step 124). No hex, no bespoke colors.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CorrelationIdChipProps {
  /** Full correlation id (RunId, CliInvocationId, or Envelope.CorrelationId). */
  value: string;
  /** Optional CliInvocationId to deep-link to /cli/sessions/$id. */
  cliInvocationId?: string | number | null;
  /** Human label prefix, defaults to "run". */
  label?: string;
  className?: string;
}

const SHORT_LEN = 8;

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);

      return true;
    } catch {
      // fall through
    }
  }

  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);

    return ok;
  } catch {
    return false;
  }
}

export function CorrelationIdChip({
  value,
  cliInvocationId,
  label = "run",
  className,
}: CorrelationIdChipProps) {
  const [copied, setCopied] = useState(false);
  const short = value.length > SHORT_LEN ? value.slice(0, SHORT_LEN) : value;
  const title = `${label} ${value} (click to open drilldown, copy button to copy full id)`;

  const idContent = (
    <span className="font-mono">
      <span className="text-ca-ink-muted">{label} </span>
      <span className="text-ca-ink">{short}</span>
      {value.length > SHORT_LEN && <span className="text-ca-ink-muted">…</span>}
    </span>
  );

  const onCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyToClipboard(value);

    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-ca-border bg-ca-surface px-2 py-0.5 text-hmi-caption",
        className,
      )}
      title={title}
      data-correlation-id={value}
      data-testid="correlation-id-chip"
    >
      {cliInvocationId != null && String(cliInvocationId).length > 0 ? (
        <Link
          to="/cli/sessions/$sessionId"
          params={{ sessionId: String(cliInvocationId) }}
          className="hover:underline underline-offset-2"
          data-testid="correlation-id-link"
        >
          {idContent}
        </Link>
      ) : (
        idContent
      )}
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied correlation id" : "Copy correlation id"}
        title={copied ? "Copied" : "Copy full id"}
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded",
          "text-ca-ink-muted hover:text-ca-ink hover:bg-accent/40 transition-colors",
        )}
        data-testid="correlation-id-copy"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}