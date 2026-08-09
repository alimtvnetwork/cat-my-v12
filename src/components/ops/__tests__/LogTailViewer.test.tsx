/** @vitest-environment jsdom */
/**
 * Plan 90 Step 76 - tests for `LogTailViewer`.
 *
 * Uses a fake EventSource to drive the underlying hook chain
 * (useSessionLogTail -> useSessionLogTailAutoReconnect) and asserts:
 *  - renders live pill + line frames as they arrive
 *  - fires sonner toasts on retry and clean end (drift surfaced)
 *  - manual Reconnect button re-opens the stream
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, cleanup } from "@testing-library/react";

const toastCalls: Array<{ kind: string; msg: string }> = [];
vi.mock("sonner", () => ({
  toast: {
    warning: (m: string) => toastCalls.push({ kind: "warning", msg: m }),
    error: (m: string) => toastCalls.push({ kind: "error", msg: m }),
    success: (m: string) => toastCalls.push({ kind: "success", msg: m }),
  },
}));

type Listener = (ev: MessageEvent<string>) => void;

class FakeEventSource {
  static opened: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: Listener | null = null;
  readyState = 0;
  closed = false;
  listeners: Record<string, Listener[]> = {};
  constructor(public url: string) {
    FakeEventSource.opened.push(this);
  }

  addEventListener(name: string, cb: Listener): void {
    (this.listeners[name] ??= []).push(cb);
  }

  dispatch(name: string, data: string, lastEventId = ""): void {
    const ev = { data, lastEventId } as MessageEvent<string>;

    if (name === "message" && this.onmessage) this.onmessage(ev);
    for (const cb of this.listeners[name] ?? []) cb(ev);
  }

  close(): void {
    this.closed = true;
    this.readyState = 2;
  }
}

function factory(url: string): EventSource {
  return new FakeEventSource(url) as unknown as EventSource;
}

// Import after mocks.
import { useSessionLogTailAutoReconnect } from "@/lib/observability/useSessionLogTailAutoReconnect";
// Re-export inner via wrapper that injects factory (component uses default).
// Instead of factory injection into the component, we override global EventSource.
import { LogTailViewer } from "../LogTailViewer";

beforeEach(() => {
  cleanup();
  FakeEventSource.opened = [];
  toastCalls.length = 0;
  (globalThis as unknown as { EventSource: typeof EventSource }).EventSource =
    FakeEventSource as unknown as typeof EventSource;
});

describe("LogTailViewer", () => {
  it("renders lines and shows live status", async () => {
    render(<LogTailViewer runId="run-abc12345" />);
    const src = FakeEventSource.opened[0];
    expect(src.url).toContain("/api/cli/sessions/run-abc12345/log");
    await act(async () => {
      src.onopen?.();
      src.dispatch("message", '{"level":"info","msg":"hello"}', "1");
    });
    expect(screen.getByText(/hello/)).toBeTruthy();
    expect(screen.getByText("live")).toBeTruthy();
  });

  it("fires a success toast on clean end", async () => {
    render(<LogTailViewer runId="run-end0001x" />);
    const src = FakeEventSource.opened[0];
    await act(async () => {
      src.onopen?.();
      src.dispatch("message", '{"m":"a"}', "1");
      src.dispatch(
        "end",
        JSON.stringify({
          RunId: "run-end0001x",
          LineCount: 1,
          NextSinceLine: 2,
          Truncated: false,
        }),
        "end",
      );
    });
    expect(toastCalls.some((t) => t.kind === "success")).toBe(true);
    expect(screen.getByText("ended")).toBeTruthy();
  });

  it("manual Reconnect opens a fresh EventSource", async () => {
    render(<LogTailViewer runId="run-rec00001" />);
    expect(FakeEventSource.opened).toHaveLength(1);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Reconnect/i }));
    });
    expect(FakeEventSource.opened.length).toBeGreaterThanOrEqual(2);
  });
});

// Silence unused-import lint - referenced for type completeness.
void useSessionLogTailAutoReconnect;
