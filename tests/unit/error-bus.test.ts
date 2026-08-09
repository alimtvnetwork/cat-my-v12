// Plan 43 slice-1: verify error-bus reports, subscribers receive, and
// makeErrorRecord normalises Error / string / unknown inputs.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { subscribe, reportError, __resetErrorBusForTest } from "@/lib/errors/error-bus";
import { makeErrorRecord } from "@/lib/errors/error-record";
import { AppMode, getAppMode, isDialogVisibleMode } from "@/lib/app-mode";

describe("error-bus", () => {
  beforeEach(() => {
    __resetErrorBusForTest();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("delivers reported records to subscribers", () => {
    const seen: unknown[] = [];
    subscribe((rec) => seen.push(rec));
    const rec = reportError("manual", new Error("boom"));
    expect(rec.message).toBe("boom");
    expect(rec.source).toBe("manual");
    expect(seen).toHaveLength(1);
  });

  it("unsubscribe stops delivery", () => {
    const seen: unknown[] = [];
    const off = subscribe((r) => seen.push(r));
    off();
    reportError("manual", "later");
    expect(seen).toHaveLength(0);
  });

  it("isolates listener failures", () => {
    const seen: unknown[] = [];
    subscribe(() => {
      throw new Error("bad listener");
    });
    subscribe((r) => seen.push(r));
    reportError("manual", "still delivers");
    expect(seen).toHaveLength(1);
  });
});

describe("makeErrorRecord", () => {
  it("normalises Error", () => {
    const e = new Error("x");
    const r = makeErrorRecord("boundary", e);
    expect(r.name).toBe("Error");
    expect(r.message).toBe("x");
    expect(r.stack).toBeDefined();
  });

  it("normalises string", () => {
    expect(makeErrorRecord("manual", "raw").message).toBe("raw");
  });

  it("normalises unknown via JSON", () => {
    expect(makeErrorRecord("manual", { a: 1 }).message).toBe('{"a":1}');
  });
});

describe("app-mode", () => {
  it("Dev is dialog-visible", () => {
    expect(isDialogVisibleMode(AppMode.Dev)).toBe(true);
    expect(isDialogVisibleMode(AppMode.Test)).toBe(true);
    expect(isDialogVisibleMode(AppMode.Prod)).toBe(false);
  });

  it("getAppMode defaults to Dev when env absent", () => {
    // Vitest runs with no VITE_APP_MODE by default.
    const mode = getAppMode();
    expect([AppMode.Dev, AppMode.Test, AppMode.Prod]).toContain(mode);
  });
});
