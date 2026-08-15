import { ErrorLevelType } from "@/types/errors";
/**
 * Plan 90 Step 112 - "Open exit envelope" drawer for /cli/sessions/$sessionId.
 *
 * Root cause guarded (one sentence): after Step 111 landed level filters, an
 * operator triaging a failed run had to eyeball the whole JSONL to piece
 * together the terminal error (Code + Message + Ctx + ExitCode + duration),
 * so this drawer synthesizes a session.end envelope from the Root-DB row
 * plus the last ERROR-bucket JSONL record and renders it via the shared
 * `EnvelopeErrorPanel` (success runs get a green summary card instead).
 *
 * The BE never persists a discrete `session.end` envelope: `BE/cli/common/
 * session.py` closes the run by flipping `EndedAt`/`ExitCode`/`IsSuccess`
 * in `CliInvocation` and emitting a FATAL JSONL line whose `Ctx.ExitCode`
 * matches. This component reconstructs the envelope client-side from those
 * two authoritative sources - it does NOT fabricate frames or invent a
 * BackendMessage; if no ERROR-bucket row is present we say so verbatim.
 *
 * Contract:
 *   - `session` must be an ended session (`EndedAt != null`); the trigger
 *     button is disabled otherwise and the drawer contents render an empty
 *     state instead of a misleading "success" card.
 *   - `items` is the historical JSONL projection (Step 108); live-tail rows
 *     are intentionally not scanned because the terminal FATAL line is
 *     always written before `close_session` returns and is therefore
 *     already in the historical projection by the time the row is closed.
 *
 * Spec: spec/03-error-manage/02-error-architecture/05-response-envelope/
 *       spec/21-app/74-worker-cli.md §"Acceptance #6" (exit-code contract)
 */
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EnvelopeErrorPanel } from "@/components/errors/EnvelopeErrorPanel";
import { CorrelationIdChip } from "@/components/cli/CorrelationIdChip";
import type { CapturedError, EnvelopeErrors } from "@/types/errors";
import type { ObservabilitySession } from "@/lib/observability/sessions.functions";
import type { LogTailItem } from "@/lib/observability/logs.functions";

const ERROR_BUCKET = new Set(["error", "critical", "fatal"]);

function isErrorLevel(raw: unknown): boolean {
  return typeof raw === "string" && ERROR_BUCKET.has(raw.toLowerCase());
}

function formatIso(sec: number | null): string {
  if (sec == null) return "-";
  try {
    return new Date(sec * 1000).toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return String(sec);
  }
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "-";

  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;

  if (s < 60) return `${s.toFixed(2)} s`;
  const m = Math.floor(s / 60);
  const rem = (s - m * 60).toFixed(1);

  return `${m}m ${rem}s`;
}

interface FailureExtract {
  code: string;
  message: string;
  ctx: Record<string, unknown> | undefined;
  timestamp: string | undefined;
}

/**
 * Walk historical rows in reverse and pull the LAST error-bucket record.
 * Returns null when the run failed but no error row was ever written
 * (e.g. hard SIGKILL) - the caller renders an explicit empty-state card
 * rather than fabricating a message.
 */
function extractLastFailure(items: LogTailItem[]): FailureExtract | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const row = items[i] as unknown as Record<string, unknown>;

    if (row._ParseError) continue;

    if (isErrorLevel(row.Level ?? row.level) === false) continue;
    const ctx =
      row.Ctx && typeof row.Ctx === "object" && Array.isArray(row.Ctx) === false
        ? (row.Ctx as Record<string, unknown>)
        : undefined;
    const code =
      (typeof row.Code === "string" && row.Code) ||
      (ctx && typeof ctx.Code === "string" && ctx.Code) ||
      "E_CLI_UNKNOWN";
    const message =
      (typeof row.Message === "string" && row.Message) ||
      (typeof row.msg === "string" && row.msg) ||
      "(no message)";
    const timestamp = typeof row.Timestamp === "string" ? row.Timestamp : undefined;

    return { code: String(code), message: String(message), ctx, timestamp };
  }

  return null;
}

function buildSyntheticCapturedError(
  session: ObservabilitySession,
  failure: FailureExtract,
): CapturedError {
  const envelopeErrors: EnvelopeErrors = {
    // Verbatim operator-facing message from the JSONL row. We do NOT
    // rewrite or prefix it; the panel adds the "Backend message" label.
    BackendMessage: failure.message,
  };

  return {
    id: `cli-exit-${session.CliInvocationId}`,
    correlationId: session.RunId ?? String(session.CliInvocationId),
    code: failure.code,
    level: ErrorLevelType.Error,
    message: failure.message,
    createdAt: failure.timestamp ?? new Date().toISOString(),
    context: failure.ctx,
    endpoint: session.LogPath ?? undefined,
    // Force EnvelopeErrorPanel's frames branch off (we have no wire frames),
    // but still keep the panel honest: BackendMessage is always shown.
    responseStatus: 0,
    envelopeErrors,
  };
}

