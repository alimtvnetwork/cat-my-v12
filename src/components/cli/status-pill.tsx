/**
 * Plan 90 Step 124 - Shared CLI status pill.
 *
 * Single source of truth for mapping CLI exit codes and IPC message
 * kinds to semantic tones. Every CLI observability surface (sessions
 * list, session drilldown, global header widget, future IPC inbox
 * chips) MUST route through this component so tone drift cannot
 * re-appear (Step 107 amber/emerald/red were previously copy-pasted
 * into three files).
 *
 * Tone contract:
 *   success     -> ExitCode.Ok (0), IPC ResultReady, healthy probes
 *   warning     -> session still running, ExitCode.Usage (2), Heartbeat
 *   destructive -> ExitCode.DomainError|IoError|VendorError (3/4/5),
 *                  IPC Error
 *   info        -> ExitCode unknown-but-nonzero surrogate, IPC FrameReady
 *   muted       -> unknown / not-yet-reported
 *
 * Colors are token-based: destructive + muted use shadcn semantic
 * variants; success/warning/info use the emerald/amber/sky ramps that
 * are already in the design system for CLI observability (matches the
 * existing pattern in `GlobalCliStatusWidget` and Step 107 badges).
 * No hardcoded hex values; every color goes through Tailwind tokens
 * so dark-mode inversion is handled by the design system.
 *
 * Contract with `ExitCode` (BE/cli/common/exit_codes.py):
 *   0 Ok, 2 Usage, 3 DomainError, 4 IoError, 5 VendorError
 * Contract with IPC Kind (BE/cli/common/ipc_models.py + ipc.py):
 *   FrameReady, ResultReady, Heartbeat, Error
 */
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { StatusToneType } from "@/lib/enums/ui";

export { StatusToneType };

const TONE_CLASS: Record<StatusToneType, string> = {
  [StatusToneType.Success]:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  [StatusToneType.Warning]:
    "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  [StatusToneType.Destructive]: "border-destructive/40 bg-destructive/10 text-destructive",
  [StatusToneType.Info]: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  [StatusToneType.Muted]: "border-border bg-muted text-muted-foreground",
};

const DOT_CLASS: Record<StatusToneType, string> = {
  [StatusToneType.Success]: "bg-emerald-500",
  [StatusToneType.Warning]: "bg-amber-500",
  [StatusToneType.Destructive]: "bg-destructive",
  [StatusToneType.Info]: "bg-sky-500",
  [StatusToneType.Muted]: "bg-muted-foreground",
};

export interface StatusPillProps {
  tone: StatusToneType;
  label: ReactNode;
  title?: string;
  /** Show a leading colored dot. Pulses when tone is `info` (in-flight). */
  dot?: boolean;
  /** Adopt outline appearance (no fill). Defaults to filled. */
  outline?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function StatusPill({
  tone,
  label,
  title,
  dot = false,
  outline = false,
  className,
  ...rest
}: StatusPillProps) {
  return (
    <span
      title={title}
      aria-label={typeof label === "string" ? label : title}
      data-tone={tone}
      data-testid={rest["data-testid"]}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        outline ? TONE_CLASS[tone].replace(/bg-\S+/g, "") : TONE_CLASS[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            DOT_CLASS[tone],
            StatusToneType.isInfo(tone) && "animate-pulse",
          )}
        />
      )}
      <span className="tabular-nums">{label}</span>
    </span>
  );
}

/**
 * Map a CLI exit code + terminal marker to a tone. `endedAt=null`
 * means the session has not finished yet, which is a warning
 * ("running") rather than success.
 */
export function toneForExitCode(
  code: number | null | undefined,
  endedAt: number | null | undefined,
): StatusToneType {
  if (endedAt == null) return StatusToneType.Warning;

  if (code == null) return StatusToneType.Muted;

  if (code === 0) return StatusToneType.Success;
  // 2=Usage is operator error, keep warning; 3/4/5 are hard failures.
  if (code === 2) return StatusToneType.Warning;

  if (code === 3 || code === 4 || code === 5) return StatusToneType.Destructive;

  return StatusToneType.Destructive; // any other non-zero: treat as failure, not "unknown"
}

/**
 * Map an IPC message Kind to a tone. Unknown kinds render as muted so
 * the UI still shows the raw string instead of crashing.
 */
export function toneForIpcKind(kind: string): StatusToneType {
  switch (kind) {
    case "ResultReady":

      return StatusToneType.Success;
    case "FrameReady":

      return StatusToneType.Info;
    case "Heartbeat":

      return StatusToneType.Warning;
    case "Error":

      return StatusToneType.Destructive;
    default:

      return StatusToneType.Muted;
  }
}