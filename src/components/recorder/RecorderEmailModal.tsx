import React, { useState, useEffect } from "react";
import { X, Mail, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { HttpMethod } from "@/lib/constants";
import { resolveBackendBaseUrl } from "@/lib/errors/history-facade";
import { useErrorStore } from "@/lib/stores/errorStore";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { dispatchBugReportEmail, loadEmailConfig, saveEmailConfig } from "@/services/telemetry/email-notifier";
import type { BugReportSummary, RecorderSession } from "@/lib/recorder/types";

export interface RecorderEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: RecorderSession;
  summary?: BugReportSummary;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LAST_RECIPIENT_KEY = "cat_vision_last_direct_email_recipient";

export function RecorderEmailModal({
  isOpen,
  onClose,
  session,
  summary,
}: RecorderEmailModalProps): React.JSX.Element | null {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [operatorNotes, setOperatorNotes] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    isSuccess: boolean;
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const savedRecipient =
        (typeof window !== "undefined" && localStorage.getItem(LAST_RECIPIENT_KEY)) ||
        loadEmailConfig().recipientEmail ||
        "support@catvision.ai";
      const config = loadEmailConfig();

      setRecipientEmail(savedRecipient);
      setSenderEmail(config.senderEmail || "telemetry@catvision.ai");
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isEmailValid = EMAIL_REGEX.test(recipientEmail.trim());

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEmailValid) {
      toast.error("Please provide a valid recipient email address.");

      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    const targetRecipient = recipientEmail.trim();

    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_RECIPIENT_KEY, targetRecipient);
    }

    const title = summary?.title || `Recorded Issue: ${session.id}`;
    const messageParts = [
      summary?.description ? `Description:\n${summary.description}` : "",
      `Expected Behavior:\n${summary?.expectedBehavior || "N/A"}`,
      `Actual Behavior:\n${summary?.actualBehavior || "N/A"}`,
      operatorNotes.trim() ? `Operator Notes:\n${operatorNotes.trim()}` : "",
      `Session ID: ${session.id}`,
      `Route: ${session.initialRoute} ➔ ${session.finalRoute || session.initialRoute}`,
      `Captured Events: ${session.events.length}`,
      `Diagnostic Screenshots: ${session.screenshots.length}`,
    ].filter(Boolean);

    const baseUrl = resolveBackendBaseUrl() || "http://127.0.0.1:8787";

    const payload = {
      title,
      message: messageParts.join("\n\n"),
      channels: ["email"],
      email_to: targetRecipient,
      email_from: senderEmail.trim() || undefined,
      session_id: session.id,
      trigger_component: "RecorderEmailModal",
      reporter_context: {
        category: summary?.category || "ui_glitch",
        initialRoute: session.initialRoute,
        finalRoute: session.finalRoute || session.initialRoute,
        routeHistory: session.routeHistory,
        eventCount: session.events.length,
        screenshotCount: session.screenshots.length,
        recipient: targetRecipient,
      },
    };

    let isDelivered = false;
    let detailMessage = "";

    try {
      // 1. Try backend POST /bug-reports with channel "email"
      let res = await fetch(`${baseUrl}/bug-reports`, {
        method: HttpMethod.Post,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch("/bug-reports", {
          method: HttpMethod.Post,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => null);
      }

      if (res && res.ok) {
        isDelivered = true;
        detailMessage = `Bug report successfully dispatched to ${targetRecipient}!`;
      } else if (res) {
        const errorJson = (await res.json().catch(() => ({}))) as {
          Errors?: Array<{ Message?: string }>;
        };
        detailMessage = errorJson.Errors?.[0]?.Message || `Backend returned HTTP ${res.status}`;
      }
    } catch (err) {
      detailMessage = err instanceof Error ? err.message : "Error contacting backend";
    }

    // 2. Fallback to client-side email notifier if backend route was unavailable
    if (!isDelivered) {
      try {
        const splitDbErrors = useErrorStore.getState().history;
        const activeRules = useRulesStore.getState().rules;

        const emailConfig = loadEmailConfig();
        saveEmailConfig({
          ...emailConfig,
          recipientEmail: targetRecipient,
        });

        const clientResult = await dispatchBugReportEmail({
          session,
          summary: summary || {
            title,
            category: "ui_glitch" as any,
            description: "N/A",
            expectedBehavior: "N/A",
            actualBehavior: "N/A",
          },
          splitDbErrors,
          activeRecipeEnvelope: { rules: activeRules, rulesCount: activeRules.length },
        });

        if (clientResult.isSuccess) {
          isDelivered = true;
          detailMessage = `Email notification queued for ${targetRecipient}.`;
        }
      } catch {
        // Fallback also failed
      }
    }

    setIsSending(false);

    if (isDelivered) {
      setStatusMessage({ isSuccess: true, text: detailMessage });
      toast.success(detailMessage);
      window.setTimeout(() => {
        onClose();
      }, 1400);
    } else {
      const failureNotice = detailMessage || "Failed to dispatch email. Please check network/backend.";
      setStatusMessage({ isSuccess: false, text: failureNotice });
      toast.error(failureNotice);
    }
  };

  return (
    <div className="fixed inset-0 z-[10070] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-[#0f172a] p-5 shadow-2xl text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Direct Email Bug Dispatch</h3>
              <p className="text-[11px] text-slate-400">
                Dispatch telemetry and diagnostics directly to engineering
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Recipient Email <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="e.g. support@catvision.ai, developer@company.com"
              className="w-full rounded-md border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
            {!isEmailValid && recipientEmail.length > 0 && (
              <span className="text-[10px] text-rose-400 mt-0.5 block">
                Please enter a valid email address.
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Sender Email (Optional)
            </label>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="telemetry@catvision.ai"
              className="w-full rounded-md border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Operator Notes / Context
            </label>
            <textarea
              rows={2}
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="Add extra context or steps to reproduce..."
              className="w-full rounded-md border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none resize-none"
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 text-[11px] text-slate-300 flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Report Title:</span>
              <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                {summary?.title || "Untitled Issue"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Telemetry Payload:</span>
              <span className="font-mono text-cyan-400">
                {session.events.length} evts · {session.screenshots.length} snaps
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Session ID:</span>
              <span className="font-mono text-slate-400">{session.id}</span>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
                statusMessage.isSuccess
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              {statusMessage.isSuccess ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSending || !isEmailValid}
              className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{isSending ? "Dispatching..." : "Send Email"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
