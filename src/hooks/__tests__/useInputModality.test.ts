// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { InputModalityTracker, useInputModality, ModalityType } from "../useInputModality";

describe("useInputModality", () => {
  beforeEach(() => {
    document.documentElement.dataset.inputModality = ModalityType.Pointer;
  });

  it("handles events with undefined or null key without throwing", () => {
    renderHook(() => InputModalityTracker());

    expect(() => {
      // Synthetic or datalist autofill event where key is undefined
      const event = new KeyboardEvent("keydown", { key: undefined });
      window.dispatchEvent(event);
    }).not.toThrow();
  });

  it("switches to keyboard modality on Arrow key", () => {
    const { result } = renderHook(() => {
      InputModalityTracker();

      return useInputModality();
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    });

    expect(result.current).toBe(ModalityType.Keyboard);
  });

  it("switches to pointer modality on pointer down", () => {
    const { result } = renderHook(() => {
      InputModalityTracker();

      return useInputModality();
    });

    act(() => {
      window.dispatchEvent(new MouseEvent("mousedown"));
    });

    expect(result.current).toBe(ModalityType.Pointer);
  });
});
