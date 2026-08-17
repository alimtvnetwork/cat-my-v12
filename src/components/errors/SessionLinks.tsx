// Plan 90 Step 78: Deep-link surface for the Global Error Modal.
//
// Root cause guarded (one sentence): Steps 75-77 shipped session / logs / ipc
// viewers keyed on `CliInvocationId`, but wire errors like `E_CLI_*` and
// `E_IPC_*` still surfaced as opaque banners with no path back into the
// operator UI, forcing a manual copy of the id from the toast into the URL bar.
//
// Contract: any `CapturedError` whose `context` carries `CliInvocationId`
// (canonical PascalCase; also `cli_invocation_id` for BE parity) renders a
// row of deep links into the observability routes. Mailbox derivation for
// the IPC link mirrors BE Step 74: honor `context.Mailbox` when present,
// otherwise let the BE default (derived from `CliInvocation.CliName`) win.
// If the id is missing we render nothing (never fabricate a link target).

import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import type { CapturedError } from "@/types/errors";

function extractCliInvocationId(err: CapturedError): number | null {
  const raw =
    (err.context?.CliInvocationId as unknown) ?? (err.context?.cli_invocation_id as unknown);

  if (raw === undefined || raw === null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);

  if (Number.isFinite(n) === false || Number.isInteger(n) === false || n <= 0) return null;

  return n;
}

const MAILBOX_ALLOWLIST = ["worker-out", "processing-in", "processing-out", "main-in"] as const;
type Mailbox = (typeof MAILBOX_ALLOWLIST)[number];

function extractMailbox(err: CapturedError): Mailbox | null {
  const raw = err.context?.Mailbox ?? err.context?.mailbox;

  if (typeof raw !== "string") return null;

  return (MAILBOX_ALLOWLIST as readonly string[]).includes(raw) ? (raw as Mailbox) : null;
}

export function SessionLinks({ err }: { err: CapturedError }): React.JSX.Element | null {
  const cliInvocationId = extractCliInvocationId(err);

  if (cliInvocationId === null) return null;

  const idStr = String(cliInvocationId);
  const mailbox = extractMailbox(err);
  const codeUpper = err.code?.toUpperCase() ?? "";
  const isIpcCode = codeUpper.startsWith("E_IPC_");
  const isCliCode = codeUpper.startsWith("E_CLI_");

  return (
    <section className="mt-4 border-t pt-4" aria-label="Observability deep links">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Session links
      </h3>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          to="/observability/sessions"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono hover:bg-muted/60"
          title="Open the session list filtered around this invocation"
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          Sessions
        </Link>
        <Link
          to="/observability/sessions/$cliInvocationId/logs"
          params={{ cliInvocationId: idStr }}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono hover:bg-muted/60 ${
            isCliCode ? "border-red-500/60" : ""
          }`}
          title="Tail the JSONL log for this CLI invocation"
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          Logs
          {isCliCode ? (
            <span className="ml-1 rounded bg-red-500/15 px-1 text-[10px] text-red-600 dark:text-red-400">
              {codeUpper}
            </span>
          ) : null}
        </Link>
        <Link
          to="/observability/sessions/$cliInvocationId/ipc"
          params={{ cliInvocationId: idStr }}
          search={mailbox ? { mailbox } : undefined}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono hover:bg-muted/60 ${
            isIpcCode ? "border-red-500/60" : ""
          }`}
          title={
            mailbox
              ? `Open IPC monitor scoped to ${mailbox}`
              : "Open IPC monitor (mailbox auto-derived from CLI name)"
          }
        >
          <ExternalLink className="h-3 w-3" aria-hidden />
          IPC{mailbox ? ` (${mailbox})` : ""}
          {isIpcCode ? (
            <span className="ml-1 rounded bg-red-500/15 px-1 text-[10px] text-red-600 dark:text-red-400">
              {codeUpper}
            </span>
          ) : null}
        </Link>
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground"
          title="CLI invocation id extracted from error context"
        >
          CliInvocationId: {idStr}
        </span>
      </div>
    </section>
  );
}
