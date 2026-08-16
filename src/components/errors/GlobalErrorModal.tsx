import { ClientLogger } from "@/lib/observability/client-logger";
import { EmptyStateActionVariantType } from "@/components/common/EmptyState";
import { ErrorExportFormatType } from "@/lib/errors/export";
// Plan 71 Step 9: Global Error Modal.
// Spec: spec/03-error-manage/02-error-architecture/04-error-modal/03-error-modal-reference.md §5
//
// Tabs (this step): Overview, Stack, Context, History.
// Deeper backend/session/traversal tabs land in later steps once the API
// envelope integration is wired (Steps 11-13). Kept intentionally minimal so
// mount + wiring can be validated first without stubs pretending to work.

import { useMemo, useState, useSyncExternalStore } from "react";
import { Copy, Download, FileText, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErrorStore } from "@/lib/stores/errorStore";
import type { CapturedError } from "@/types/errors";
import { downloadErrorHistory } from "@/lib/errors/export";
import {
  clearRetry,
  getRetry,
  hasRetry,
  subscribeRetryRegistry,
} from "@/lib/errors/retry-registry";

import { EnvelopeErrorPanel } from "./EnvelopeErrorPanel";
import { ErrorQueueBadge } from "./ErrorQueueBadge";
import { SessionLinks } from "./SessionLinks";
import { EnvelopeTree } from "@/components/cli/envelope-viewer";

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function copyJson(value: unknown, label: string): void {
  try {
    const text = JSON.stringify(value, null, 2);
    void navigator.clipboard?.writeText(text);
    ClientLogger.info(`[GlobalErrorModal] copied ${label} (${text.length} bytes)`);
  } catch (err) {
    ClientLogger.error("[GlobalErrorModal] copy failed", err);
  }
}

// Build a human-readable diagnostics bundle that always includes the
// correlation id up top, followed by stack traces and context blocks.
// Copied as plain text so it can be pasted into support tickets, chat,
// or issue trackers without JSON escaping getting in the way.
function buildDiagnosticsText(err: CapturedError): string {
  const lines: string[] = [];
  lines.push(`Correlation ID: ${err.correlationId}`);
  lines.push(`Code:           ${err.code}`);
  lines.push(`Level:          ${err.level}`);
  lines.push(`When:           ${err.createdAt}`);
  lines.push(`Message:        ${err.message}`);

  if (err.details) lines.push(`Details:        ${err.details}`);

  if (err.endpoint) {
    lines.push(`Endpoint:       ${err.method ? `${err.method} ` : ""}${err.endpoint}`);
  }

  if (typeof err.responseStatus === "number") {
    lines.push(`Status:         ${err.responseStatus}`);
  }

  if (err.triggerComponent || err.triggerAction) {
    lines.push(
      `Trigger:        ${err.triggerComponent ?? "?"}${
        err.triggerAction ? `.${err.triggerAction}` : ""
      }`,
    );
  }

  if (typeof window !== "undefined") {
    lines.push(`URL:            ${window.location.href}`);
    lines.push(`User agent:     ${navigator.userAgent}`);
  }

  if (err.invocationChain && err.invocationChain.length > 0) {
    lines.push("", "Invocation chain:");
    err.invocationChain.forEach((step, i) => lines.push(`  ${i + 1}. ${step}`));
  }

  if (err.stackTrace) {
    lines.push("", "Frontend stack:", err.stackTrace);
  }

  if (err.backendStackTrace) {
    lines.push("", "Backend stack:", err.backendStackTrace);
  }

  if (err.context && Object.keys(err.context).length > 0) {
    lines.push("", "Context:", JSON.stringify(err.context, null, 2));
  }

  if (err.requestBody !== undefined && err.requestBody !== null) {
    lines.push("", "Request body:", JSON.stringify(err.requestBody, null, 2));
  }

  return lines.join("\n");
}

async function copyDiagnostics(err: CapturedError): Promise<void> {
  const text = buildDiagnosticsText(err);
  try {
    await navigator.clipboard?.writeText(text);
    ClientLogger.info(
      `[GlobalErrorModal] copied diagnostics cid=${err.correlationId} bytes=${text.length}`,
    );
    toast.success("Diagnostics copied", {
      description: `Correlation ID ${err.correlationId}`,
    });
  } catch (e) {
    ClientLogger.error("[GlobalErrorModal] copy diagnostics failed", e);
    toast.error("Failed to copy diagnostics", {
      description: e instanceof Error ? e.message : String(e),
    });
  }
}

