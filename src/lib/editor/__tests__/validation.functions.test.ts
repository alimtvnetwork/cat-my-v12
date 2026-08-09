// Plan 65 step 20: lock in the URL validation fix from step 19 so a
// bad VALIDATION_WORKER_URL never again leaks fetch's raw "Failed to
// parse URL from x/healthz" into the WorkerHealthBanner.
import { describe, it, expect } from "vitest";
import { parseWorkerHealthzEndpoint } from "../validation.functions";

describe("parseWorkerHealthzEndpoint", () => {
  it("rejects undefined", () => {
    const r = parseWorkerHealthzEndpoint(undefined);
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toMatch(/not set/);
  });

  it("rejects empty string", () => {
    const r = parseWorkerHealthzEndpoint("");
    expect(r.ok).toBe(false);
  });

  it("rejects whitespace-only", () => {
    const r = parseWorkerHealthzEndpoint("   ");
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toMatch(/empty/);
  });

  it("rejects a bare token like 'x'", () => {
    // The exact regression from the user screenshot: env var was "x",
    // fetch produced "Failed to parse URL from x/healthz".
    const r = parseWorkerHealthzEndpoint("x");
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toMatch(/not a valid URL/);
  });

  it("rejects a non-http protocol", () => {
    const r = parseWorkerHealthzEndpoint("ftp://example.com");
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toMatch(/protocol/);
  });

  it("accepts a plain http URL and appends /healthz", () => {
    const r = parseWorkerHealthzEndpoint("http://worker.local:8080");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.endpoint).toBe("http://worker.local:8080/healthz");
  });

  it("accepts https and strips a trailing slash before appending /healthz", () => {
    const r = parseWorkerHealthzEndpoint("https://worker.example.com/");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.endpoint).toBe("https://worker.example.com/healthz");
  });

  it("trims surrounding whitespace before validating", () => {
    const r = parseWorkerHealthzEndpoint("  http://worker.local  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.endpoint).toBe("http://worker.local/healthz");
  });
});
