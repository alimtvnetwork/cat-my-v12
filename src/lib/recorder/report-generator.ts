import type { BugReportSummary, RecorderEvent, RecorderSession } from "./types";

export interface MarkdownReportBundle {
  aiInstructions: string;
  readme: string;
  timeline: string;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function generateAiInstructions(session: RecorderSession): string {
  const summary = session.summary;
  const title = summary?.title || "User Reported Issue";
  const desc = summary?.description || "No description provided.";
  const expected = summary?.expectedBehavior || "App operates without error.";
  const actual = summary?.actualBehavior || "Observed unexpected behavior.";
  const category = summary?.category || "Other";

  return `# AI Bug Remediation Instructions

## 1. Issue Overview
- **Title**: ${title}
- **Category**: ${category}
- **Duration**: ${formatElapsed(session.durationMs)} (${session.events.length} events)
- **Initial Route**: \`${session.initialRoute}\`
- **Final Route**: \`${session.finalRoute}\`

## 2. User Intent & Problem Statement
- **What went wrong**: ${desc}
- **Observed Behavior**: ${actual}
- **Expected Behavior**: ${expected}

## 3. Reproduction Steps (From Activity Recorder)
${session.events
  .filter((e) => e.actor === "user")
  .map(
    (e, idx) => `${idx + 1}. [${formatElapsed(e.elapsedMs)}] ${e.description} (on \`${e.route}\`)`,
  )
  .join("\n")}

## 4. Key AI Diagnostic Guidance
- Review the attached \`timeline.md\` for the interleaved sequence of user and system events.
- Inspect \`vision/inspection-context.json\` for the active project parameters, rules, and tolerances.
- Inspect the captured PNG files in \`screenshots/\` to see the visual state when the issue happened.
- Search the codebase for the selectors/components identified in \`events.json\`.
`;
}

export function generateReadme(session: RecorderSession): string {
  const summary = session.summary;
  const title = summary?.title || "Bug Report";

  return `# CAT-iVISION Bug Report Package

- **Title**: ${title}
- **Session ID**: \`${session.id}\`
- **Recorded At**: ${session.startedAt}
- **Total Duration**: ${formatElapsed(session.durationMs)}
- **Total Events**: ${session.events.length} (${session.events.filter((e) => e.actor === "user").length} user, ${session.events.filter((e) => e.actor === "system").length} system)
- **Screenshots Captured**: ${session.screenshots.length}

## Package Contents
- \`AI_BUG_REPORT.md\`: Self-contained prompt for AI coding assistants to diagnose and fix.
- \`timeline.md\`: Chronological user and system action log.
- \`session.json\`: Session metadata and route history.
- \`events.json\`: Granular action stream.
- \`diagnostics.json\`: Browser, display, and memory environment details.
- \`vision/\`: Active project parameters, inspection rules, and validation results.
- \`screenshots/\`: Captured visual screenshots.
`;
}

export function generateTimelineTable(events: readonly RecorderEvent[]): string {
  const header = `| # | Time | Actor | Event | Component / Target | Description | Screenshot |
|---|---|---|---|---|---|---|`;

  const rows = events.map((e, idx) => {
    const actorBadge = e.actor === "user" ? "**USER**" : "*SYSTEM*";
    const snap = e.hasScreenshot ? `[View](screenshots/${e.screenshotId}.png)` : "-";
    const comp = `\`${e.targetComponent.replace(/\|/g, "\\|")}\``;
    const desc = e.description.replace(/\|/g, "\\|");

    return `| ${idx + 1} | ${formatElapsed(e.elapsedMs)} | ${actorBadge} | ${e.eventType} | ${comp} | ${desc} | ${snap} |`;
  });

  return `# Activity Timeline Log\n\n${header}\n${rows.join("\n")}\n`;
}

export function generateAllMarkdownReports(session: RecorderSession): MarkdownReportBundle {
  return {
    aiInstructions: generateAiInstructions(session),
    readme: generateReadme(session),
    timeline: generateTimelineTable(session.events),
  };
}