function OverviewTab({ err }: { err: CapturedError }) {
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

function StackTab({ err }: { err: CapturedError }) {
  const hasEnvelope = Boolean(err.envelopeErrors);

  if (!err.stackTrace && !err.backendStackTrace && !hasEnvelope) {
    return (
      <p className="text-sm text-muted-foreground">No stack trace was captured for this error.</p>
    );
  }

  return (
    <div className="space-y-4">
      {err.stackTrace ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Frontend stack
          </h3>
          <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 p-3 rounded-md overflow-x-auto">
            {err.stackTrace}
          </pre>
        </section>
      ) : null}
      {err.backendStackTrace ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Backend stack
          </h3>
          <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 p-3 rounded-md overflow-x-auto">
            {err.backendStackTrace}
          </pre>
        </section>
      ) : null}
      {hasEnvelope ? <EnvelopeErrorPanel err={err} /> : null}
    </div>
  );
}

function ContextTab({ err }: { err: CapturedError }) {
  const hasContext = err.context && Object.keys(err.context).length > 0;
  const hasBody = err.requestBody !== undefined && err.requestBody !== null;
  const hasChain = err.invocationChain && err.invocationChain.length > 0;

  if (!hasContext && !hasBody && !hasChain) {
    return <p className="text-sm text-muted-foreground">No additional context was captured.</p>;
  }

  return (
    <div className="space-y-4 text-sm" data-testid="error-modal-context-tab">
      {hasChain ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Invocation chain
          </h3>
          <EnvelopeTree value={err.invocationChain} />
        </section>
      ) : null}
      {hasBody ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Request body
          </h3>
          <EnvelopeTree value={err.requestBody} />
        </section>
      ) : null}
      {hasContext ? (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Context
          </h3>
          <EnvelopeTree value={err.context} />
        </section>
      ) : null}
    </div>
  );
}

