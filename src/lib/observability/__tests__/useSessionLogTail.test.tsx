/** @vitest-environment jsdom */
/**
 * Plan 90 Step 74 - tests for `useSessionLogTail`.
 *
 * Uses a fake EventSource injected via the `factory` seam. Verifies:
 *  - opens the correct URL with follow/since/max params
 *  - collects `message` frames into `lines[]` with `lastEventId`
 *  - parses the `end` event JSON into `end` and sets status=ended
 *  - surfaces `error` as status=error and closes
 *  - `reconnect()` closes the old source and opens a new one
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSessionLogTail } from "../useSessionLogTail";

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

  dispatch(name: string, data: string, lastEventId = ""): void {
    const ev = { data, lastEventId } as MessageEvent<string>;
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

describe("useSessionLogTail", () => {
  it("opens the correct URL with query params", () => {
    FakeEventSource.opened = [];
    renderHook(() =>
      useSessionLogTail({ runId: "run-1", follow: true, sinceLine: 5, maxLines: 100 }, factory),
    );
    expect(FakeEventSource.opened).toHaveLength(1);
    expect(FakeEventSource.opened[0].url).toBe(
      "/api/cli/sessions/run-1/log?follow=true&since_line=5&max_lines=100",
    );
  });

  it("stays idle when disabled or runId missing", () => {
    FakeEventSource.opened = [];
    const { result } = renderHook(() => useSessionLogTail({ runId: null }, factory));
    expect(FakeEventSource.opened).toHaveLength(0);
    expect(result.current.status).toBe("idle");
  });

  it("collects message frames and parses the end event", async () => {
    FakeEventSource.opened = [];
    const { result } = renderHook(() => useSessionLogTail({ runId: "run-2" }, factory));
    const es = FakeEventSource.opened[0];
    act(() => {
      es.onopen?.();
      es.onmessage?.({ data: '{"line":1}', lastEventId: "1" } as MessageEvent<string>);
      es.onmessage?.({ data: '{"line":2}', lastEventId: "2" } as MessageEvent<string>);
      es.dispatch(
        "end",
        JSON.stringify({ RunId: "run-2", LineCount: 2, NextSinceLine: 2, Truncated: false }),
      );
    });
    await waitFor(() => expect(result.current.status).toBe("ended"));
    expect(result.current.lines).toEqual([
      { Id: "1", Data: '{"line":1}' },
      { Id: "2", Data: '{"line":2}' },
    ]);
    expect(result.current.end).toEqual({
      RunId: "run-2",
      LineCount: 2,
      NextSinceLine: 2,
      Truncated: false,
    });
    expect(es.closed).toBe(true);
  });

  it("surfaces stream error and closes", async () => {
    FakeEventSource.opened = [];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = renderHook(() => useSessionLogTail({ runId: "run-3" }, factory));
    const es = FakeEventSource.opened[0];
    act(() => {
      es.dispatch("error", "");
    });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(es.closed).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("reconnect() opens a fresh EventSource", async () => {
    FakeEventSource.opened = [];
    const { result } = renderHook(() => useSessionLogTail({ runId: "run-4" }, factory));
    expect(FakeEventSource.opened).toHaveLength(1);
    act(() => {
      result.current.reconnect();
    });
    await waitFor(() => expect(FakeEventSource.opened).toHaveLength(2));
    expect(FakeEventSource.opened[0].closed).toBe(true);
  });
});
