// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { RecorderExportModal } from "../RecorderExportModal";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { RecorderStatusType } from "@/lib/recorder/types";

describe("RecorderExportModal", () => {
  beforeEach(() => {
    useRecorderStore.getState().cancelRecording();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders null when modal is not open", () => {
    const { container } = render(<RecorderExportModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders modal when recording is stopped and export modal is open", () => {
    useRecorderStore.getState().startRecording("/projects/1");
    useRecorderStore.getState().stopRecording();

    render(<RecorderExportModal />);

    expect(screen.getByText("Export Activity & Bug Report")).not.toBeNull();
    expect(screen.getByText("Resume Recording")).not.toBeNull();
    expect(screen.getByText("Discard")).not.toBeNull();
    expect(screen.getByText("Export ZIP")).not.toBeNull();
    expect(screen.getByTitle("Choose Export Format")).not.toBeNull();
  });

  it("resumes recording when Resume Recording button is clicked", () => {
    useRecorderStore.getState().startRecording("/projects/1");
    useRecorderStore.getState().stopRecording();

    const { rerender } = render(<RecorderExportModal />);

    const resumeBtn = screen.getByText("Resume Recording");
    fireEvent.click(resumeBtn);

    const state = useRecorderStore.getState();
    expect(state.isRecording).toBe(true);
    expect(state.status).toBe(RecorderStatusType.Recording);
    expect(state.isExportModalOpen).toBe(false);

    rerender(<RecorderExportModal />);
    expect(screen.queryByText("Export Activity & Bug Report")).toBeNull();
  });

  it("resumes recording when close X button is clicked", () => {
    useRecorderStore.getState().startRecording("/projects/1");
    useRecorderStore.getState().stopRecording();

    const { rerender, container } = render(<RecorderExportModal />);

    const closeBtn = container.querySelector("button > svg.lucide-x")?.parentElement;
    expect(closeBtn).not.toBeNull();

    if (closeBtn) {
      fireEvent.click(closeBtn);
    }

    const state = useRecorderStore.getState();
    expect(state.isRecording).toBe(true);
    expect(state.status).toBe(RecorderStatusType.Recording);
    expect(state.isExportModalOpen).toBe(false);

    rerender(<RecorderExportModal />);
    expect(screen.queryByText("Export Activity & Bug Report")).toBeNull();
  });

  it("opens unified export suite dropdown showing 7 options", () => {
    useRecorderStore.getState().startRecording("/projects/1");
    useRecorderStore.getState().stopRecording();

    render(<RecorderExportModal />);

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

  it("opens Direct Email modal when Direct Email is clicked from dropdown", async () => {
    useRecorderStore.getState().startRecording("/projects/1");
    useRecorderStore.getState().stopRecording();

    render(<RecorderExportModal />);

    const dropdownToggle = screen.getByTitle("Choose Export Format");
    fireEvent.click(dropdownToggle);

    const emailBtn = screen.getByText("Direct Email");
    fireEvent.click(emailBtn);

    await waitFor(() => {
      expect(screen.getByText("Direct Email Bug Dispatch")).not.toBeNull();
    });
  });
});
