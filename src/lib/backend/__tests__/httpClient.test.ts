import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { HttpBackendClient } from "../httpClient";
import { useBackendMode } from "../mode";
import { showToastError } from "@/lib/errors/notify";

vi.mock("@/lib/errors/notify", () => ({
  showToastError: vi.fn(),
}));

const server = setupServer(
  http.get("http://localhost:8000/ping", () => {
    return HttpResponse.json({
      Status: { 
        IsSuccess: true, 
        IsFailed: false, 
        Code: 200, 
        Message: "OK", 
        Timestamp: new Date().toISOString() 
      },
      Attributes: {
        RequestedAt: new Date().toISOString(),
        HasAnyErrors: false,
        IsSingle: true,
        IsMultiple: false,
        IsEmpty: false
      },
      Results: [{ pong: true }],
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

describe("HttpBackendClient", () => {
  it("fetches successfully", async () => {
    useBackendMode.setState({ baseUrl: "http://localhost:8000" });
    const client = new HttpBackendClient();
    const res = await client.ping();
    expect(res.Status.IsSuccess).toBe(true);
    expect(res.Results?.[0]?.pong).toBe(true);
  });

  it("throws on network error and calls showToastError", async () => {
    server.use(
      http.get("http://localhost:8000/ping", () => {
        return HttpResponse.error();
      })
    );
    useBackendMode.setState({ baseUrl: "http://localhost:8000" });
    const client = new HttpBackendClient();
    await expect(client.ping()).rejects.toThrow("E_UNREACHABLE");
    expect(showToastError).toHaveBeenCalled();
  });

  it("throws on invalid envelope format and calls showToastError", async () => {
    server.use(
      http.get("http://localhost:8000/ping", () => {
        return HttpResponse.json({ missingStatus: true });
      })
    );
    useBackendMode.setState({ baseUrl: "http://localhost:8000" });
    const client = new HttpBackendClient();
    await expect(client.ping()).rejects.toThrow("E_ENVELOPE_PARSE");
    expect(showToastError).toHaveBeenCalled();
  });

  it("throws on invalid url and calls showToastError", async () => {
    useBackendMode.setState({ baseUrl: "invalid-url" });
    const client = new HttpBackendClient();
    await expect(client.ping()).rejects.toThrow("E_INVALID_URL");
    expect(showToastError).toHaveBeenCalled();
  });
});
