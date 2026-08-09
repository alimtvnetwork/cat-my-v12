/**
 * Plan 90 Step 73 - Proxy tests for `/api/cli/sessions/:runId/log`.
 *
 * Invokes the route handler directly (no HTTP server) to exercise every
 * failure branch and confirm the SSE happy-path is streamed unmodified.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Route } from "../cli.sessions.$runId.log";

type Handler = (args: { request: Request; params: Record<string, string> }) => Promise<Response>;
// Route.options.server is inferred as unknown here; the runtime shape is stable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GET = (Route.options as any).server.handlers.GET as Handler;

function req(url: string): Request {
  return new Request(url, { method: "GET" });
}

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  process.env.BE_URL = "http://be.local";
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("cli log SSE proxy", () => {
  it("rejects an empty run_id with E_BE_BAD_REQUEST (400)", async () => {
    const resp = await GET({
      request: req("http://fe/api/cli/sessions//log"),
      params: { runId: "" },
    });
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.Errors[0].Code).toBe("E_BE_BAD_REQUEST");
  });

  it("rejects malformed run_id (path traversal chars)", async () => {
    const resp = await GET({
      request: req("http://fe/api/cli/sessions/..%2Fetc/log"),
      params: { runId: "../etc" },
    });
    expect(resp.status).toBe(400);
    const body = await resp.json();
    expect(body.Errors[0].Code).toBe("E_BE_BAD_REQUEST");
  });

  it("surfaces upstream 404 verbatim so the UI sees E_BE_NOT_FOUND", async () => {
    const notFoundBody = JSON.stringify({
      Status: { IsSuccess: false, HttpStatus: 404 },
      Data: null,
      Errors: [{ Code: "E_BE_NOT_FOUND", Message: "unknown run_id", Details: { RunId: "run-x" } }],
    });
    globalThis.fetch = vi.fn(
      async () =>
        new Response(notFoundBody, {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const resp = await GET({
      request: req("http://fe/api/cli/sessions/run-x/log"),
      params: { runId: "run-x" },
    });
    expect(resp.status).toBe(404);
    const body = await resp.json();
    expect(body.Errors[0].Code).toBe("E_BE_NOT_FOUND");
  });

  it("returns 503 E_BE_UPSTREAM_DOWN when fetch throws", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const resp = await GET({
      request: req("http://fe/api/cli/sessions/run-x/log"),
      params: { runId: "run-x" },
    });
    expect(resp.status).toBe(503);
    const body = await resp.json();
    expect(body.Errors[0].Code).toBe("E_BE_UPSTREAM_DOWN");
  });

  it("streams SSE body unmodified with correct headers on 200", async () => {
    const sseBody = 'id: 1\ndata: {"line":1}\n\nevent: end\ndata: {}\n\n';
    globalThis.fetch = vi.fn(
      async () =>
        new Response(sseBody, {
          status: 200,
          headers: { "content-type": "text/event-stream; charset=utf-8" },
        }),
    ) as unknown as typeof fetch;

    const resp = await GET({
      request: req("http://fe/api/cli/sessions/run-x/log?follow=true&since_line=0&max_lines=100"),
      params: { runId: "run-x" },
    });
    expect(resp.status).toBe(200);
    expect(resp.headers.get("content-type")).toContain("text/event-stream");
    expect(resp.headers.get("cache-control")).toContain("no-cache");
    const text = await resp.text();
    expect(text).toBe(sseBody);
  });
});
