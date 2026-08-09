/** @vitest-environment jsdom */
/**
 * Plan 90 Step 75 - tests for `useSessionLogTailAutoReconnect`.
 *
 * Verifies:
 *  - transport error triggers a scheduled reconnect (exponential)
 *  - successful `open` resets the attempt counter
 *  - clean `end` frame does NOT trigger reconnect
 *  - gives up after `maxAttempts` consecutive failures and sets gaveUp
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionLogTailAutoReconnect } from "../useSessionLogTailAutoReconnect";

type Listener = (ev: MessageEvent<string>) => void;

class FakeEventSource {
  static opened: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
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

  dispatch(name: string, data = "", lastEventId = ""): void {
    const ev = { data, lastEventId } as MessageEvent<string>;
    for (const cb of this.listeners[name] ?? []) cb(ev);
  }

  close(): void {
    this.closed = true;
    this.readyState = 2;
  }
}

const factory = (url: string): EventSource => new FakeEventSource(url) as unknown as EventSource;

beforeEach(() => {
  FakeEventSource.opened = [];
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useSessionLogTailAutoReconnect", () => {
  it("reconnects after transport error with backoff", async () => {
    const { result } = renderHook(() =>
      useSessionLogTailAutoReconnect(
        { runId: "run-1" },
        { baseMs: 100, maxMs: 1000, maxAttempts: 3 },
        factory,
      ),
    );
    expect(FakeEventSource.opened).toHaveLength(1);
    act(() => {
      FakeEventSource.opened[0].dispatch("error");
    });
    expect(result.current.status).toBe("error");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(FakeEventSource.opened).toHaveLength(2);
    expect(result.current.reconnectCount).toBe(1);
    expect(result.current.consecutiveFailures).toBe(1);
    expect(result.current.gaveUp).toBe(false);
  });

  it("resets counters when a reconnect opens successfully", async () => {
    const { result } = renderHook(() =>
      useSessionLogTailAutoReconnect({ runId: "run-2" }, { baseMs: 50, maxAttempts: 5 }, factory),
    );
    act(() => FakeEventSource.opened[0].dispatch("error"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(80);
    });
    expect(FakeEventSource.opened).toHaveLength(2);
    act(() => FakeEventSource.opened[1].onopen?.());
    expect(result.current.status).toBe("open");
    expect(result.current.consecutiveFailures).toBe(0);
  });

  it("does NOT reconnect on clean end", async () => {
    renderHook(() => useSessionLogTailAutoReconnect({ runId: "run-3" }, { baseMs: 50 }, factory));
    act(() =>
      FakeEventSource.opened[0].dispatch(
        "end",
        JSON.stringify({
          RunId: "run-3",
          LineCount: 0,
          NextSinceLine: 0,
          Truncated: false,
        }),
      ),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(FakeEventSource.opened).toHaveLength(1);
  });

  it("gives up after maxAttempts consecutive failures", async () => {
    const { result } = renderHook(() =>
      useSessionLogTailAutoReconnect(
        { runId: "run-4" },
        { baseMs: 10, maxMs: 20, maxAttempts: 2 },
        factory,
      ),
    );
    for (let i = 0; i < 3; i++) {
      const es = FakeEventSource.opened[FakeEventSource.opened.length - 1];
      act(() => es.dispatch("error"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
    }

    expect(result.current.gaveUp).toBe(true);
    // Only 2 auto reconnects should have occurred (attempts 0 and 1),
    // then a 3rd error and give-up (no more opens).
    expect(FakeEventSource.opened.length).toBeLessThanOrEqual(3);
  });
});
