// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
import { exportSessionToZip } from "../zip-builder";
import {
  type RecorderSession,
  RecorderActorType,
  RecorderEventType,
  IssueCategoryType,
} from "../types";

describe("zip-builder", () => {
  const mockSession: RecorderSession = {
    id: "rec-zip-test",
    startedAt: "2026-10-28T10:00:00.000Z",
    stoppedAt: "2026-10-28T10:01:00.000Z",
    durationMs: 60000,
    routeHistory: ["/"],
    initialRoute: "/",
    finalRoute: "/",
    summary: {
      title: "UI Overlap on modal",
      description: "Modal overlaps bottom navigation bar",
      category: IssueCategoryType.UiGlitch,
      expectedBehavior: "No overlap",
      actualBehavior: "Overlaps by 20px",
    },
    screenshots: [
      {
        id: "snap-1",
        title: "Test Snapshot",
        timestamp: "2026-10-28T10:00:30.000Z",
        elapsedMs: 30000,
        dataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        source: "manual",
      },
    ],
    events: [
      {
        id: "evt-1",
        timestamp: "2026-10-28T10:00:10.000Z",
        elapsedMs: 10000,
        actor: RecorderActorType.User,
        eventType: RecorderEventType.Click,
        description: "Clicked button",
        targetComponent: "Button",
        selector: "button",
        route: "/",
        hasScreenshot: true,
        screenshotId: "snap-1",
      },
    ],
  };

  it("builds a valid zip with all required markdown, json, and screenshot files", async () => {
    // Mock URL.createObjectURL and link.click in jsdom
    const originalCreateObjectUrl = window.URL.createObjectURL;
    const originalRevokeObjectUrl = window.URL.revokeObjectURL;

    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();

    const result = await exportSessionToZip(mockSession);

    expect(result.isSuccess).toBe(true);
    expect(result.filename).toMatch(/^cat-bug-report-.*\.zip$/);
    expect(result.blobSize).toBeGreaterThan(0);

    window.URL.createObjectURL = originalCreateObjectUrl;
    window.URL.revokeObjectURL = originalRevokeObjectUrl;
  });
});
