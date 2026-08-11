// Plan 90 Step 102: coverage for `src/lib/be-fetch.ts`.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CORRELATION_HEADER, EnvelopeError, beFetch, type Envelope } from "@/lib/be-fetch";
import { useErrorStore } from "@/lib/errors/errorStore";

function successEnvelope<T>(results: T[]): Envelope<T> {
  return {
    Status: {
      IsSuccess: true,
      IsFailed: false,
      Code: 200,
      Message: "OK",
      Timestamp: new Date().toISOString(),
    },
    Attributes: {
      RequestedAt: new Date().toISOString(),
      HasAnyErrors: false,
      IsSingle: results.length === 1,
      IsMultiple: results.length > 1,
      IsEmpty: results.length === 0,
      TotalRecords: results.length,
    },
    Results: results,
  };
}

function failureEnvelope(code: string, msg: string): Envelope<never> {
  return {
    Status: {
      IsSuccess: false,
      IsFailed: true,
      Code: 500,
      Message: msg,
      Timestamp: new Date().toISOString(),
    },
    Attributes: {
      RequestedAt: new Date().toISOString(),
      HasAnyErrors: true,
      IsSingle: false,
      IsMultiple: false,
      IsEmpty: true,
    },
    Results: [],
    Errors: { Code: code, BackendMessage: msg },
  };
}

function mockFetch(response: Response | Error): void {
  const impl = vi.fn(async () => {
    if (response instanceof Error) throw response;

    return response;
  });
  vi.stubGlobal("fetch", impl);
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("beFetch", () => {
  beforeEach(() => {
    useErrorStore.setState({ currentError: null, history: [], isOpen: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("injects a correlation id header and returns the parsed envelope on success", async () => {
    const captured: Request[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        captured.push(new Request(input as string, init));

        return jsonResponse(successEnvelope([{ id: 1 }]));
      }),
    );

    const env = await beFetch<{ id: number }>("http://localhost/api/ping");
    expect(env.Results).toEqual([{ id: 1 }]);
    expect(captured[0]?.headers.get(CORRELATION_HEADER)).toMatch(/^[0-9A-Z]{8}$/);
  });

  it("reuses a pinned correlation id when supplied", async () => {
    const captured: Request[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        captured.push(new Request(input as string, init));

        return jsonResponse(successEnvelope([]));
      }),
    );

    await beFetch("http://localhost/api/ping", {}, { correlationId: "PINNED12" });
    expect(captured[0]?.headers.get(CORRELATION_HEADER)).toBe("PINNED12");
  });

  it("throws EnvelopeError and captures into errorStore on IsFailed", async () => {
    mockFetch(jsonResponse(failureEnvelope("E_CAM_CAPTURE_FAILED", "camera dead"), 502));

    await expect(
      beFetch("http://localhost/api/camera/capture", { method: "POST" }),
    ).rejects.toMatchObject({
      name: "EnvelopeError",
      code: "E_CAM_CAPTURE_FAILED",
      responseStatus: 502,
      endpoint: "http://localhost/api/camera/capture",
      method: "POST",
    });

    const state = useErrorStore.getState();
    expect(state.currentError?.code).toBe("E_CAM_CAPTURE_FAILED");
    expect(state.currentError?.endpoint).toBe("http://localhost/api/camera/capture");
    expect(state.currentError?.method).toBe("POST");
    expect(state.currentError?.responseStatus).toBe(502);
  });

  it("throws E_BE_UNAVAILABLE on transport failure", async () => {
    mockFetch(new TypeError("fetch failed"));

    await expect(beFetch("http://localhost/api/anything")).rejects.toMatchObject({
      code: "E_BE_UNAVAILABLE",
      responseStatus: 0,
    });
    expect(useErrorStore.getState().currentError?.code).toBe("E_BE_UNAVAILABLE");
  });

  it("throws E_BE_BAD_RESPONSE when the body is not an envelope", async () => {
    mockFetch(new Response("<html>oops</html>", { status: 200 }));

    await expect(beFetch("http://localhost/api/anything")).rejects.toBeInstanceOf(EnvelopeError);
    expect(useErrorStore.getState().currentError?.code).toBe("E_BE_BAD_RESPONSE");
  });

  it("adopts the server's X-Correlation-Id when present", async () => {
    mockFetch(
      jsonResponse(failureEnvelope("E_BE_CONFLICT", "nope"), 409, {
        [CORRELATION_HEADER]: "SERVERCID",
      }),
    );

    await expect(beFetch("http://localhost/api/x")).rejects.toMatchObject({
      correlationId: "SERVERCID",
    });
  });

  it("suppresses capture when opts.suppressCapture is true", async () => {
    mockFetch(jsonResponse(failureEnvelope("E_BE_BAD_REQUEST", "bad"), 400));

    await expect(
      beFetch("http://localhost/api/x", {}, { suppressCapture: true }),
    ).rejects.toBeInstanceOf(EnvelopeError);
    expect(useErrorStore.getState().currentError).toBeNull();
  });
});