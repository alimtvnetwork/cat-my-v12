import { beforeEach, describe, expect, it, vi } from "vitest";

import { __resetErrorStoreForTest, useErrorStore } from "../errorStore";

beforeEach(() => {
  __resetErrorStoreForTest();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("errorStore", () => {
  it("captureError builds a CapturedError and stores it as current + history head", () => {
    const captured = useErrorStore
      .getState()
      .captureError(new Error("boom"), { endpoint: "/api/x" }, "E9003");
    const s = useErrorStore.getState();
    expect(captured.code).toBe("E9003");
    expect(captured.message).toBe("boom");
    expect(captured.endpoint).toBe("/api/x");
    expect(s.currentError?.id).toBe(captured.id);
    expect(s.history[0]?.id).toBe(captured.id);
  });

  it("captureException defaults to code E_UNCAUGHT", () => {
    const captured = useErrorStore.getState().captureException("odd");
    expect(captured.code).toBe("E_UNCAUGHT");
    expect(captured.message).toBe("odd");
  });

  it("openErrorModal(captured) opens and dedupes history by id", () => {
    const { captureError, openErrorModal } = useErrorStore.getState();
    const c = captureError(new Error("a"));
    openErrorModal(c);
    const s = useErrorStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.history.filter((h) => h.id === c.id)).toHaveLength(1);
  });

  it("prev/next walk history (newest first)", () => {
    const s0 = useErrorStore.getState();
    const a = s0.captureError(new Error("a"));
    const b = s0.captureError(new Error("b"));
    // current = b (newest). next should walk to older (a).
    expect(useErrorStore.getState().currentError?.id).toBe(b.id);
    useErrorStore.getState().next();
    expect(useErrorStore.getState().currentError?.id).toBe(a.id);
    useErrorStore.getState().prev();
    expect(useErrorStore.getState().currentError?.id).toBe(b.id);
  });

  it("dismissCurrent clears current and closes modal but preserves history", () => {
    const s = useErrorStore.getState();
    const c = s.captureError(new Error("x"));
    s.openErrorModal(c);
    useErrorStore.getState().dismissCurrent();
    const after = useErrorStore.getState();
    expect(after.currentError).toBeNull();
    expect(after.isOpen).toBe(false);
    expect(after.history).toHaveLength(1);
  });

  it("caps history at 50 entries", () => {
    const s = useErrorStore.getState();
    for (let i = 0; i < 55; i++) s.captureError(new Error(`e${i}`));
    expect(useErrorStore.getState().history).toHaveLength(50);
    expect(useErrorStore.getState().history[0]?.message).toBe("e54");
  });
});
