import React, { useState } from "react";
import {
  Download,
  Loader2,
  X,
  Mail,
  Send,
  Settings,
  CheckCircle2,
  AlertCircle,
  Cloud,
  CloudUpload,
  Copy,
  HardDrive,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { HttpMethod } from "@/lib/constants";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { exportSessionToZip } from "@/lib/recorder/zip-builder";
import { IssueCategoryType, type BugReportSummary } from "@/lib/recorder/types";
import { sendTelegramMessage } from "@/lib/recorder/telegram-service";
import { useErrorStore } from "@/lib/stores/errorStore";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import {
  uploadBugReportToSupabase,
  type SupabaseUploadResult,
} from "@/services/telemetry/supabase-client";
import { dispatchBugReportEmail } from "@/services/telemetry/email-notifier";
import { resolveBackendBaseUrl } from "@/lib/errors/history-facade";
import { RecorderSummaryForm } from "./RecorderSummaryForm";
import { RecorderTimelinePreview } from "./RecorderTimelinePreview";
import { TelegramSettingsModal } from "./TelegramSettingsModal";
import { SupabaseSettingsModal } from "@/components/telemetry/SupabaseSettingsModal";

export function RecorderExportModal(): React.JSX.Element | null {
  const isExportModalOpen = useRecorderStore((s) => s.isExportModalOpen);
  const session = useRecorderStore((s) => s.session);
  const setExportModalOpen = useRecorderStore((s) => s.setExportModalOpen);
  const cancelRecording = useRecorderStore((s) => s.cancelRecording);
  const resumeRecording = useRecorderStore((s) => s.resumeRecording);

  const [isExporting, setIsExporting] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{
    isSuccess: boolean;
    message: string;
  } | null>(null);
  const [isSendingBugReport, setIsSendingBugReport] = useState(false);
  const [bugReportStatus, setBugReportStatus] = useState<{
    isSuccess: boolean;
    message: string;
  } | null>(null);

  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isUploadingSupabase, setIsUploadingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseUploadResult | null>(null);

  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [summary, setSummary] = useState<BugReportSummary>({
    title: "",
    description: "",
    category: IssueCategoryType.UiGlitch,
    expectedBehavior: "",
    actualBehavior: "",
  });

  if (!isExportModalOpen || !session) {
    return null;
  }

  const handleCopyIdePrompt = async () => {
    // Attempt local disk save first so references exist
    await handleSaveLocalDisk();

    const splitDbErrors = useErrorStore.getState().history;
    const errorsBlock = splitDbErrors.slice(0, 5).map((e) => 
      `- [${e.code}] ${e.message} (Trigger: ${e.triggerComponent || "N/A"})${e.stackTrace ? `\n  Stack: ${e.stackTrace.split("\n")[0]}` : ""}`
    ).join("\n");

    const screenshotsBlock = session.screenshots.map((snap, idx) => {
      const rawLabel = snap.title || snap.id || `step-${String(idx + 1).padStart(2, "0")}`;
      const safeLabel = rawLabel.replace(/[^a-zA-Z0-9_\-.]/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || `step-${String(idx + 1).padStart(2, "0")}`;
      const fileName = safeLabel.endsWith(".png") ? safeLabel : `${safeLabel}.png`;
      const relPath = `.logs/recorded-bugs/${session.id}/screenshots/${fileName}`;

      return `- **${fileName}**: @[file;${relPath}]`;
    }).join("\n");

    const promptText = `# Bug Report: ${summary.title || "Untitled Issue"}
- **Category**: ${summary.category}
- **Session ID**: \`${session.id}\`
- **Initial Route**: \`${session.initialRoute}\`
- **Events Recorded**: ${session.events.length}
- **Screenshots**: ${session.screenshots.length}

## Description
${summary.description || "N/A"}

### Expected Behavior
${summary.expectedBehavior || "N/A"}

### Actual Behavior
${summary.actualBehavior || "N/A"}

## Screenshots & Visual Evidence (Antigravity Format)
${screenshotsBlock || "No screenshots captured"}

## Recent Diagnostic Errors (Split-DB)
${errorsBlock || "None recorded"}

## CLI Inspection Command
\`\`\`pwsh
python -m BE.cli.processing.main errors list --session-id ${session.id} --trace
\`\`\`
`;

    try {
      await navigator.clipboard.writeText(promptText);
      toast.success("Copied Bug Report Prompt for IDE/AI to clipboard!");
    } catch {
      toast.info("Prompt generated (clipboard permission denied)");
    }
  };

  const handleCopyCliCommand = async () => {
    const cmd = `python -m BE.cli.processing.main errors list --session-id ${session.id} --trace`;

    try {
      await navigator.clipboard.writeText(cmd);
      toast.success(`Copied CLI command: ${cmd}`);
    } catch {
      toast.info(cmd);
    }
  };

  const handleSaveLocalDisk = async () => {
    setIsSavingLocal(true);
    const effectiveUrl = resolveBackendBaseUrl() || "http://127.0.0.1:8787";

    try {
      const payload = {
        session_id: session.id,
        initialRoute: session.initialRoute,
        summary,
        screenshots: session.screenshots,
        events: session.events,
      };

      let res = await fetch(`${effectiveUrl}/bug-reports/local`, {
        method: HttpMethod.Post,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch("/bug-reports/local", {
          method: HttpMethod.Post,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res && res.ok) {
        const data = await res.json();
        const savedDir = data?.Results?.[0]?.savedDir || ".logs/recorded-bugs";
        toast.success(`Saved bug report and ${session.screenshots.length} screenshots to ${savedDir}!`);

        if (data?.Results?.[0]?.idePrompt) {
          try {
            await navigator.clipboard.writeText(data.Results[0].idePrompt);
            toast.info("Copied IDE Prompt with local file links to clipboard!");
          } catch {
            // Clipboard permission or unsupported
          }
        }
      } else {
        toast.error("Failed to save bug report to local disk");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save local bug report");
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);

    try {
      await exportSessionToZip(session, summary);
      setExportModalOpen(false);
      cancelRecording();
    } finally {
      setIsExporting(false);
    }
  };

  const handleEmailReport = async () => {
    const splitDbErrors = useErrorStore.getState().history;
    const activeRules = useRulesStore.getState().rules;

    void dispatchBugReportEmail({
      session,
      summary,
      splitDbErrors,
      activeRecipeEnvelope: { rules: activeRules, rulesCount: activeRules.length },
    });

    const subject = encodeURIComponent(`[Bug Report] ${summary.title || "Cat Vision UI Issue"}`);
    const bodyText = `Cat Vision (Cat I Vision) Bug Report
--------------------------------------
Title: ${summary.title || "Untitled Issue"}
Category: ${summary.category}
Initial Route: ${session.initialRoute}
Events Captured: ${session.events.length}
Screenshots: ${session.screenshots.length}

Expected:
${summary.expectedBehavior || "N/A"}

Actual:
${summary.actualBehavior || "N/A"}

Description:
${summary.description || "N/A"}
`;
    const mailtoUrl = `mailto:support@catvision.ai?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
    window.open(mailtoUrl, "_blank");
  };

  const handleSendTelegram = async () => {
    setIsSendingTelegram(true);
    setTelegramStatus(null);

    const messageText = `*Cat Vision Bug Report*
*Title:* ${summary.title || "Untitled Bug"}
*Category:* ${summary.category}
*Route:* \`${session.initialRoute}\`
*Events:* ${session.events.length} | *Screenshots:* ${session.screenshots.length}

*Expected:*
${summary.expectedBehavior || "N/A"}

*Actual:*
${summary.actualBehavior || "N/A"}`;

    try {
      const result = await sendTelegramMessage(messageText);
      setTelegramStatus(result);

      if (result.isSuccess) {
        window.setTimeout(() => {
          setExportModalOpen(false);
          cancelRecording();
        }, 1500);
      }
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const handleUploadSupabase = async () => {
    setIsUploadingSupabase(true);
    setSupabaseStatus(null);

    const splitDbErrors = useErrorStore.getState().history;
    const activeRules = useRulesStore.getState().rules;
    const canvasScreenshot =
      session.screenshots.find((s) => s.source === "canvas")?.dataUrl ||
      session.screenshots[0]?.dataUrl;

    try {
      const result = await uploadBugReportToSupabase({
        session,
        summary,
        splitDbErrors,
        activeRecipeEnvelope: { rules: activeRules, rulesCount: activeRules.length },
        canvasScreenshot,
        interactionTimeline: session.events,
      });

      setSupabaseStatus(result);

      void dispatchBugReportEmail({
        session,
        summary,
        splitDbErrors,
        activeRecipeEnvelope: { rules: activeRules, rulesCount: activeRules.length },
        ticketId: result.ticketId,
      });

      if (result.isSuccess && !result.isOfflineQueued) {
        window.setTimeout(() => {
          setExportModalOpen(false);
          cancelRecording();
        }, 2000);
      }
    } finally {
      setIsUploadingSupabase(false);
    }
  };

  // RECORD BUG -> POST /bug-reports (spec 54 wave 2: route + CLI ready,
  // the button was the missing link). Delivery goes through the backend
  // (email + Supabase) instead of the mailto/Telegram side channels.
  // The route errors when Supabase is unconfigured even after email
  // succeeds, so channels are chosen from GET /config first: email +
  // Supabase when configured, email only otherwise. The modal stays
  // open on success so the operator can still Download ZIP.
  const handleSendBugReport = async () => {
    const baseUrl = resolveBackendBaseUrl();

    if (baseUrl === null) {
      setBugReportStatus({
        isSuccess: false,
        message:
          "Backend is not connected (Seed mode) — run the app in Backend mode to send bug reports.",
      });

      return;
    }

    setIsSendingBugReport(true);
    setBugReportStatus(null);

    try {
      let channels: string[] | undefined;
      let channelNote = "";

      try {
        const configRes = await fetch(`${baseUrl}/bug-reports/config`);

        if (configRes.ok) {
          const configBody = (await configRes.json()) as {
            Results?: Array<{
              supabase?: { is_configured?: boolean; is_enabled?: boolean };
            }>;
          };
          const supabase = configBody.Results?.[0]?.supabase;
          const isSupabaseUsable =
            supabase?.is_configured === true && supabase?.is_enabled === true;
          channels = isSupabaseUsable ? ["email", "supabase"] : ["email"];
          channelNote = isSupabaseUsable
            ? " via email + Supabase"
            : " via email only (Supabase is not configured)";
        }
      } catch {
        // Config unreadable: fall through to the route's default
        // channels and surface whatever the route returns.
      }

      const messageParts = [
        summary.description,
        `Expected: ${summary.expectedBehavior || "N/A"}`,
        `Actual: ${summary.actualBehavior || "N/A"}`,
      ].filter((part) => part.length > 0);

      const res = await fetch(`${baseUrl}/bug-reports`, {
        method: HttpMethod.Post,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: summary.title || "Untitled Bug",
          message: messageParts.join("\n\n") || undefined,
          trigger_component: "RecorderExportModal",
          session_id: session.id,
          reporter_context: {
            category: summary.category,
            initialRoute: session.initialRoute,
            routeHistory: session.routeHistory,
            eventCount: session.events.length,
            screenshotCount: session.screenshots.length,
          },
          ...(channels !== undefined ? { channels } : {}),
        }),
      });

      if (!res.ok) {
        let detail = `POST /bug-reports -> ${res.status}`;

        try {
          const errBody = (await res.json()) as {
            Errors?: Array<{ Message?: string }>;
            Status?: { Message?: string };
          };
          detail = errBody.Errors?.[0]?.Message ?? errBody.Status?.Message ?? detail;
        } catch {
          // Keep the HTTP status detail.
        }

        setBugReportStatus({ isSuccess: false, message: detail });

        return;
      }

      setBugReportStatus({
        isSuccess: true,
        message: `Bug report sent${channelNote}. You can still Download ZIP.`,
      });
    } catch (err) {
      setBugReportStatus({
        isSuccess: false,
        message: err instanceof Error ? err.message : "Failed to send bug report.",
      });
    } finally {
      setIsSendingBugReport(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-xl rounded-xl border border-slate-700 bg-[#0f172a] p-5 shadow-2xl flex flex-col gap-4 text-slate-100 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Export Activity & Bug Report</h2>
              <p className="text-xs text-slate-400">
                Download ZIP, email support, or dispatch directly to Supabase cloud & Telegram.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                title="Configure Supabase Cloud"
                className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/10"
              >
                <Cloud className="h-3.5 w-3.5 text-emerald-400" />
                <span>Supabase Setup</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTelegramModalOpen(true)}
                title="Configure Telegram Bot"
                className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/10"
              >
                <Settings className="h-3.5 w-3.5 text-sky-400" />
                <span>Telegram Setup</span>
              </button>

              <button
                type="button"
                onClick={resumeRecording}
                className="rounded p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <RecorderSummaryForm summary={summary} onChange={setSummary} />

          <RecorderTimelinePreview events={session.events} screenshots={session.screenshots} />

          {supabaseStatus ? (
            <div
              className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
                supabaseStatus.isSuccess
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              {supabaseStatus.isSuccess ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{supabaseStatus.message}</span>
            </div>
          ) : null}

          {telegramStatus ? (
            <div
              className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
                telegramStatus.isSuccess
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              {telegramStatus.isSuccess ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{telegramStatus.message}</span>
            </div>
          ) : null}

          {bugReportStatus ? (
            <div
              className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
                bugReportStatus.isSuccess
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              {bugReportStatus.isSuccess ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{bugReportStatus.message}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between border-t border-slate-800 pt-3 gap-2">
            <button
              type="button"
              onClick={resumeRecording}
              className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Resume Recording
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="rounded px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleEmailReport}
                title="Send as email"
                className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email</span>
              </button>

              <button
                type="button"
                disabled={isSendingTelegram}
                onClick={handleSendTelegram}
                title="Send directly to Telegram chat"
                className="flex items-center gap-1.5 rounded border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
              >
                {isSendingTelegram ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Telegram</span>
              </button>

              <button
                type="button"
                disabled={isUploadingSupabase || isSendingBugReport}
                onClick={handleUploadSupabase}
                title="Upload diagnostic bundle to Supabase cloud and send report"
                className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
              >
                {isUploadingSupabase ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="h-3.5 w-3.5" />
                )}
                <span>Upload to Cloud / Submit Ticket (Supabase)</span>
              </button>

              <button
                type="button"
                disabled={isSendingBugReport || isUploadingSupabase}
                onClick={handleSendBugReport}
                title="Send bug report directly to backend (POST /bug-reports)"
                className="flex items-center gap-1.5 rounded border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/25 disabled:opacity-50"
              >
                {isSendingBugReport ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Send Bug Report</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCliCommand}
                title="Copy terminal command to inspect SQLite database errors for this session"
                className="flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Copy CLI Command</span>
              </button>

              <button
                type="button"
                onClick={handleCopyIdePrompt}
                title="Copy structured prompt for AI IDE (Antigravity format)"
                className="flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Prompt for IDE</span>
              </button>

              <button
                type="button"
                disabled={isSavingLocal}
                onClick={handleSaveLocalDisk}
                title="Save snapshots and metadata directly to local disk (.logs/recorded-bugs)"
                className="flex items-center gap-1.5 rounded border border-purple-500/40 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/25 disabled:opacity-50"
              >
                {isSavingLocal ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <HardDrive className="h-3.5 w-3.5" />
                )}
                <span>Save to Disk</span>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>Download ZIP</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <SupabaseSettingsModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      <TelegramSettingsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />
    </>
  );
}
