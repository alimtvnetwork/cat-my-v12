/**
 * Plan 90 Step 126 - Reusable Universal Response Envelope pretty-tree.
 *
 * Root cause guarded (one sentence): Steps 111/112 (JSONL/exit drawer),
 * 122 (doctor), and 127 (EnvelopeErrorPanel refactor) each render bits
 * of an envelope in bespoke JSX (dl grids, <pre> dumps, ad-hoc badges),
 * so any change to the wire contract (PascalCase drift, new Attributes
 * field, MethodsStack shape) forces N-way edits and the surfaces
 * silently diverge.
 *
 * Design:
 *   - Renders `Status`, `Attributes`, `Results`, `Errors`, and
 *     `MethodsStack` sections in that order, PascalCase keys preserved.
 *   - `Attributes.IsMultiple` drives the Results header:
 *       IsMultiple=true  -> "Results (N)" with an indexed list
 *       IsMultiple=false -> "Result" with a single flattened tree
 *       IsEmpty=true     -> explicit "(no results)" muted line
 *   - `MethodsStack` is collapsed behind `isDev()` (mirrors
 *     `EnvelopeErrorPanel::shouldShowFrames` semantics) OR when the
 *     wire `Status.Code >= 500`; in production for a 2xx envelope, the
 *     tree is hidden with a one-line muted note. No `try/catch` swallow.
 *   - `Errors.Code` renders via `CorrelationIdChip` when the caller
 *     supplies a correlation id + optional CliInvocationId deep link;
 *     Step 125's chip is the single source of truth for that surface.
 *   - Pure presentation. No fetching, no store writes, no toasts. The
 *     component throws nothing; every unknown value falls through to a
 *     verbatim JSON.stringify so an unexpected shape is visible, never
 *     hidden behind a "failed to render" placeholder.
 *
 * Contract with `src/lib/be-fetch.ts::Envelope`: PascalCase everywhere.
 * The viewer accepts `unknown` and narrows with `isEnvelopeLike` so
 * partial / reconstructed envelopes (e.g. Step 112's synthetic exit
 * envelope) render without a runtime crash.
 */
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import type {
  Envelope,
  EnvelopeAttributes,
  EnvelopeErrorsWire,
  EnvelopeStatus,
} from "../../lib/be-fetch";
import { CorrelationIdChip } from "./CorrelationIdChip";

// ---------------------------------------------------------------------------
// Env / dev gate (mirrors EnvelopeErrorPanel::shouldShowFrames)
// ---------------------------------------------------------------------------

function isDev(): boolean {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Shape narrowing (accepts partials without throwing)
// ---------------------------------------------------------------------------

interface EnvelopeLike {
  Status?: Partial<EnvelopeStatus>;
  Attributes?: Partial<EnvelopeAttributes>;
  Results?: unknown[];
  Errors?: Partial<EnvelopeErrorsWire> | null;
  MethodsStack?: unknown;
  Navigation?: unknown;
}

function isEnvelopeLike(x: unknown): x is EnvelopeLike {
  return !!x && typeof x === "object";
}

// ---------------------------------------------------------------------------
// Presentation atoms
// ---------------------------------------------------------------------------

const SECTION_LABEL = "text-[11px] font-semibold uppercase tracking-wide text-ca-ink-muted mb-1";
const KV_ROW = "grid grid-cols-[10rem_1fr] gap-x-hmi-2 gap-y-0.5 font-mono text-hmi-caption";

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-ca-ink-muted">{k}</dt>
      <dd className="text-ca-ink break-all">{v}</dd>
    </>
  );
}

function scalar(v: unknown): React.ReactNode {
  if (v === null || v === undefined) return <span className="opacity-60">null</span>;

  if (typeof v === "string") return v.length ? v : <span className="opacity-60">""</span>;

  if (typeof v === "number" || typeof v === "boolean") return String(v);

  return null;
}

/**
 * Recursive PascalCase-preserving tree. No key remapping, no coercion.
 * Unknown scalar types fall through to JSON.stringify so an unexpected
 * shape is VISIBLE, not swallowed.
 */
export function EnvelopeTree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const s = scalar(value);

  if (s !== null) return <span className="text-ca-ink">{s}</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-ca-ink-muted">[]</span>;

    return (
      <ol className={cn("list-decimal ml-5 space-y-0.5", depth > 3 && "opacity-90")}>
        {value.map((it, i) => (
          <li key={i}>
            <EnvelopeTree value={it} depth={depth + 1} />
          </li>
        ))}
      </ol>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) return <span className="text-ca-ink-muted">{"{}"}</span>;

    return (
      <dl className={cn(KV_ROW, depth > 0 && "ml-3")}>
        {entries.map(([k, v]) => (
          <KV key={k} k={k} v={<EnvelopeTree value={v} depth={depth + 1} />} />
        ))}
      </dl>
    );
  }

  return (
    <span className="text-ca-ink">
      {(() => {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      })()}
    </span>
  );
}

