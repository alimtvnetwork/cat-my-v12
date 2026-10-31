import { create } from "zustand";
import {
  type AddEventParams,
  type AddScreenshotParams,
  type BugReportSummary,
  type CapturedScreenshot,
  type RecorderEvent,
  type RecorderSession,
  RecorderStatusType,
} from "./types";

interface RecorderStoreState {
  status: RecorderStatusType;
  isRecording: boolean;
  isPaused: boolean;
  isExportModalOpen: boolean;
  hasEvents: boolean;
  hasScreenshots: boolean;
  session: RecorderSession | null;
  elapsedSec: number;

  startRecording: (initialRoute?: string) => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  addEvent: (params: AddEventParams) => void;
  addScreenshot: (params: AddScreenshotParams) => string;
  setExportModalOpen: (isOpen: boolean) => void;
  setSummary: (summary: BugReportSummary) => void;
  tickElapsed: () => void;
}

function createEmptySession(initialRoute: string): RecorderSession {
  const startedAt = new Date().toISOString();
  const sessionId = `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: sessionId,
    startedAt,
    durationMs: 0,
    events: [],
    screenshots: [],
    routeHistory: [initialRoute],
    initialRoute,
    finalRoute: initialRoute,
  };
}

export const useRecorderStore = create<RecorderStoreState>((set, get) => ({
  status: RecorderStatusType.Idle,
  isRecording: false,
  isPaused: false,
  isExportModalOpen: false,
  hasEvents: false,
  hasScreenshots: false,
  session: null,
  elapsedSec: 0,

  startRecording: (initialRoute = window.location.pathname) => {
    const session = createEmptySession(initialRoute);

    set({
      status: RecorderStatusType.Recording,
      isRecording: true,
      isPaused: false,
      isExportModalOpen: false,
      hasEvents: false,
      hasScreenshots: false,
      session,
      elapsedSec: 0,
    });
  },

  stopRecording: () => {
    const current = get().session;

    if (!current) {
      return;
    }

    const stoppedAt = new Date().toISOString();
    const durationMs = Date.now() - new Date(current.startedAt).getTime();
    const finalRoute = window.location.pathname;

    set({
      status: RecorderStatusType.Idle,
      isRecording: false,
      isPaused: false,
      isExportModalOpen: true,
      session: {
        ...current,
        stoppedAt,
        durationMs,
        finalRoute,
      },
    });
  },

  pauseRecording: () => {
    if (!get().isRecording) {
      return;
    }

    set({
      status: RecorderStatusType.Paused,
      isPaused: true,
    });
  },

  resumeRecording: () => {
    const { session } = get();

    if (!session) {
      return;
    }

    const updatedSession = { ...session };
    delete updatedSession.stoppedAt;

    set({
      status: RecorderStatusType.Recording,
      isRecording: true,
      isPaused: false,
      isExportModalOpen: false,
      session: updatedSession,
    });
  },

  cancelRecording: () => {
    set({
      status: RecorderStatusType.Idle,
      isRecording: false,
      isPaused: false,
      isExportModalOpen: false,
      hasEvents: false,
      hasScreenshots: false,
      session: null,
      elapsedSec: 0,
    });
  },

  addEvent: (params: AddEventParams) => {
    const { session, isRecording, isPaused } = get();

    if (!isRecording || isPaused || !session) {
      return;
    }

    const timestamp = new Date().toISOString();
    const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
    const id = `evt-${Date.now()}-${session.events.length + 1}`;

    const newEvent: RecorderEvent = {
      ...params,
      id,
      timestamp,
      elapsedMs,
    };

    const hasRoute = session.routeHistory.includes(params.route);
    const updatedRoutes = hasRoute ? session.routeHistory : [...session.routeHistory, params.route];

    set({
      hasEvents: true,
      session: {
        ...session,
        events: [...session.events, newEvent],
        routeHistory: updatedRoutes,
        finalRoute: params.route,
      },
    });
  },

  addScreenshot: (params: AddScreenshotParams): string => {
    const { session } = get();

    if (!session) {
      return "";
    }

    const timestamp = new Date().toISOString();
    const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
    const id = `snap-${Date.now()}-${session.screenshots.length + 1}`;

    const newScreenshot: CapturedScreenshot = {
      ...params,
      id,
      timestamp,
      elapsedMs,
    };

    set({
      hasScreenshots: true,
      session: {
        ...session,
        screenshots: [...session.screenshots, newScreenshot],
      },
    });

    return id;
  },

  setExportModalOpen: (isOpen: boolean) => {
    set({ isExportModalOpen: isOpen });
  },

  setSummary: (summary: BugReportSummary) => {
    const { session } = get();

    if (!session) {
      return;
    }

    set({
      session: {
        ...session,
        summary,
      },
    });
  },

  tickElapsed: () => {
    const { isRecording, isPaused, elapsedSec } = get();

    if (!isRecording || isPaused) {
      return;
    }

    set({ elapsedSec: elapsedSec + 1 });
  },
}));
