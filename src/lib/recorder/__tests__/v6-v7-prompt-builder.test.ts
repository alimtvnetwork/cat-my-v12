import { describe, it, expect } from "vitest";
import { buildV6Prompt } from "../v6-prompt-builder";
import { buildV7Prompt } from "../v7-prompt-builder";
import {
  IssueCategoryType,
  RecorderActorType,
  RecorderEventType,
  type RecorderSession,
} from "../types";

const mockSession: RecorderSession = {
  id: "rec-test-123",
  startedAt: "2026-10-31T12:00:00.000Z",
  durationMs: 45000,
  initialRoute: "/projects/alpha",
  finalRoute: "/projects/beta",
  routeHistory: ["/projects/alpha", "/projects/beta"],
  events: [
    {
      id: "evt-1",
      timestamp: "2026-10-31T12:00:10.000Z",
      elapsedMs: 10000,
      actor: RecorderActorType.User,
      eventType: RecorderEventType.Click,
      description: "User clicked Run Test button",
      targetComponent: "Button Run Test",
      selector: "[data-testid='btn-run']",
      route: "/projects/alpha",
      hasScreenshot: true,
      coordinates: { x: 120, y: 340 },
      details: {
        xpath: "/html/body/div[1]/button",
        styles: { color: "rgb(255, 255, 255)", background: "rgb(16, 185, 129)" },
        boundingBox: { x: 100, y: 320, width: 80, height: 36 },
      },
    },
  ],
  screenshots: [
    {
      id: "snap-1",
      title: "Run Test Clicked",
      timestamp: "2026-10-31T12:00:10.000Z",
      elapsedMs: 10000,
      dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      source: "manual",
    },
  ],
  summary: {
    title: "Button Visual Distortion",
    description: "Button shifts 5px to the left upon clicking",
    category: IssueCategoryType.UiGlitch,
    expectedBehavior: "Button remains in fixed position",
    actualBehavior: "Button shifts abruptly",
  },
};

const mockErrors = [
  {
    code: "E_TASK_RENDER_FAIL",
    message: "Canvas context lost during simulation",
    triggerComponent: "VisionCanvas",
    stackTrace: "Error: Canvas context lost\n  at VisionCanvas.render",
  },
];

describe("V6 Letterly Prompt Builder", () => {
  it("generates V6 prompt conforming to Tree Swarm Hierarchy, Brain roadmap, and disclaimer", () => {
    const prompt = buildV6Prompt({
      session: mockSession,
      summary: mockSession.summary,
      splitDbErrors: mockErrors,
    });

    expect(prompt).toContain("# [V6 Bug Remediation] Button Visual Distortion");
    expect(prompt).toContain("A = 3");
    expect(prompt).toContain("H = 2");
    expect(prompt).toContain("Capacity = 6");
    expect(prompt).toContain("Brain Roadmap & Subtask Allocation");
    expect(prompt).toContain("Tree Swarm");
    expect(prompt).toContain("Never save these diagnostic screenshots inside the codebase or assets/ directory");
    expect(prompt).toContain(".logs/ for AI diagnosis and ephemeral learning");
    expect(prompt).toContain("gitmap cpf");
    expect(prompt).toContain("[01-click-user_clicked_run_test_button](file;.logs/recorded-bugs/rec-test-123/screenshots/01_click_user_clicked_run_test_button.png)");
    expect(prompt).toContain("E_TASK_RENDER_FAIL");
    expect(prompt).toContain("Canvas context lost during simulation");
  });
});

describe("V7 Letterly Prompt Builder", () => {
  it("generates V7 prompt conforming to dual modes, AI bot identity, and DOM metrics", () => {
    const prompt = buildV7Prompt({
      session: mockSession,
      summary: mockSession.summary,
      splitDbErrors: mockErrors,
    });

    expect(prompt).toContain("# [V7 Bug Remediation] Button Visual Distortion");
    expect(prompt).toContain("Prompt Version:** 7.0.0");
    expect(prompt).toContain("gitmap automation bot - muse - runs autonomously <info@rgitmap.com>");
    expect(prompt).toContain("Option 1: Time-Restricted Mode");
    expect(prompt).toContain("Option 2: Unrestricted Mode");
    expect(prompt).toContain("GitMap Telemetry & DOM Metrics");
    expect(prompt).toContain("Chronological Event Timeline & Telemetry Breakdown");
    expect(prompt).toContain("Never save these diagnostic screenshots inside the codebase or assets/ directory");
    expect(prompt).toContain("gitmap cpf");
    expect(prompt).toContain("gitmap pe -t");
  });
});
