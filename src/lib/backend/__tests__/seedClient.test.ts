import { describe, it, expect } from "vitest";
import { SeedBackendClient } from "../seedClient";

describe("SeedBackendClient", () => {
  it("returns a mock pong envelope", async () => {
    const client = new SeedBackendClient();
    const res = await client.ping();
    expect(res.Status.IsSuccess).toBe(true);
    expect(res.Results?.[0]?.pong).toBe(true);
  });

  it("returns a mock rules list envelope", async () => {
    const client = new SeedBackendClient();
    const res = await client.rules.list();
    expect(res.Status.IsSuccess).toBe(true);
    expect(res.Results?.[0]?.total).toBe(2);
    expect(res.Results?.[0]?.items[0].RuleKind).toBe("EdgeDetection");
  });

  it("returns a mock samples list envelope", async () => {
    const client = new SeedBackendClient();
    const res = await client.samples.list();
    expect(res.Status.IsSuccess).toBe(true);
    expect(res.Results?.[0]?.total).toBe(4);
    expect(res.Results?.[0]?.items[0].Label).toBe("Test Sample A");
  });
});
