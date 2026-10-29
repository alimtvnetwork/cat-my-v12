import React from "react";
import { Circle, Radio } from "lucide-react";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { cn } from "@/lib/utils";

function formatTimer(sec: number): string {
  const min = Math.floor(sec / 60);
  const remaining = sec % 60;

  return `${String(min).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export function RecorderLauncherButton(): React.JSX.Element {
  const isRecording = useRecorderStore((s) => s.isRecording);
  const isPaused = useRecorderStore((s) => s.isPaused);
  const elapsedSec = useRecorderStore((s) => s.elapsedSec);
  const startRecording = useRecorderStore((s) => s.startRecording);
  const stopRecording = useRecorderStore((s) => s.stopRecording);

  const handleClick = () => {
    if (isRecording) {
      stopRecording();

      return;
    }

    startRecording();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={isRecording ? "Stop Recording & Export Bug Report" : "Record Activity & Bug Report"}
      aria-label={isRecording ? "Stop Recording & Export" : "Start Bug Recorder"}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded px-2.5 sm:px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all",
        isRecording
          ? "border border-rose-500/80 bg-rose-950/80 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse"
          : "text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60 bg-slate-900/60",
      )}
    >
      {isRecording ? (
        <>
          <Circle className="h-3 w-3 fill-rose-500 text-rose-500 animate-ping" />
          <span className="font-mono text-rose-200">
            {isPaused ? "PAUSED" : `REC ${formatTimer(elapsedSec)}`}
          </span>
        </>
      ) : (
        <>
          <Radio className="h-3.5 w-3.5 text-rose-400" />
          <span>Record Bug</span>
        </>
      )}
    </button>
  );
}
