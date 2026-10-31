import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Copy, FileText, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useErrorStore } from "@/lib/stores/errorStore";
import { copyText } from "@/lib/errors/copy-text";
import type { CapturedError } from "@/types/errors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TopBarErrorButtonProps {
  className?: string;
  isCompact?: boolean;
  hasLabel?: boolean;
}

function buildErrorMarkdown(err: CapturedError): string {
  const lines: string[] = [
    `### Diagnostic Report: [${err.code}]`,
    `- **Correlation ID**: \`${err.correlationId}\``,
    `- **Level**: \`${err.level}\``,
    `- **Timestamp**: ${err.createdAt}`,
    `- **Message**: ${err.message}`,
  ];

  if (err.triggerComponent) {
    lines.push(`- **Component**: \`${err.triggerComponent}\``);
  }

  if (err.triggerAction) {
    lines.push(`- **Action**: \`${err.triggerAction}\``);
  }

  if (err.endpoint) {
    lines.push(`- **Endpoint**: \`${err.method ? `${err.method} ` : ""}${err.endpoint}\``);
  }

  if (typeof err.responseStatus === "number") {
    lines.push(`- **HTTP Status**: \`${err.responseStatus}\``);
  }

  if (err.stackTrace) {
    lines.push("", "```typescript", "// Frontend Stack Trace", err.stackTrace, "```");
  }

  if (err.backendStackTrace) {
    lines.push("", "```python", "# Backend Stack Trace", err.backendStackTrace, "```");
  }

  return lines.join("\n");
}

function buildAllErrorsMarkdown(errors: readonly CapturedError[]): string {
  if (errors.length === 0) {
    return "# System Status: Healthy\nNo active runtime errors logged.";
  }

  const lines: string[] = [
    `# System Diagnostic Report (${errors.length} active error${errors.length === 1 ? "" : "s"})`,
    `Generated at: ${new Date().toISOString()}`,
    "",
    "| Code | Correlation ID | Level | Component | Message |",
    "| :--- | :--- | :--- | :--- | :--- |",
  ];

  for (const err of errors) {
    const cleanMsg = err.message.replace(/\|/g, "\\|").replace(/\n/g, " ");
    lines.push(
      `| \`${err.code}\` | \`${err.correlationId}\` | \`${err.level}\` | \`${err.triggerComponent ?? "System"}\` | ${cleanMsg} |`,
    );
  }

  lines.push("", "## Individual Error Traces");

  for (const err of errors) {
    lines.push("", buildErrorMarkdown(err));
  }

  return lines.join("\n");
}

/**
 * TopBarErrorButton: Persistent, prominent error status trigger in top navigation bars.
 * Connected to `useErrorStore` to display live active error count badge.
 * Provides 1-click modal launch, quick markdown copying, and keyboard shortcut (Ctrl+Shift+E).
 */
