// @vitest-environment jsdom
// Plan 80 step 11. Unit tests for NewMicSettingsModal's JSON validation.
//
// Root cause the modal fixes, in one sentence:
//   Freeform JSON params were previously validated inline inside a giant
//   route file, with no test coverage on the happy + failure paths.
//
// These tests focus on the pure validator + the modal's submit gating.
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
afterEach(() => cleanup());
import { NewMicSettingsModal, validateMicParamsJson } from "../NewMicSettingsModal";

describe("validateMicParamsJson", () => {
  it("accepts empty input as {}", () => {
    const r = validateMicParamsJson("");
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({});
  });
  it("accepts a JSON object", () => {
    const r = validateMicParamsJson('{"gain": 12}');
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ gain: 12 });
  });
  it("rejects invalid JSON with a message", () => {
    const r = validateMicParamsJson('{"gain": }');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Invalid JSON/);
  });
  it("rejects arrays", () => {
    const r = validateMicParamsJson("[1,2,3]");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/JSON object/);
  });
  it("rejects primitives", () => {
    const r = validateMicParamsJson("42");
    expect(r.ok).toBe(false);
  });
  it("rejects null", () => {
    const r = validateMicParamsJson("null");
    expect(r.ok).toBe(false);
  });
});

describe("NewMicSettingsModal", () => {
  it("disables Create when JSON is invalid and shows inline error", () => {
    const onSubmit = vi.fn();
    render(<NewMicSettingsModal open onOpenChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("new-mic-name"), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByTestId("new-mic-json"), {
      target: { value: "{oops" },
    });
    expect(screen.getByTestId("new-mic-json-error").textContent).toMatch(/Invalid JSON/);
    expect((screen.getByTestId("new-mic-create") as HTMLButtonElement).disabled).toBe(true);
  });

  it("submits parsed params on happy path", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<NewMicSettingsModal open onOpenChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId("new-mic-name"), {
      target: { value: "  Studio A  " },
    });
    fireEvent.change(screen.getByTestId("new-mic-json"), {
      target: { value: '{"gain": 12, "muted": false}' },
    });
    fireEvent.click(screen.getByTestId("new-mic-create"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Studio A",
      params: { gain: 12, muted: false },
    });
  });
});
