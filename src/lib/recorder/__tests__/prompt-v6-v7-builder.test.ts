import { describe, it, expect } from "vitest";
import {
  generateV6LetterlyPrompt,
  generateV7LetterlyPrompt,
  formatRouteNavigationPath,
  formatDiagnosticEvidenceLink,
  sanitizeSlug,
} from "../prompt-v6-v7-builder";
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

describe("Letterly Prompt Utilities", () => {
  it("formats directional navigation route path with arrows", () => {
    expect(formatRouteNavigationPath(["/a", "/b", "/c"])).toBe("From /a -> /b -> /c");
    expect(formatRouteNavigationPath(["/inspection"])).toBe("From /inspection");
    expect(formatRouteNavigationPath([])).toBe("From /");
  });

  it("sanitizes slugs removing leading sequence numbers and punctuation", () => {
    expect(sanitizeSlug("Button Visual Distortion")).toBe("button-visual-distortion");
    expect(sanitizeSlug("03-authentic-letterly-prompt-engine")).toBe("authentic-letterly-prompt-engine");
    expect(sanitizeSlug("12_Bug Fix in Dialog!")).toBe("bug-fix-in-dialog");
  });

  it("formats diagnostic screenshot link with relative paths strictly into .logs/", () => {
    const link = formatDiagnosticEvidenceLink(
      "user_clicked_run_test_button",
      0,
      "click",
      "rec-test-123",
    );

    expect(link).toBe(
      "[01-click-user_clicked_run_test_button](file;.logs/recorded-bugs/rec-test-123/screenshots/01_click_user_clicked_run_test_button.png)",
    );
  });
});

describe("V6 Letterly Prompt Generation", () => {
  it("generates authentic V6 Letterly format conforming to 01-prompts/22-letterly/03-execute-n-steps-letterly.md", () => {
    const prompt = generateV6LetterlyPrompt(mockSession, {
      summary: mockSession.summary,
      splitDbErrors: mockErrors,
    });

    expect(prompt).toContain("# Button Visual Distortion: high priority instruction, non-negotiable task");
    expect(prompt).toContain("**Navigation Path:** From /projects/alpha -> /projects/beta");
    expect(prompt).toContain("## task: Button Visual Distortion");
    expect(prompt).toContain("## slug: button-visual-distortion");
    expect(prompt).toContain("# Actionable Items Must Follow Non-Negotiable");
    expect(prompt).toContain("Git pull BEFORE starting any work");
    expect(prompt).toContain("Write spec under 02-spec/21-app/XX-button-visual-distortion/");
    expect(prompt).toContain("Search codebase exclusively via GitMap");
    expect(prompt).toContain("Strictly use relative Git paths");
    expect(prompt).toContain("IMPORTANT: The attached snapshot images are for learning purposes only to understand UI behavior and geometry. NEVER save, copy, move, or commit snapshot images into codebase assets (assets/, src/assets/, public/assets/). Leave image artifacts strictly in runtime logs (.logs/recorded-bugs/rec-test-123/). Analyze the bug, formulate your fix, and discard/forget the images.");
    expect(prompt).toContain("Enforce SQL repository pattern and enum-driven actions");
    expect(prompt).toContain("## Must follow and spawn agent using");
    expect(prompt).toContain("@[execute-parent-task-with-n-steps-v6](file;.agents/skills/execute-parent-task-with-n-steps-v6)");
    expect(prompt).toContain("## Additional Instructions");
    expect(prompt).toContain("[/plan](slashCommand;plan)");
    expect(prompt).toContain("[/learn](slashCommand;learn) from @[gitmap](file;.agents/skills/gitmap)");
    expect(prompt).toContain("gitmap cpf \"recorder - resolve button-visual-distortion\"");
    expect(prompt).not.toContain("```markdown");
  });
});

describe("V7 Letterly Prompt Generation", () => {
  it("generates authentic V7 Letterly format conforming to 01-prompts/22-letterly/14-execute-recommit-time-restricted-letterly.md", () => {
    const prompt = generateV7LetterlyPrompt(mockSession, {
      summary: mockSession.summary,
      splitDbErrors: mockErrors,
      isTimeRestricted: true,
      targetTimezone: "Asia/Singapore",
      botAgentName: "muse",
    });

    expect(prompt).toContain("# Button Visual Distortion: high priority instruction, non-negotiable task");
    expect(prompt).toContain("**Navigation Path:** From /projects/alpha -> /projects/beta");
    expect(prompt).toContain("## task: Button Visual Distortion");
    expect(prompt).toContain("## slug: button-visual-distortion");
    expect(prompt).toContain("# Actionable Items Must Follow Non-Negotiable");
    expect(prompt).toContain("Execute via V7 Master Engine per @[execute-parent-task-with-n-steps-v7]");
    expect(prompt).toContain("Enforce time-restricted recommits per @[gitmap-time-restriction]");
    expect(prompt).toContain("gitmap automation bot - muse - runs autonomously <info@rgitmap.com>");
    expect(prompt).toContain("Option 1: Time-Restricted Mode");
    expect(prompt).toContain("Asia/Singapore");
    expect(prompt).toContain("## Must follow and spawn agent using");
    expect(prompt).toContain("@[execute-parent-task-with-n-steps-v7](file;.agents/skills/execute-parent-task-with-n-steps-v7)");
    expect(prompt).toContain("## Additional Instructions");
    expect(prompt).not.toContain("```markdown");
  });
});
