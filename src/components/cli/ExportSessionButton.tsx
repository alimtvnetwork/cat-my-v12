/**
 * Plan 90 Step 144 - `<ExportSessionButton>` triggers the same-origin zip
 * download for a CLI session's disk artefacts.
 *
 * Root cause guarded (one sentence): before this button existed, support
 * triage was stitched together by hand from three modal tabs (Step 143
 * copy-envelope-button helps for one error, this button ships the whole
 * session), so `log.jsonl`, IPC files, and the summary went missing from
 * tickets or landed in inconsistent shapes.
 *
 * Behaviour:
 *  - Disabled with an explanation when `runId` is null (RunId is required
 *    by the disk projection; there is no way to correlate log/IPC without it).
 *  - Never uses `fetch()` for the actual body transfer: we drive the download
 *    with a hidden <a href download>, which lets the browser stream the zip
 *    straight to disk instead of holding a 40 MiB Blob in JS memory.
 *  - Any HEAD-style precheck is intentionally skipped: the proxy route
 *    forwards the BE envelope on 404/413 verbatim, so a bad RunId shows the
 *    browser's own download error rather than a stale button state.
 */
import { useCallback, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ExportSessionButtonProps {
  runId: string | null | undefined;
  compact?: boolean;
}

export function ExportSessionButton({ runId, compact }: ExportSessionButtonProps) {
  const [pending, setPending] = useState(false);
  const disabled = !runId || pending;

  const onClick = useCallback(() => {
    if (!runId) return;
    setPending(true);
    // Use an anchor rather than fetch+Blob so the browser streams the zip
    // straight to disk. The proxy sets Content-Disposition so no download
    // attribute value is required, but we include the RunId as a hint in
    // case the proxy header is stripped by an intermediary.
    const a = document.createElement("a");
    a.href = `/api/cli/sessions/${encodeURIComponent(runId)}/export`;
    a.download = `cli-session-${runId}.zip`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Downloads are fire-and-forget; there is no client-observable event
    // for "download finished". Clear the pending flag after a short window
    // so the button re-enables even if the user cancels the save dialog.
    window.setTimeout(() => setPending(false), 1500);
  }, [runId]);

  const btn = (
    <Button
      variant="outline"
      size={compact ? "sm" : "default"}
      onClick={onClick}
      disabled={disabled}
      aria-label="Export session bundle"
      data-testid="cli-session-export-button"
      className="gap-hmi-1"
    >
      <Download className="h-4 w-4" aria-hidden />
      <span>{pending ? "Preparing…" : "Export"}</span>
    </Button>
  );

  if (runId) return btn;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{btn}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          Export requires a RunId; this session has no correlation.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ExportSessionButton;
