import React, { useEffect } from "react";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { startGlobalInterception, stopGlobalInterception } from "@/lib/recorder/event-interceptor";
import { RecorderFloatingHud } from "./RecorderFloatingHud";
import { RecorderExportModal } from "./RecorderExportModal";
import { RecorderClickAnimation } from "./RecorderClickAnimation";
import { EventExplorerModal } from "./EventExplorerModal";

export function ActivityRecorderRoot(): React.JSX.Element {
  const isRecording = useRecorderStore((s) => s.isRecording);
  const isPaused = useRecorderStore((s) => s.isPaused);
  const tickElapsed = useRecorderStore((s) => s.tickElapsed);

  useEffect(() => {
    if (!isRecording) {
      stopGlobalInterception();

      return;
    }

    startGlobalInterception();

    return () => {
      stopGlobalInterception();
    };
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      tickElapsed();
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPaused, isRecording, tickElapsed]);

  return (
    <>
      <RecorderFloatingHud />
      <RecorderExportModal />
      <RecorderClickAnimation />
      <EventExplorerModal />
    </>
  );
}
