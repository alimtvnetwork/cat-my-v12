import React, { useState } from "react";
import {
  Camera,
  ListTree,
  MessageSquare,
  Pause,
  Play,
  X,
} from "lucide-react";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { captureManualScreenshotWithNote } from "@/lib/recorder/event-interceptor";
import { IssueCategoryType, RecorderActorType, RecorderEventType, type BugReportSummary } from "@/lib/recorder/types";
import { RecorderExportDropdown } from "./RecorderExportDropdown";
import { RecorderEmailModal } from "./RecorderEmailModal";
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
  const openEventExplorer = useRecorderStore((s) => s.openEventExplorer);

  const [isNoteInputVisible, setIsNoteInputVisible] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  if (!isRecording || !session) {
    return null;
  }

  const handleSaveNote = (note: string): void => {
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

  const activeSummary: BugReportSummary = session.summary || {
    title: `Recorded Session ${session.id}`,
    category: IssueCategoryType.UiGlitch,
    description: `Industrial session recorded with ${session.events.length} events and ${session.screenshots.length} snapshots.`,
    expectedBehavior: "Expected flawless operation without visual anomalies.",
    actualBehavior: "Unexpected UI glitch or defect captured during workflow.",
  };

  const timer = `${String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:${String(elapsedSec % 60).padStart(2, "0")}`;

  return (
    <>
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
            onClick={openEventExplorer}
            title="Explore Recorded Events Stream"
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 hover:bg-slate-700 text-sky-300"
          >
            <ListTree className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Events</span>
          </button>

          <button
            type="button"
            onClick={isPaused ? resumeRecording : pauseRecording}
            title={isPaused ? "Resume" : "Pause"}
            className="rounded p-1 hover:bg-slate-800 text-slate-300"
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          {/* Unified Multi-Action Export Dropdown */}
          <RecorderExportDropdown
            session={session}
            summary={activeSummary}
            onOpenEmailModal={() => setIsEmailModalOpen(true)}
            onPrimaryClick={stopRecording}
            isCompact
          />

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

      <RecorderEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        session={session}
        summary={activeSummary}
      />
    </>
  );
}
