import React, { useState } from "react";
import {
  X,
  Send,
  Settings,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Loader2,
} from "lucide-react";
import { HttpMethod } from "@/lib/constants";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { IssueCategoryType, type BugReportSummary } from "@/lib/recorder/types";
import { sendTelegramMessage } from "@/lib/recorder/telegram-service";
import { resolveBackendBaseUrl } from "@/lib/errors/history-facade";
import { RecorderSummaryForm } from "./RecorderSummaryForm";
import { RecorderTimelinePreview } from "./RecorderTimelinePreview";
import { TelegramSettingsModal } from "./TelegramSettingsModal";
import { SupabaseSettingsModal } from "@/components/telemetry/SupabaseSettingsModal";
import { RecorderExportDropdown } from "./RecorderExportDropdown";
import { RecorderEmailModal } from "./RecorderEmailModal";

export function RecorderExportModal(): React.JSX.Element | null {
  const isExportModalOpen = useRecorderStore((s) => s.isExportModalOpen);
  const session = useRecorderStore((s) => s.session);
  const cancelRecording = useRecorderStore((s) => s.cancelRecording);
  const resumeRecording = useRecorderStore((s) => s.resumeRecording);

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
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

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
          cancelRecording();
        }, 1500);
      }
    } finally {
      setIsSendingTelegram(false);
    }
  };

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
        // Config unreadable: fall through to the route's default channels
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
          // Keep HTTP status detail
        }

        setBugReportStatus({ isSuccess: false, message: detail });

        return;
      }

      setBugReportStatus({
        isSuccess: true,
        message: `Bug report sent${channelNote}. You can still download ZIP or copy prompts.`,
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
                Unified multi-action export suite: ZIP, V6/V7 prompts, email, and cloud dispatch.
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resumeRecording}
                className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                Resume Recording
              </button>

              <button
                type="button"
                onClick={cancelRecording}
                className="rounded px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40"
              >
                Discard
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                disabled={isSendingBugReport}
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

              {/* Multi-Action Export Dropdown: ZIP, V6, V7, Email, Local Disk, Supabase, CLI */}
              <RecorderExportDropdown
                session={session}
                summary={summary}
                onOpenEmailModal={() => setIsEmailModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <RecorderEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        session={session}
        summary={summary}
      />

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
