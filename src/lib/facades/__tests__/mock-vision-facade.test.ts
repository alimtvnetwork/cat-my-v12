import { describe, it, expect, vi } from "vitest";

// Mock the active profile so we always get "seed" mode in tests
vi.mock("@/lib/seed/active-profile", () => ({
  getActiveProfile: vi.fn(() => "seed"),
}));

import { visionFacade } from "@/lib/facades/vision-facade";

describe("MockVisionFacade (Seed mode)", () => {
  it("getCameraStatus returns connected status without network calls", async () => {
    const facade = visionFacade;
    const result = await facade.getCameraStatus("mock-cam-1");
    expect(result.status).toBe("connected");
  });

  it("captureImage returns a reference image fixture without network calls", async () => {
    const facade = visionFacade;
    const result = await facade.captureImage("mock-cam-1");
    expect(result).toBeDefined();
    expect(typeof result.id).toBe("number");
    expect(typeof result.url).toBe("string");
  });

  it("getReference returns a seed reference image", async () => {
    const facade = visionFacade;
    const result = await facade.getReference("mock-project-1");
    expect(result).toBeDefined();
  });
});
