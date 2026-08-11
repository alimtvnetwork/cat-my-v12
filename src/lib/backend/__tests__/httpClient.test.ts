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
  }),
  http.get("http://localhost:8000/rules", () => {
    return HttpResponse.json({
      Status: { IsSuccess: true, IsFailed: false, Code: 200, Message: "OK", Timestamp: new Date().toISOString() },
      Attributes: { RequestedAt: new Date().toISOString(), HasAnyErrors: false, IsSingle: false, IsMultiple: true, IsEmpty: false },
      Results: [{ items: [{ RuleId: 1, RuleKind: "EdgeDetection", OrderIndex: 0, ParamsJson: "{}", IsActive: true }], total: 1, provider: "MockBackend" }],
    });
  }),
  http.get("http://localhost:8000/samples", () => {
    return HttpResponse.json({
      Status: { IsSuccess: true, IsFailed: false, Code: 200, Message: "OK", Timestamp: new Date().toISOString() },
      Attributes: { RequestedAt: new Date().toISOString(), HasAnyErrors: false, IsSingle: false, IsMultiple: true, IsEmpty: false },
      Results: [{ items: [{ SampleId: 1, Label: "Mock Sample", ImageFilePath: "/placeholder.jpg" }], total: 1, provider: "MockBackend" }],
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

  it("fetches rules list successfully", async () => {
    useBackendMode.setState({ baseUrl: "http://localhost:8000" });
    const client = new HttpBackendClient();
    const res = await client.rules.list();
    expect(res.Status.IsSuccess).toBe(true);
    expect(res.Results?.[0]?.total).toBe(1);
    expect(res.Results?.[0]?.items[0].RuleKind).toBe("EdgeDetection");
  });

  it("fetches samples list successfully", async () => {
    useBackendMode.setState({ baseUrl: "http://localhost:8000" });
    const client = new HttpBackendClient();
    const res = await client.samples.list();
    expect(res.Status.IsSuccess).toBe(true);
    expect(res.Results?.[0]?.total).toBe(1);
    expect(res.Results?.[0]?.items[0].Label).toBe("Mock Sample");
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
