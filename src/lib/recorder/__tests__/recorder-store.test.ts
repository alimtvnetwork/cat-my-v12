// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useRecorderStore } from "../recorder-store";
import { RecorderActorType, RecorderEventType, RecorderStatusType } from "../types";

describe("useRecorderStore", () => {
  beforeEach(() => {
    useRecorderStore.getState().cancelRecording();
  });

  it("initializes with idle status and clean session", () => {
    const state = useRecorderStore.getState();
    expect(state.status).toBe(RecorderStatusType.Idle);
    expect(state.isRecording).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.session).toBeNull();
  });

  it("starts recording and creates a new session", () => {
    useRecorderStore.getState().startRecording("/projects");
    const state = useRecorderStore.getState();

    expect(state.status).toBe(RecorderStatusType.Recording);
    expect(state.isRecording).toBe(true);
    expect(state.isPaused).toBe(false);
    expect(state.session).not.toBeNull();
    expect(state.session?.initialRoute).toBe("/projects");
    expect(state.session?.routeHistory).toEqual(["/projects"]);
  });

  it("adds events to the active session", () => {
    useRecorderStore.getState().startRecording("/test");
    useRecorderStore.getState().addEvent({
      actor: RecorderActorType.User,
      eventType: RecorderEventType.Click,
      description: "User clicked submit",
      targetComponent: "Button Submit",
      selector: "[data-tour='submit']",
      route: "/test",
      hasScreenshot: false,
    });

    const state = useRecorderStore.getState();
    expect(state.hasEvents).toBe(true);
    expect(state.session?.events.length).toBe(1);
    expect(state.session?.events[0].description).toBe("User clicked submit");
  });

  it("handles pause and resume", () => {
    useRecorderStore.getState().startRecording("/home");
    useRecorderStore.getState().pauseRecording();

    expect(useRecorderStore.getState().isPaused).toBe(true);
    expect(useRecorderStore.getState().status).toBe(RecorderStatusType.Paused);

    useRecorderStore.getState().resumeRecording();

    expect(useRecorderStore.getState().isPaused).toBe(false);
    expect(useRecorderStore.getState().status).toBe(RecorderStatusType.Recording);
  });

  it("stops recording and opens export modal", () => {
    useRecorderStore.getState().startRecording("/analysis");
    useRecorderStore.getState().stopRecording();

    const state = useRecorderStore.getState();
    expect(state.status).toBe(RecorderStatusType.Idle);
    expect(state.isRecording).toBe(false);
    expect(state.isExportModalOpen).toBe(true);
    expect(state.session?.stoppedAt).toBeDefined();
  });
});
