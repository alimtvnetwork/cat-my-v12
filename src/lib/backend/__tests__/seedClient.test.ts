import { describe, it, expect } from "vitest";
import { SeedBackendClient } from "../seedClient";

describe("SeedBackendClient", () => {
  it("returns a mock pong envelope", async () => {
    const client = new SeedBackendClient();
    const res = await client.ping();
    expect(res.Status.IsSuccess).toBe(true);
    expect(res.Results?.[0]?.pong).toBe(true);
  });
});