export interface ExitEnvelopeDrawerProps {
  session: ObservabilitySession | null | undefined;
  items: LogTailItem[];
}

export function ExitEnvelopeDrawer({ session, items }: ExitEnvelopeDrawerProps) {
  const [open, setOpen] = useState(false);
  const ended = !!session && session.EndedAt != null;
  const success = ended && (session.IsSuccess === true || session.ExitCode === 0);

  const failure = useMemo<FailureExtract | null>(() => {
    if (!ended || success) return null;

    return extractLastFailure(items);
  }, [ended, success, items]);

  const capturedError = useMemo<CapturedError | null>(() => {
    if (!session || !failure) return null;

    return buildSyntheticCapturedError(session, failure);
  }, [session, failure]);

  const disabled = !ended;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant={success ? "outline" : "default"}
          disabled={disabled}
          title={
            disabled ? "Session is still running - exit envelope is not available yet" : undefined
          }
          data-testid="exit-envelope-open"
        >
          <FileText className="mr-1 h-3.5 w-3.5" />
          Exit envelope
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
        data-testid="exit-envelope-drawer"
      >
        <SheetHeader>
          <SheetTitle>
            {!ended
              ? "Session still running"
              : success
                ? "Session completed successfully"
                : "Session ended with a failure"}
          </SheetTitle>
          <SheetDescription>
            Synthesized from the Root-DB CliInvocation row and the terminal JSONL record. No wire
            envelope is persisted per spec.
          </SheetDescription>
        </SheetHeader>

        {!session ? (
          <p className="mt-hmi-3 text-hmi-body text-ca-ink-muted">
            Session row is not in the current projection window.
          </p>
        ) : (
          <div className="mt-hmi-3 space-y-hmi-3">
            <dl className="grid grid-cols-[8rem_1fr] gap-x-hmi-2 gap-y-1 font-mono text-hmi-caption">
              <dt className="text-ca-ink-muted">CLI</dt>
              <dd className="text-ca-ink">{session.CliName}</dd>
              {session.Subcommand && (
                <>
                  <dt className="text-ca-ink-muted">Subcommand</dt>
                  <dd className="text-ca-ink">{session.Subcommand}</dd>
                </>
              )}
              <dt className="text-ca-ink-muted">Started</dt>
              <dd className="text-ca-ink">{formatIso(session.StartedAt)}</dd>
              <dt className="text-ca-ink-muted">Ended</dt>
              <dd className="text-ca-ink">{formatIso(session.EndedAt)}</dd>
              <dt className="text-ca-ink-muted">Duration</dt>
              <dd className="text-ca-ink">{formatDuration(session.DurationMs)}</dd>
              <dt className="text-ca-ink-muted">Exit code</dt>
              <dd className="text-ca-ink">{session.ExitCode ?? "-"}</dd>
              {session.RunId && (
                <>
                  <dt className="text-ca-ink-muted">Run id</dt>
                  <dd>
                    <CorrelationIdChip
                      value={session.RunId}
                      cliInvocationId={session.CliInvocationId}
                      label="run"
                    />
                  </dd>
                </>
              )}
            </dl>

            {success ? (
              <div
                data-testid="exit-envelope-success"
                className="flex items-start gap-hmi-2 rounded-hmi-sm border border-emerald-500/40 bg-emerald-500/5 p-hmi-3 text-emerald-700 dark:text-emerald-400"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-hmi-body font-medium">IsSuccess: true - ExitCode 0</p>
                  <p className="mt-1 text-hmi-caption opacity-80">
                    The session closed cleanly. No terminal error record was emitted.
                  </p>
                </div>
              </div>
            ) : capturedError ? (
              <div data-testid="exit-envelope-failure" className="space-y-hmi-2">
                <div className="flex items-start gap-hmi-2 rounded-hmi-sm border border-destructive/40 bg-destructive/5 p-hmi-3 text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-hmi-body font-medium">{capturedError.code}</p>
                    <p className="mt-1 text-hmi-caption opacity-80">
                      Reconstructed from the last ERROR-bucket JSONL record at{" "}
                      {failure?.timestamp ?? "unknown time"}.
                    </p>
                  </div>
                </div>
                <EnvelopeErrorPanel err={capturedError} />
                {capturedError.context && (
                  <section>
                    <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Ctx (verbatim)
                    </h4>
                    <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(capturedError.context, null, 2)}
                    </pre>
                  </section>
                )}
              </div>
            ) : (
              <div
                data-testid="exit-envelope-no-record"
                className="flex items-start gap-hmi-2 rounded-hmi-sm border border-amber-500/40 bg-amber-500/5 p-hmi-3 text-amber-700 dark:text-amber-400"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-hmi-body font-medium">
                    Failed with ExitCode {session.ExitCode ?? "?"}, but no ERROR-bucket JSONL record
                    was found.
                  </p>
                  <p className="mt-1 text-hmi-caption opacity-80">
                    Likely a SIGKILL, host crash, or truncated log rotation. Inspect the full log
                    for the terminal frames.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