function HistoryTab() {
  const history = useErrorStore((s) => s.history);
  const currentId = useErrorStore((s) => s.currentError?.id);
  const openErrorModal = useErrorStore((s) => s.openErrorModal);
  const clearHistory = useErrorStore((s) => s.clearHistory);

  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [code, setCode] = useState<string>("all");
  const [scope, setScope] = useState<string>("all");

  const codes = useMemo(() => {
    const set = new Set<string>();
    for (const e of history) if (e.code) set.add(e.code);

    return Array.from(set).sort();
  }, [history]);

  const scopes = useMemo(() => {
    const set = new Set<string>();
    for (const e of history) {
      const s = (e.context?.scope as string | undefined) ?? e.triggerComponent;

      if (s) set.add(s);
    }

    return Array.from(set).sort();
  }, [history]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return history.filter((e) => {
      if (level !== "all" && e.level !== level) return false;

      if (code !== "all" && e.code !== code) return false;

      if (scope !== "all") {
        const s = (e.context?.scope as string | undefined) ?? e.triggerComponent;

        if (s !== scope) return false;
      }

      if (!q) return true;

      return (
        e.message.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.correlationId.toLowerCase().includes(q) ||
        (e.details?.toLowerCase().includes(q) ?? false) ||
        (e.endpoint?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [history, query, level, code, scope]);

  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No prior errors in this session.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search message, code, correlation id..."
            className="h-8 pl-7 text-xs"
            aria-label="Search error history"
          />
        </div>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger className="h-8 w-[120px] text-xs" aria-label="Filter by severity">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={code} onValueChange={setCode}>
          <SelectTrigger className="h-8 w-[160px] text-xs" aria-label="Filter by error code">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {codes.map((c) => (
              <SelectItem key={c} value={c} className="font-mono text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {scopes.length > 0 ? (
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="h-8 w-[160px] text-xs" aria-label="Filter by scope">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scopes</SelectItem>
              {scopes.map((s) => (
                <SelectItem key={s} value={s} className="font-mono text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {filtered.length === history.length
            ? `${history.length} ${history.length === 1 ? "error" : "errors"}`
            : `${filtered.length} of ${history.length}`}
        </span>
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => downloadErrorHistory(filtered, ErrorExportFormatType.Json)}
            className="text-xs gap-1"
            title="Download filtered error history as JSON"
          >
            <Download className="h-3 w-3" aria-hidden />
            JSON
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => downloadErrorHistory(filtered, ErrorExportFormatType.Csv)}
            className="text-xs gap-1"
            title="Download filtered error history as CSV"
          >
            <Download className="h-3 w-3" aria-hidden />
            CSV
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-xs"
          >
            Clear history
          </Button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1 py-4 text-center">
          No errors match the current filters.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => openErrorModal(e)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/60 focus:bg-muted/60 outline-none ${
                  e.id === currentId ? "bg-muted/40" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono">{e.code}</span>
                  <span className="text-muted-foreground flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase">{e.correlationId}</span>
                    <span>{formatTimestamp(e.createdAt)}</span>
                  </span>
                </div>
                <div className="truncate">{e.message}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GlobalErrorModal() {
  const isOpen = useErrorStore((s) => s.isOpen);
  const currentError = useErrorStore((s) => s.currentError);
  const closeErrorModal = useErrorStore((s) => s.closeErrorModal);
  const [tab, setTab] = useState<string>("overview");
  const [retrying, setRetrying] = useState(false);
  // Re-render when retry entries register/clear so the button appears without
  // waiting for the next unrelated state change.
  useSyncExternalStore(
    subscribeRetryRegistry,
    () => (currentError ? Number(hasRetry(currentError.correlationId)) : 0),
    () => 0,
  );
  const retry = currentError ? getRetry(currentError.correlationId) : undefined;

  const handleOpenChange = (open: boolean) => {
    if (!open) closeErrorModal();
  };

  const handleRetry = async () => {
    if (!currentError || !retry) return;
    setRetrying(true);
    ClientLogger.info(`[GlobalErrorModal] retry cid=${currentError.correlationId}`);
    try {
      await retry.fn();
      clearRetry(currentError.correlationId);
      toast.success("Retry succeeded", {
        description: `Correlation ID ${currentError.correlationId}`,
      });
      closeErrorModal();
    } catch (e) {
      ClientLogger.error("[GlobalErrorModal] retry failed", e);
      toast.error("Retry failed", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Dialog open={isOpen && !!currentError} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl gap-3 max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pr-8 shrink-0">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-start gap-2 min-w-0 flex-wrap">
                <ErrorQueueBadge />
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[hsl(var(--toast-error-bg))] text-[hsl(var(--toast-error-fg))] border border-[hsl(var(--toast-error-border))] shrink-0">
                  {currentError?.code ?? "E_UNKNOWN"}
                </span>
                <span
                  className="min-w-0 flex-1 break-all text-sm"
                  title={currentError?.message ?? "Error"}
                >
                  {currentError?.message ?? "Error"}
                </span>
              </DialogTitle>
              <DialogDescription>
                {currentError ? formatTimestamp(currentError.createdAt) : ""}
              </DialogDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1 shrink-0 md:justify-end">
              {retry ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleRetry}
                  disabled={retrying}
                  aria-label={retry.label ?? "Retry the failing action"}
                  className="text-xs"
                  title={retry.label ?? "Retry"}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 mr-1 ${retrying ? "animate-spin" : ""}`}
                    aria-hidden
                  />
                  {retrying ? "Retrying..." : (retry.label ?? "Retry")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant={EmptyStateActionVariantType.Secondary}
                size="sm"
                onClick={() => currentError && void copyDiagnostics(currentError)}
                aria-label="Copy diagnostics including correlation id, stack trace, and context"
                className="text-xs"
                title="Copy correlation id, stack trace, and context as plain text"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Copy diagnostics
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => currentError && copyJson(currentError, "captured error")}
                aria-label="Copy error JSON"
                className="text-xs"
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    "/spec/03-error-manage/01-error-resolution/05-debugging-guides/00-overview.md",
                    "_blank",
                  )
                }
                aria-label="Open debugging guides"
                className="text-xs"
              >
                <FileText className="h-3.5 w-3.5 mr-1" />
                Debug guide
              </Button>
            </div>
          </div>
        </DialogHeader>

        {currentError ? (
          <Tabs value={tab} onValueChange={setTab} className="w-full flex flex-col min-h-0 flex-1">
            <TabsList className="shrink-0">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="stack">Stack</TabsTrigger>
              <TabsTrigger value="context">Context</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <ScrollArea className="mt-3 pr-3 flex-1 min-h-0">
              <TabsContent value="overview" className="mt-0">
                <OverviewTab err={currentError} />
              </TabsContent>
              <TabsContent value="stack" className="mt-0">
                <StackTab err={currentError} />
              </TabsContent>
              <TabsContent value="context" className="mt-0">
                <ContextTab err={currentError} />
              </TabsContent>
              <TabsContent value="history" className="mt-0">
                <HistoryTab />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
