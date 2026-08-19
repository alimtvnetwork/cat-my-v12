import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientLogger } from "@/lib/observability/client-logger";
import type { CapturedError } from "@/types/errors";
import { EnvelopeErrorPanel } from "./EnvelopeErrorPanel";
import { SessionLinks } from "./SessionLinks";

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function OverviewTab({ err }: { err: CapturedError }) {
  return (
    <>
      <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Code</dt>
        <dd className="font-mono">{err.code}</dd>
        <dt className="text-muted-foreground">Correlation ID</dt>
        <dd className="font-mono flex items-center gap-2">
          <span>{err.correlationId}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={() => {
              try {
                void navigator.clipboard?.writeText(err.correlationId);
                ClientLogger.info(`[GlobalErrorModal] copied correlation id ${err.correlationId}`);
              } catch (e) {
                ClientLogger.error("[GlobalErrorModal] copy correlation id failed", e);
              }
            }}
            title="Copy correlation id"
          >
            <Copy className="h-3 w-3" aria-hidden />
            Copy
          </Button>
        </dd>
        <dt className="text-muted-foreground">Level</dt>
        <dd>{err.level}</dd>
        <dt className="text-muted-foreground">Message</dt>
        <dd className="whitespace-pre-wrap break-all">{err.message}</dd>
        {err.details ? (
          <>
            <dt className="text-muted-foreground">Details</dt>
            <dd className="whitespace-pre-wrap break-all">{err.details}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">When</dt>
        <dd>{formatTimestamp(err.createdAt)}</dd>
        {err.endpoint ? (
          <>
            <dt className="text-muted-foreground">Endpoint</dt>
            <dd className="font-mono break-all">
              {err.method ? `${err.method} ` : ""}
              {err.endpoint}
            </dd>
          </>
        ) : null}
        {typeof err.responseStatus === "number" ? (
          <>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-mono">{err.responseStatus}</dd>
          </>
        ) : null}
        {err.triggerComponent || err.triggerAction ? (
          <>
            <dt className="text-muted-foreground">Trigger</dt>
            <dd className="font-mono">
              {err.triggerComponent ?? "?"}
              {err.triggerAction ? `.${err.triggerAction}` : ""}
            </dd>
          </>
        ) : null}
      </dl>
      {err.envelopeErrors ? (
        <div className="mt-4 border-t pt-4">
          <EnvelopeErrorPanel err={err} />
        </div>
      ) : null}
      <SessionLinks err={err} />
    </>
  );
}
