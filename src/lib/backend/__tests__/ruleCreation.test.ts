import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { HttpBackendClient } from "../httpClient";
import { useBackendMode } from "../mode";

vi.mock("@/lib/errors/notify", () => ({
  showToastError: vi.fn(),
}));

const server = setupServer(
  http.post("http://localhost:8000/rules", async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      Status: { IsSuccess: true, IsFailed: false, Code: 201, Message: "Created", Timestamp: new Date().toISOString() },
      Attributes: { RequestedAt: new Date().toISOString(), HasAnyErrors: false, IsSingle: true, IsMultiple: false, IsEmpty: false },
      Results: [{
        RuleId: 2,
        RuleKind: body.RuleKind || "MockRule",
        OrderIndex: 1,
        ParamsJson: body.ParamsJson || "{}",
        IsActive: true
      }],
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

describe("Rule Creation Integration", () => {
  it("creates a rule successfully and returns the mocked backend envelope", async () => {
    useBackendMode.setState({ baseUrl: "http://localhost:8000" });
    const client = new HttpBackendClient();
    
    const payload = {
      RuleKind: "TestRule",
      ParamsJson: '{"threshold": 10}'
    };
    
    const res = await client.rules.create(payload);
    expect(res.Status.IsSuccess).toBe(true);
    expect(res.Results).toHaveLength(1);
    expect(res.Results[0].RuleId).toBe(2);
    expect(res.Results[0].RuleKind).toBe("TestRule");
    expect(res.Results[0].ParamsJson).toBe('{"threshold": 10}');
  });
});
