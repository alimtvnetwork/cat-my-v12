import React, { useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { exportSessionToZip } from "@/lib/recorder/zip-builder";
import { IssueCategoryType, type BugReportSummary } from "@/lib/recorder/types";
import { RecorderSummaryForm } from "./RecorderSummaryForm";
import { RecorderTimelinePreview } from "./RecorderTimelinePreview";

export function RecorderExportModal(): React.JSX.Element | null {
  const isExportModalOpen = useRecorderStore((s) => s.isExportModalOpen);
  const session = useRecorderStore((s) => s.session);
  const setExportModalOpen = useRecorderStore((s) => s.setExportModalOpen);
  const cancelRecording = useRecorderStore((s) => s.cancelRecording);
  const resumeRecording = useRecorderStore((s) => s.resumeRecording);

  const [isExporting, setIsExporting] = useState(false);
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

  return (
    <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded-xl border border-slate-700 bg-[#0f172a] p-5 shadow-2xl flex flex-col gap-4 text-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">Export Activity & Bug Report ZIP</h2>
            <p className="text-xs text-slate-400">
              Download complete reproduction bundle for AI diagnosis and debugging.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExportModalOpen(false)}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <RecorderSummaryForm summary={summary} onChange={setSummary} />

        <RecorderTimelinePreview events={session.events} screenshots={session.screenshots} />

        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => {
              setExportModalOpen(false);
              resumeRecording();
            }}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Resume Recording
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="rounded px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40"
            >
              Discard
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{isExporting ? "Bundling ZIP..." : "Download Bug Report (.ZIP)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
