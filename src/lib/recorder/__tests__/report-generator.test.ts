import { describe, it, expect } from "vitest";
import { generateAiInstructions, generateReadme, generateTimelineTable } from "../report-generator";
import {
  type RecorderSession,
  RecorderActorType,
  RecorderEventType,
  IssueCategoryType,
} from "../types";

describe("report-generator", () => {
  const mockSession: RecorderSession = {
    id: "rec-test-123",
    startedAt: "2026-10-28T10:00:00.000Z",
    stoppedAt: "2026-10-28T10:01:30.000Z",
    durationMs: 90000,
    routeHistory: ["/", "/projects", "/projects/demo"],
    initialRoute: "/",
    finalRoute: "/projects/demo",
    summary: {
      title: "Inspection false reject on pocket 3",
      description: "When inspecting with threshold 140, pocket 3 fails unexpectedly.",
      category: IssueCategoryType.InspectionDefect,
      expectedBehavior: "All 4 pockets should pass.",
      actualBehavior: "Pocket 3 failed with score 0.42.",
    },
    screenshots: [
      {
        id: "snap-1",
        title: "Test Snapshot",
        timestamp: "2026-10-28T10:00:45.000Z",
        elapsedMs: 45000,
        dataUrl: "data:image/png;base64,abc",
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
        description: 'User clicked button "Projects"',
        targetComponent: 'button "Projects"',
        selector: "[data-tour='standard-menu-trigger']",
        route: "/",
        hasScreenshot: false,
      },
      {
        id: "evt-2",
        timestamp: "2026-10-28T10:00:20.000Z",
        elapsedMs: 20000,
        actor: RecorderActorType.System,
        eventType: RecorderEventType.StateChange,
        description: "System navigated to /projects",
        targetComponent: "Router",
        selector: "system",
        route: "/projects",
        hasScreenshot: false,
      },
    ],
  };

  it("generates markdown AI instructions with reproduction steps and context", () => {
    const aiDoc = generateAiInstructions(mockSession);

    expect(aiDoc).toContain("# AI Bug Remediation Instructions");
    expect(aiDoc).toContain("Inspection false reject on pocket 3");
    expect(aiDoc).toContain("Pocket 3 failed with score 0.42");
    expect(aiDoc).toContain('User clicked button "Projects"');
  });

  it("generates markdown readme with session stats and file index", () => {
    const readme = generateReadme(mockSession);

    expect(readme).toContain("# CAT-iVISION Bug Report Package");
    expect(readme).toContain("rec-test-123");
    expect(readme).toContain("AI_BUG_REPORT.md");
    expect(readme).toContain("timeline.md");
  });

  it("generates markdown timeline table distinguishing user and system actions", () => {
    const timeline = generateTimelineTable(mockSession.events);

    expect(timeline).toContain(
      "| # | Time | Actor | Event | Component / Target | Description | Screenshot |",
    );
    expect(timeline).toContain("**USER**");
    expect(timeline).toContain("*SYSTEM*");
    expect(timeline).toContain('User clicked button "Projects"');
  });
});