export function TopBarErrorButton({
  className,
  isCompact = false,
  hasLabel = true,
}: TopBarErrorButtonProps): React.JSX.Element | null {
  const currentError = useErrorStore((s) => s.currentError);
  const history = useErrorStore((s) => s.history);
  const openErrorModal = useErrorStore((s) => s.openErrorModal);
  const openHistoryDrawer = useErrorStore((s) => s.openHistoryDrawer);
  const clearHistory = useErrorStore((s) => s.clearHistory);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const errorCount = history.length;
  const hasErrors = errorCount > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) {
        return;
      }

      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isModifierActive = isMac ? e.metaKey : e.ctrlKey;

      if (isModifierActive && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        const activeCurrent = useErrorStore.getState().currentError;

        if (activeCurrent) {
          openErrorModal(activeCurrent);
        } else {
          openHistoryDrawer();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openErrorModal, openHistoryDrawer]);

  const handleMainClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (hasErrors) {
      if (currentError) {
        openErrorModal(currentError);
      } else {
        openErrorModal();
      }
    } else {
      openHistoryDrawer();
    }
  };

  const handleCopyLatestMarkdown = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = currentError || history[0];

    if (!target) {
      toast.info("No active errors to copy");

      return;
    }

    const md = buildErrorMarkdown(target);
    const result = await copyText(md);

    if (result.isCopied) {
      toast.success("Copied error diagnostics markdown", {
        description: `[${target.code}] ${target.correlationId}`,
      });

      return;
    }

    toast.error("Failed to copy markdown diagnostics", {
      description: result.failureMessage,
    });
  };

  const handleCopyAllMarkdown = async (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (history.length === 0) {
      toast.info("No active errors to copy");

      return;
    }

    const md = buildAllErrorsMarkdown(history);
    const result = await copyText(md);

    if (result.isCopied) {
      toast.success(`Copied ${history.length} error traces as Markdown to clipboard`);

      return;
    }

    toast.error("Failed to copy diagnostics report", {
      description: result.failureMessage,
    });
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearHistory();
    toast.success("Error history cleared");
    setIsDropdownOpen(false);
  };

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      data-testid="topbar-error-button-container"
    >
      <button
        type="button"
        onClick={handleMainClick}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsDropdownOpen(true);
        }}
        data-testid="topbar-error-status-pill"
        aria-label={
          hasErrors
            ? `View ${errorCount} active diagnostic errors (Ctrl+Shift+E)`
            : "System healthy: 0 active errors (Click to view history)"
        }
        title={
          hasErrors
            ? `${errorCount} active diagnostic errors. Click to open modal (Ctrl+Shift+E). Right-click for options.`
            : "System healthy. 0 errors. Click to open drawer. Right-click for options."
        }
        className={cn(
          "group flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold select-none transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1",
          hasErrors
            ? "border border-rose-500/50 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 hover:border-rose-400 focus-visible:ring-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.35)]"
            : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400 focus-visible:ring-emerald-400",
        )}
      >
        {hasErrors ? (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        )}

        {hasLabel && (
          <span className="font-mono text-[11px] font-bold tracking-tight">
            {hasErrors ? `NG (${errorCount})` : isCompact ? "OK" : "Healthy"}
          </span>
        )}
      </button>

      {hasErrors && (
        <button
          type="button"
          onClick={handleCopyLatestMarkdown}
          title="Quick Copy latest error Markdown diagnostics"
          aria-label="Quick copy error markdown"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/25 hover:text-white transition-colors cursor-pointer select-none"
        >
          <Copy className="h-3 w-3" />
        </button>
      )}

      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Error diagnostics menu options"
            title="Error diagnostics menu options"
            className={cn(
              "flex h-6 w-5 items-center justify-center rounded-md border text-slate-400 hover:text-slate-100 transition-colors cursor-pointer",
              hasErrors
                ? "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                : "border-ca-border/60 bg-ca-panel/40 hover:bg-ca-panel-2",
            )}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 text-xs">
          <DropdownMenuLabel className="font-mono text-[10px] uppercase text-muted-foreground">
            Diagnostics ({errorCount} {errorCount === 1 ? "Error" : "Errors"})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              if (currentError) {
                openErrorModal(currentError);
              } else {
                openErrorModal();
              }
            }}
            className="gap-2 cursor-pointer"
          >
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
            <span>Open Diagnostic Modal</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">Ctrl+Shift+E</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => openHistoryDrawer()} className="gap-2 cursor-pointer">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            <span>Open History Drawer</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleCopyLatestMarkdown}
            disabled={!hasErrors}
            className="gap-2 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-amber-400" />
            <span>Copy Latest Error (Markdown)</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleCopyAllMarkdown}
            disabled={!hasErrors}
            className="gap-2 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
            <span>Copy All Errors ({errorCount})</span>
          </DropdownMenuItem>

          {hasErrors && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClearHistory}
                className="gap-2 text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Clear Error History</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
