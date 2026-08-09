// Plan 67 step 45 (CX-03): thin wrapper around `formatIdentifierLabel` so
// toast copy and error banners speak human labels instead of raw dotted
// registry codes. The registry itself lives in `src/lib/errors/registry.ts`
// and the label table in `src/lib/display-labels.ts`; this file only
// composes the two so call sites stay one line.
//
// Root cause it addresses: setup routes (functions, chain-events) and the
// validate dialog were rendering strings like `[fn.source.tooLarge] ...`,
// which bypassed the CX-02 registry work. Every new code we ship should
// arrive here already formatted.
import { formatIdentifierLabel } from "@/lib/display-labels";

export interface CodedError {
  code: string;
  message?: string;
}

/** Format `code` as a human label. Falls back to the raw code. */
export function formatErrorCode(code: string): string {
  const label = formatIdentifierLabel(code);

  return label || code;
}

/**
 * Render a coded error as `"Label: message (code)"`. Suitable for toasts.
 * Keeps the raw code parenthesized so support/log correlation stays trivial.
 */
export function formatCodedError(err: CodedError): string {
  const label = formatErrorCode(err.code);
  const msg = err.message?.trim();

  if (msg && msg !== label) return `${label}: ${msg} (${err.code})`;

  return `${label} (${err.code})`;
}

/** Join multiple coded errors for a single toast line. */
export function formatCodedErrors(errs: readonly CodedError[]): string {
  if (errs.length === 0) return "";

  return errs.map(formatCodedError).join(" | ");
}
