import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { HttpMethod } from "@/lib/constants";
import { resolveBackendBaseUrl } from "@/lib/errors/history-facade";
import { useErrorStore } from "@/lib/stores/errorStore";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import {
  dispatchBugReportEmail,
  loadEmailConfig,
  saveEmailConfig,
} from "@/services/telemetry/email-notifier";
import { generateV6LetterlyPrompt } from "@/lib/recorder/prompt-v6-v7-builder";
import type { BugReportSummary, RecorderSession } from "@/lib/recorder/types";

export interface EmailExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: RecorderSession;
  summary: BugReportSummary;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LAST_RECIPIENT_KEY = "cat_vision_last_direct_email_recipient";

export function EmailExportModal({
  isOpen,
  onClose,
  session,
  summary,
}: EmailExportModalProps): React.JSX.Element | null {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [operatorNotes, setOperatorNotes] = useState("");
  const [hasMarkdownReport, setHasMarkdownReport] = useState(true);
  const [hasScreenshots, setHasScreenshots] = useState(true);
  const [hasDiagnosticsJson, setHasDiagnosticsJson] = useState(true);
  const [isBodyPreviewVisible, setIsBodyPreviewVisible] = useState(false);
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

      setRecipientEmail(savedRecipient);

      const titlePart = summary.title || `Bug Report ${session.id}`;
      const defaultSubject = `[Bug Report] ${summary.category}: ${titlePart} (Session: ${session.id})`;
      setSubject(defaultSubject);
      setStatusMessage(null);
    }
  }, [isOpen, session.id, summary.category, summary.title]);

  if (!isOpen) {
    return null;
  }

  const isEmailValid = EMAIL_REGEX.test(recipientEmail.trim());

  const generateBodyContent = (): string => {
    const lines: string[] = [
      `CAT iVision Bug Report - Telemetry Dispatch`,
      `=============================================`,
      `Session ID: ${session.id}`,
      `Category: ${summary.category}`,
      `Initial Route: ${session.initialRoute}`,
      `Final Route: ${session.finalRoute || session.initialRoute}`,
      `Events Captured: ${session.events.length}`,
      `Screenshots: ${session.screenshots.length}`,
      ``,
      `Summary:`,
      `Title: ${summary.title || "Untitled"}`,
      `Description: ${summary.description || "N/A"}`,
      `Expected Behavior: ${summary.expectedBehavior || "N/A"}`,
      `Actual Behavior: ${summary.actualBehavior || "N/A"}`,
    ];

    if (operatorNotes.trim()) {
      lines.push(``, `Operator Notes:`, operatorNotes.trim());
    }

    if (hasMarkdownReport) {
      lines.push(
        ``,
        `---------------------------------------------`,
        `[Attached] V6/V7 Letterly Diagnostic Markdown Prompt`,
        `Tree Swarm Hierarchy (A=3, H=2, Capacity=6) included in attachment payload.`,
      );
    }

    if (hasScreenshots) {
      lines.push(
        ``,
        `---------------------------------------------`,
        `[Attached] Screenshots Manifest (${session.screenshots.length} snapshots):`,
      );
      session.screenshots.forEach((shot, idx) => {
        lines.push(`  ${idx + 1}. [${shot.source}] ${shot.title || shot.id} (+${shot.elapsedMs}ms)`);
      });
    }

    if (hasDiagnosticsJson) {
      const splitDbErrors = useErrorStore.getState().history;
      lines.push(
        ``,
        `---------------------------------------------`,
        `[Attached] Diagnostics & Split-DB Errors (${splitDbErrors.length} logged):`,
      );
      splitDbErrors.slice(0, 5).forEach((err, idx) => {
        lines.push(`  ${idx + 1}. [${err.code}] ${err.message} (Trigger: ${err.triggerComponent || "N/A"})`);
      });
    }

    return lines.join("\n");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEmailValid) {
      toast.error("Please enter a valid recipient email address.");

      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    const targetRecipient = recipientEmail.trim();

    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_RECIPIENT_KEY, targetRecipient);
    }

    const emailBody = generateBodyContent();
    const splitDbErrors = useErrorStore.getState().history;
    const activeRules = useRulesStore.getState().rules;

    let isDelivered = false;
    let detailNotice = "";

    // 1. Attempt dispatch via /api/telemetry/email
    try {
      const emailConfig = loadEmailConfig();
      saveEmailConfig({
        ...emailConfig,
        recipientEmail: targetRecipient,
      });

      const res = await fetch(emailConfig.webhookUrl || "/api/telemetry/email", {
        method: HttpMethod.Post,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: targetRecipient,
          subject,
          body: emailBody,
          session_id: session.id,
          hasMarkdownReport,
          hasScreenshots,
          hasDiagnosticsJson,
          summary,
        }),
      }).catch(() => null);

      if (res && res.ok) {
        isDelivered = true;
        detailNotice = `Email dispatched to ${targetRecipient} via telemetry webhook!`;
      }
    } catch {
      // Webhook attempt failed, continue to backend
    }

    // 2. Attempt dispatch via backend loopback POST /bug-reports with channel: ["email"]
    if (!isDelivered) {
      try {
        const baseUrl = resolveBackendBaseUrl() || "http://127.0.0.1:8787";
        const promptMarkdown = generateV6LetterlyPrompt(session, {
          summary,
          splitDbErrors,
        });

        const backendPayload = {
          title: summary.title || `Bug Report ${session.id}`,
          message: emailBody,
          channels: ["email"],
          email_to: targetRecipient,
          session_id: session.id,
          trigger_component: "EmailExportModal",
          reporter_context: {
            category: summary.category,
            initialRoute: session.initialRoute,
            finalRoute: session.finalRoute || session.initialRoute,
            eventCount: session.events.length,
            screenshotCount: session.screenshots.length,
            markdownPrompt: hasMarkdownReport ? promptMarkdown : undefined,
          },
        };

        const beRes = await fetch(`${baseUrl}/bug-reports`, {
          method: HttpMethod.Post,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backendPayload),
        }).catch(() => null);

        if (beRes && beRes.ok) {
          isDelivered = true;
          detailNotice = `Bug report delivered to ${targetRecipient} via backend service!`;
        }
      } catch {
        // Backend attempt failed, fallback to client service
      }
    }

    // 3. Fallback to client-side notifier service
    if (!isDelivered) {
      try {
        const clientResult = await dispatchBugReportEmail({
          session,
          summary,
          splitDbErrors,
          activeRecipeEnvelope: { rules: activeRules, rulesCount: activeRules.length },
        });

        if (clientResult.isSuccess) {
          isDelivered = true;
          detailNotice = `Notification successfully queued for ${targetRecipient}.`;
        }
      } catch {
        // Fallback failed
      }
    }

    // 4. Fallback to system mailto: client if all HTTP dispatches failed
    if (!isDelivered) {
      try {
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(emailBody);
        const mailtoUrl = `mailto:${targetRecipient}?subject=${encodedSubject}&body=${encodedBody}`;
        window.open(mailtoUrl, "_blank");

        isDelivered = true;
        detailNotice = `Opened system mail client to deliver report to ${targetRecipient}.`;
      } catch (err) {
        detailNotice = `Failed to open mail client: ${String(err)}`;
      }
    }

    setIsSending(false);

    if (isDelivered) {
      setStatusMessage({ isSuccess: true, text: detailNotice });
      toast.success(detailNotice);
      window.setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setStatusMessage({ isSuccess: false, text: detailNotice });
      toast.error(detailNotice);
    }
  };

  return (
    <div className="fixed inset-0 z-[10070] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-700 bg-[#0f172a] p-5 shadow-2xl text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Direct Email Dispatch</h3>
              <p className="text-[11px] text-slate-400">
                Send diagnostic report and telemetry attachments directly to engineering
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
              placeholder="e.g. support@catvision.ai, dev@company.com"
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
              Subject Line
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Additional Operator Notes
            </label>
            <textarea
              rows={2}
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="Context, repro steps, or notes not captured by telemetry..."
              className="w-full rounded-md border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Included Attachments
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-xs cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={hasMarkdownReport}
                  onChange={(e) => setHasMarkdownReport(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <FileText className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="text-[11px] text-slate-300">V6/V7 Prompt</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-xs cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={hasScreenshots}
                  onChange={(e) => setHasScreenshots(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <ImageIcon className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-slate-300">
                  {session.screenshots.length} Snaps
                </span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-xs cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={hasDiagnosticsJson}
                  onChange={(e) => setHasDiagnosticsJson(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <Database className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span className="text-[11px] text-slate-300">Errors & Telemetry</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setIsBodyPreviewVisible(!isBodyPreviewVisible)}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 w-fit"
            >
              {isBodyPreviewVisible ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              <span>{isBodyPreviewVisible ? "Hide Email Body Preview" : "Show Email Body Preview"}</span>
            </button>

            {isBodyPreviewVisible && (
              <pre className="max-h-36 overflow-y-auto rounded-lg border border-slate-800 bg-black/60 p-2.5 text-[10px] font-mono text-slate-300 whitespace-pre-wrap select-all">
                {generateBodyContent()}
              </pre>
            )}
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
