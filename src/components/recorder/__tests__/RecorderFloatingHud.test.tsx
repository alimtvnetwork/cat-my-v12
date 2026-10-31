// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RecorderFloatingHud } from "../RecorderFloatingHud";
import { useRecorderStore } from "@/lib/recorder/recorder-store";

describe("RecorderFloatingHud", () => {
  beforeEach(() => {
    useRecorderStore.getState().cancelRecording();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders null when not recording", () => {
    const { container } = render(<RecorderFloatingHud />);
    expect(container.firstChild).toBeNull();
  });

  it("renders floating hud when recording is active", () => {
    useRecorderStore.getState().startRecording("/home");
    render(<RecorderFloatingHud />);

    expect(screen.getByText("00:00")).not.toBeNull();
    expect(screen.getByText("0 evts")).not.toBeNull();
    expect(screen.getByText("Export ZIP")).not.toBeNull();
  });

  it("pauses and resumes recording via hud buttons", () => {
    useRecorderStore.getState().startRecording("/home");
    render(<RecorderFloatingHud />);

    const pauseBtn = screen.getByTitle("Pause");
    fireEvent.click(pauseBtn);

    expect(useRecorderStore.getState().isPaused).toBe(true);
    expect(screen.getByText("PAUSED")).not.toBeNull();

    const resumeBtn = screen.getByTitle("Resume");
    fireEvent.click(resumeBtn);

    expect(useRecorderStore.getState().isPaused).toBe(false);
  });

  it("finishes recording and opens modal on export click", () => {
    useRecorderStore.getState().startRecording("/home");
    render(<RecorderFloatingHud />);

    const exportBtn = screen.getByText("Export ZIP");
    fireEvent.click(exportBtn);

    expect(useRecorderStore.getState().isRecording).toBe(false);
    expect(useRecorderStore.getState().isExportModalOpen).toBe(true);
  });

  it("opens export dropdown and reveals all 7 export actions", () => {
    useRecorderStore.getState().startRecording("/home");
    render(<RecorderFloatingHud />);

    const dropdownToggle = screen.getByTitle("Choose Export Format");
    fireEvent.click(dropdownToggle);

    expect(screen.getByText("Unified Export Suite")).not.toBeNull();
    expect(screen.getByText("Export ZIP Bundle")).not.toBeNull();
    expect(screen.getByText("Copy as Prompt (V6)")).not.toBeNull();
    expect(screen.getByText("Copy as Prompt (V7)")).not.toBeNull();
    expect(screen.getByText("Direct Email")).not.toBeNull();
    expect(screen.getByText("Save to Supabase")).not.toBeNull();
    expect(screen.getByText("Save to Local Machine")).not.toBeNull();
    expect(screen.getByText("Copy CLI Command")).not.toBeNull();
  });
});
