import { ClientLogger } from "@/lib/observability/client-logger";
import { toast } from "sonner";
import type { CapturedError } from "@/types/errors";
import { copyText } from "@/lib/errors/copy-text";

export function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function copyJson(value: unknown, label: string): void {
  const text = JSON.stringify(value, null, 2);

  void copyText(text).then((result) => {
    if (result.isCopied) {
      ClientLogger.info(`[GlobalErrorModal] copied ${label} (${text.length} bytes)`);
      toast.success(`Copied ${label}`);

      return;
    }

    ClientLogger.error("[GlobalErrorModal] copy failed", {
      label,
      failureMessage: result.failureMessage,
    });
    toast.error("Copy failed", {
      description: `${result.failureMessage}\n${text}`,
    });
  });
}

// Build a human-readable diagnostics bundle that always includes the
// correlation id up top, followed by stack traces and context blocks.
// Copied as plain text so it can be pasted into support tickets, chat,
// or issue trackers without JSON escaping getting in the way.
export function buildDiagnosticsText(err: CapturedError): string {
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

export async function copyDiagnostics(err: CapturedError): Promise<void> {
  const text = buildDiagnosticsText(err);
  const result = await copyText(text);

  if (result.isCopied) {
    ClientLogger.info(
      `[GlobalErrorModal] copied diagnostics cid=${err.correlationId} bytes=${text.length}`,
    );
    toast.success("Diagnostics copied", {
      description: `Correlation ID ${err.correlationId}`,
    });

    return;
  }

  ClientLogger.error("[GlobalErrorModal] copy diagnostics failed", {
    correlationId: err.correlationId,
    failureMessage: result.failureMessage,
  });
  toast.error("Copy failed", {
    description: `${result.failureMessage}\n${text}`,
  });
}
