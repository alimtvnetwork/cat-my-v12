// Verifies compact toast behaviour: dedupe, clickable title -> opens modal.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("sonner", () => {
  const calls: Array<{ title: unknown; opts: Record<string, unknown> }> = [];
  const error = vi.fn((title: unknown, opts: Record<string, unknown> = {}) => {
    calls.push({ title, opts });

    return opts.id ?? `t-${calls.length}`;
  });
  const success = vi.fn();

  return { toast: Object.assign(error, { error, success }), __calls: calls };
});

import { toast } from "sonner";
import { showGlobalError } from "@/lib/errors/notify";
import { useErrorStore } from "@/lib/errors/errorStore";

describe("showGlobalError", () => {
  beforeEach(() => {
    useErrorStore.setState({ currentError: null, history: [], isOpen: false });
    (toast.error as ReturnType<typeof vi.fn>).mockClear();
  });

  it("dedupes repeated errors on same endpoint", () => {
    showGlobalError(new Error("boom"), { endpoint: "/api/x" });
    showGlobalError(new Error("boom"), { endpoint: "/api/x" });
    showGlobalError(new Error("boom"), { endpoint: "/api/x" });
    const calls = (toast.error as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBe(3);
    // All updates share the same sonner id
    // Second and third updates reuse the first toast's id
    const firstId = calls[0][1].id ?? "t-1";
    expect(calls[1][1].id).toBe(firstId);
    expect(calls[2][1].id).toBe(firstId);
  });

  it("does not dedupe across distinct endpoints", () => {
    showGlobalError(new Error("a"), { endpoint: "/api/a" });
    showGlobalError(new Error("b"), { endpoint: "/api/b" });
    const calls = (toast.error as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBe(2);
  });

  it("normalizes dedupe key across query strings and origins", () => {
    showGlobalError(new Error("boom"), {
      endpoint: "http://127.0.0.1:8787/api/cli/status",
      method: "GET",
    });
    showGlobalError(new Error("boom"), {
      endpoint: "/api/cli/status?ts=123",
      method: "GET",
    });
    showGlobalError(new Error("boom"), {
      endpoint: "/api/cli/status",
      method: "GET",
    });
    const results = (toast.error as ReturnType<typeof vi.fn>).mock.results;
    const firstId = results[0].value;
    // Second and third calls reuse the same toast id => stacked, not spawned.
    expect((toast.error as ReturnType<typeof vi.fn>).mock.calls[1][1].id).toBe(firstId);
    expect((toast.error as ReturnType<typeof vi.fn>).mock.calls[2][1].id).toBe(firstId);
  });

  it("renders a clickable title that opens the modal", () => {
    showGlobalError(new Error("boom"), { endpoint: "/api/click" });
    const [title] = (toast.error as ReturnType<typeof vi.fn>).mock.calls[0];
    // Title is a React element (button) with an onClick that opens the modal
    expect(title).toBeTruthy();
    expect(typeof title).toBe("object");
    const onClick = (title as { props: { onClick: () => void } }).props.onClick;
    expect(typeof onClick).toBe("function");
    onClick();
    expect(useErrorStore.getState().isOpen).toBe(true);
  });
});
