// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RecorderLauncherButton } from "../RecorderLauncherButton";
import { useRecorderStore } from "@/lib/recorder/recorder-store";

describe("RecorderLauncherButton", () => {
  beforeEach(() => {
    useRecorderStore.getState().cancelRecording();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders idle state with 'Record Bug'", () => {
    render(<RecorderLauncherButton />);

    expect(screen.getByText("Record Bug")).not.toBeNull();
  });

  it("toggles recording when clicked", () => {
    render(<RecorderLauncherButton />);

    const button = screen.getByRole("button", { name: /start bug recorder/i });
    fireEvent.click(button);

    expect(useRecorderStore.getState().isRecording).toBe(true);
    expect(screen.getByText(/REC 00:00/)).not.toBeNull();
  });

  it("stops recording and opens export modal when clicked while active", () => {
    useRecorderStore.getState().startRecording("/test");
    render(<RecorderLauncherButton />);

    const button = screen.getByRole("button", { name: /stop recording & export/i });
    fireEvent.click(button);

    expect(useRecorderStore.getState().isRecording).toBe(false);
    expect(useRecorderStore.getState().isExportModalOpen).toBe(true);
  });
});
