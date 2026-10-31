import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  HardDrive,
  MessageSquare,
  Pause,
  Play,
  Terminal,
  X,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { captureManualScreenshotWithNote } from "@/lib/recorder/event-interceptor";
import { IssueCategoryType, RecorderActorType, RecorderEventType } from "@/lib/recorder/types";
import { exportSessionToZip } from "@/lib/recorder/zip-builder";
import { resolveBackendBaseUrl } from "@/lib/errors/history-facade";
import { useErrorStore } from "@/lib/stores/errorStore";
import { HttpMethod } from "@/lib/constants";
import { RecorderNoteInput } from "./RecorderNoteInput";

export function RecorderFloatingHud(): React.JSX.Element | null {
  const isRecording = useRecorderStore((s) => s.isRecording);
  const isPaused = useRecorderStore((s) => s.isPaused);
  const elapsedSec = useRecorderStore((s) => s.elapsedSec);
  const session = useRecorderStore((s) => s.session);
  const pauseRecording = useRecorderStore((s) => s.pauseRecording);
  const resumeRecording = useRecorderStore((s) => s.resumeRecording);
  const stopRecording = useRecorderStore((s) => s.stopRecording);
  const cancelRecording = useRecorderStore((s) => s.cancelRecording);
  const addEvent = useRecorderStore((s) => s.addEvent);

  const [isNoteInputVisible, setIsNoteInputVisible] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (!isRecording || !session) {
    return null;
  }

  const handleSaveNote = (note: string) => {
    addEvent({
      actor: RecorderActorType.User,
      eventType: RecorderEventType.UserNote,
      description: `User Note: "${note}"`,
      targetComponent: "User Annotation",
      selector: "annotation",
      route: window.location.pathname,
      hasScreenshot: false,
    });
  };

  const handleSaveLocalDisk = async (): Promise<boolean> => {
    setIsSavingLocal(true);
    const effectiveUrl = resolveBackendBaseUrl() || "http://127.0.0.1:8787";

    try {
      const payload = {
        session_id: session.id,
        initialRoute: session.initialRoute,
        summary: {
          title: `Recorded Session ${session.id}`,
          category: "UiGlitch",
          description: `Industrial session recorded with ${session.events.length} events and ${session.screenshots.length} snapshots.`,
        },
        screenshots: session.screenshots,
        events: session.events,
      };

      let res = await fetch(`${effectiveUrl}/bug-reports/save-local`, {
        method: HttpMethod.Post,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch("/bug-reports/save-local", {
          method: HttpMethod.Post,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        const savedDir = data?.Results?.[0]?.savedDir || `.logs/recorded-bugs/${session.id}`;
        toast.success(`Saved bug report & ${session.screenshots.length} screenshots to ${savedDir}!`);
        setIsSavingLocal(false);

        return true;
      }

      toast.error("Failed to persist bug report to local disk");
    } catch (err) {
      toast.error(`Local save error: ${String(err)}`);
    } finally {
      setIsSavingLocal(false);
    }

    return false;
  };

  const handleCopyIdePrompt = async () => {
    // Attempt local save first to guarantee disk file paths exist for Antigravity format
    await handleSaveLocalDisk();

    const splitDbErrors = useErrorStore.getState().history;
    const errorsBlock = splitDbErrors.slice(0, 5).map((e) =>
      `- [${e.code}] ${e.message} (Trigger: ${e.triggerComponent || "N/A"})`
    ).join("\n");

    const screenshotsBlock = session.screenshots.map((snap, idx) => {
      const rawLabel = snap.title || snap.id || `step-${String(idx + 1).padStart(2, "0")}`;
      const safeLabel = rawLabel.replace(/[^a-zA-Z0-9_\-.]/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || `step-${String(idx + 1).padStart(2, "0")}`;
      const fileName = safeLabel.endsWith(".png") ? safeLabel : `${safeLabel}.png`;
      const relPath = `.logs/recorded-bugs/${session.id}/screenshots/${fileName}`;

      return `- **${fileName}**: @[file;${relPath}]`;
    }).join("\n");

    const promptText = `# Bug Report: Recorded Issue (${session.id})
- **Category**: UiGlitch
- **Session ID**: \`${session.id}\`
- **Initial Route**: \`${session.initialRoute}\`
- **Events Recorded**: ${session.events.length}
- **Screenshots**: ${session.screenshots.length}

## Screenshots & Local Artifacts (Antigravity Format)
${screenshotsBlock || "No screenshots captured"}

## Recent Diagnostic Errors (Split-DB)
${errorsBlock || "None recorded"}

## Terminal Inspection Command
\`\`\`pwsh
python -m BE.cli.processing.main errors list --session-id ${session.id} --trace
\`\`\`
`;

    try {
      await navigator.clipboard.writeText(promptText);
      toast.success("Copied Antigravity AI Prompt to clipboard!");
    } catch {
      toast.info("Prompt generated (clipboard permission denied)");
    }
  };

  const handleCopyCliCommand = async () => {
    const cmd = `python -m BE.cli.processing.main errors list --session-id ${session.id} --trace`;

    try {
      await navigator.clipboard.writeText(cmd);
      toast.success(`Copied CLI diagnostic command: ${cmd}`);
    } catch {
      toast.info(cmd);
    }
  };

  const handleExportZipDirect = async () => {
    try {
      toast.info("Generating ZIP archive with all screenshots and metadata...");
      await exportSessionToZip(session, {
        title: `Bug Report ${session.id}`,
        category: IssueCategoryType.UiGlitch,
        description: `Exported recording session with ${session.screenshots.length} screenshots.`,
        expectedBehavior: "",
        actualBehavior: "",
      });
      toast.success("ZIP bundle downloaded successfully!");
    } catch (err) {
      toast.error(`Export failed: ${String(err)}`);
    }
  };

  const timer = `${String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:${String(elapsedSec % 60).padStart(2, "0")}`;

  return (
    <div
      data-recorder-hud="true"
      className="fixed top-12 left-1/2 -translate-x-1/2 z-[10050] flex flex-col items-center gap-1.5 pointer-events-auto"
    >
      <div className="flex items-center gap-2 rounded-full border border-rose-500/50 bg-[#0c1017]/95 px-3.5 py-1.5 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
        <span className="flex items-center gap-1.5 font-mono font-bold text-rose-400">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          {isPaused ? "PAUSED" : timer}
        </span>
        <span className="text-slate-500">|</span>
        <span className="font-mono text-cyan-300">{session.events.length} evts</span>
        <span className="font-mono text-emerald-300">{session.screenshots.length} snaps</span>

        <button
          type="button"
          onClick={() => captureManualScreenshotWithNote("User captured screen")}
          title="Take Screenshot Now"
          className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 hover:bg-slate-700 text-cyan-300"
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Snap</span>
        </button>

        <button
          type="button"
          onClick={() => setIsNoteInputVisible(!isNoteInputVisible)}
          title="Add Note to Step"
          className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 hover:bg-slate-700 text-amber-300"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Note</span>
        </button>

        <button
          type="button"
          onClick={isPaused ? resumeRecording : pauseRecording}
          title={isPaused ? "Resume" : "Pause"}
          className="rounded p-1 hover:bg-slate-800 text-slate-300"
        >
          {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </button>

        {/* 4-Action Export Dropdown */}
        <div className="relative inline-flex items-center" ref={dropdownRef}>
          <button
            type="button"
            onClick={stopRecording}
            title="Finish & Export ZIP"
            className="flex items-center gap-1 rounded-l bg-emerald-600 px-2.5 py-0.5 font-semibold text-white hover:bg-emerald-500"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Export ZIP</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title="Choose Export Format"
            className="rounded-r border-l border-emerald-700 bg-emerald-600 px-1 py-0.5 text-white hover:bg-emerald-500"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-slate-700 bg-[#0e131f] p-1.5 shadow-2xl backdrop-blur-xl z-[10060]">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                Export & Diagnostic Options
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleExportZipDirect();
                }}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 hover:text-emerald-400"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <div className="flex flex-col">
                  <span className="font-medium">Export ZIP Bundle</span>
                  <span className="text-[10px] text-slate-500">Download archive with snapshots & JSON</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleCopyIdePrompt();
                }}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 hover:text-cyan-400"
              >
                <FileCode className="h-3.5 w-3.5 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="font-medium">Copy Prompt for AI / IDE</span>
                  <span className="text-[10px] text-slate-500">Antigravity @[file;...] file references</span>
                </div>
              </button>

              <button
                type="button"
                disabled={isSavingLocal}
                onClick={async () => {
                  setIsDropdownOpen(false);
                  await handleSaveLocalDisk();
                }}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 hover:text-blue-400"
              >
                <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                <div className="flex flex-col">
                  <span className="font-medium">Save to Local Machine</span>
                  <span className="text-[10px] text-slate-500">Persist to .logs/recorded-bugs/ on disk</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleCopyCliCommand();
                }}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800 hover:text-amber-400"
              >
                <Terminal className="h-3.5 w-3.5 text-amber-400" />
                <div className="flex flex-col">
                  <span className="font-medium">Copy CLI Command</span>
                  <span className="text-[10px] text-slate-500">Query errors in SQLite via terminal</span>
                </div>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={cancelRecording}
          title="Discard Recording"
          className="rounded p-1 text-slate-400 hover:bg-rose-950/80 hover:text-rose-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {isNoteInputVisible && (
        <RecorderNoteInput onSave={handleSaveNote} onClose={() => setIsNoteInputVisible(false)} />
      )}
    </div>
  );
}
