import React, { useState } from "react";
import { Camera, CheckCircle2, MessageSquare, Pause, Play, X } from "lucide-react";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { captureManualScreenshotWithNote } from "@/lib/recorder/event-interceptor";
import { RecorderActorType, RecorderEventType } from "@/lib/recorder/types";
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

  const timer = `${String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:${String(elapsedSec % 60).padStart(2, "0")}`;

  return (
    <div
      data-recorder-hud="true"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[10050] flex flex-col items-center gap-1.5"
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

        <button
          type="button"
          onClick={stopRecording}
          title="Finish & Export ZIP"
          className="flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-0.5 font-semibold text-white hover:bg-emerald-500"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Export ZIP</span>
        </button>

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