function Collapsible({
  title,
  defaultOpen = true,
  children,
  testId,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ca-ink-muted hover:text-ca-ink"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {title}
      </button>
      {open && <div className="pl-4">{children}</div>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Public props
// ---------------------------------------------------------------------------

export interface EnvelopeViewerProps {
  envelope: Envelope<unknown> | EnvelopeLike | unknown;
  /** When set, the top-right header shows a CorrelationIdChip. */
  correlationId?: string | null;
  /** Optional CliInvocationId to make the chip a session drill-down link. */
  cliInvocationId?: string | number | null;
  /** Escape hatch for tests: always render MethodsStack regardless of gate. */
  forceShowMethodsStack?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Viewer
// ---------------------------------------------------------------------------

export function EnvelopeViewer({
  envelope,
  correlationId,
  cliInvocationId,
  forceShowMethodsStack = false,
  className,
}: EnvelopeViewerProps) {
  const env: EnvelopeLike = isEnvelopeLike(envelope) ? envelope : {};
  const status = env.Status ?? {};
  const attrs = env.Attributes ?? {};
  const results = Array.isArray(env.Results) ? env.Results : [];
  const errors = env.Errors ?? null;
  const methodsStack = env.MethodsStack;

  const isMultiple = attrs.IsMultiple === true;
  const isEmpty = attrs.IsEmpty === true || results.length === 0;

  const showMethodsStack = useMemo(() => {
    if (forceShowMethodsStack) return true;

    if (methodsStack === undefined || methodsStack === null) return false;

    if (isDev()) return true;
    const code = typeof status.Code === "number" ? status.Code : 0;

    return code >= 500;
  }, [forceShowMethodsStack, methodsStack, status.Code]);

  return (
    <div className={cn("space-y-hmi-3", className)} data-testid="envelope-viewer">
      {/* Header: Status + optional correlation chip */}
      <div className="flex flex-wrap items-center justify-between gap-hmi-2">
        <div className={KV_ROW}>
          <KV
            k="Status"
            v={
              <span
                className={cn(
                  "font-medium",
                  status.IsSuccess
                    ? "text-emerald-600 dark:text-emerald-400"
                    : status.IsFailed
                      ? "text-destructive"
                      : "text-ca-ink",
                )}
              >
                {status.IsSuccess ? "IsSuccess" : status.IsFailed ? "IsFailed" : "unknown"}{" "}
                <span className="text-ca-ink-muted">
                  ({typeof status.Code === "number" ? status.Code : "?"})
                </span>
              </span>
            }
          />
          {status.Message ? <KV k="Message" v={status.Message} /> : null}
          {status.Timestamp ? <KV k="Timestamp" v={status.Timestamp} /> : null}
        </div>
        {correlationId ? (
          <CorrelationIdChip
            value={correlationId}
            cliInvocationId={cliInvocationId ?? null}
            label="corr"
          />
        ) : null}
      </div>

      {/* Attributes */}
      {Object.keys(attrs).length > 0 && (
        <Collapsible title="Attributes" testId="envelope-viewer-attributes">
          <EnvelopeTree value={attrs} />
        </Collapsible>
      )}

      {/* Results (respects IsMultiple + IsEmpty) */}
      <Collapsible
        title={isEmpty ? "Result (empty)" : isMultiple ? `Results (${results.length})` : "Result"}
        testId="envelope-viewer-results"
      >
        {isEmpty ? (
          <p className="font-mono text-hmi-caption text-ca-ink-muted">(no results)</p>
        ) : isMultiple ? (
          <ol className="list-decimal ml-5 space-y-hmi-2">
            {results.map((r, i) => (
              <li key={i}>
                <EnvelopeTree value={r} />
              </li>
            ))}
          </ol>
        ) : (
          <EnvelopeTree value={results[0]} />
        )}
      </Collapsible>

      {/* Errors */}
      {errors && (
        <Collapsible title="Errors" testId="envelope-viewer-errors">
          <dl className={KV_ROW}>
            {errors.Code ? <KV k="Code" v={errors.Code} /> : null}
            {errors.BackendMessage ? <KV k="BackendMessage" v={errors.BackendMessage} /> : null}
          </dl>
          {errors.Backend?.length ||
          errors.Frontend?.length ||
          errors.DelegatedServiceErrorStack?.length ? (
            <div className="mt-hmi-2 space-y-hmi-2">
              {errors.Backend?.length ? (
                <section>
                  <h5 className={SECTION_LABEL}>Backend</h5>
                  <EnvelopeTree value={errors.Backend} />
                </section>
              ) : null}
              {errors.Frontend?.length ? (
                <section>
                  <h5 className={SECTION_LABEL}>Frontend</h5>
                  <EnvelopeTree value={errors.Frontend} />
                </section>
              ) : null}
              {errors.DelegatedServiceErrorStack?.length ? (
                <section>
                  <h5 className={SECTION_LABEL}>DelegatedServiceErrorStack</h5>
                  <EnvelopeTree value={errors.DelegatedServiceErrorStack} />
                </section>
              ) : null}
            </div>
          ) : null}
        </Collapsible>
      )}

      {/* MethodsStack (dev-gated) */}
      {methodsStack !== undefined &&
        methodsStack !== null &&
        (showMethodsStack ? (
          <Collapsible
            title="MethodsStack (dev)"
            defaultOpen={false}
            testId="envelope-viewer-methods-stack"
          >
            <EnvelopeTree value={methodsStack} />
          </Collapsible>
        ) : (
          <p
            className="text-[11px] text-ca-ink-muted"
            data-testid="envelope-viewer-methods-stack-hidden"
          >
            MethodsStack is hidden in production for 2xx envelopes. Reproduce with a dev build or a
            5xx response to inspect the full trace.
          </p>
        ))}
    </div>
  );
}