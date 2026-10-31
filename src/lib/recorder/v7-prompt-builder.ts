import type { BugReportSummary, RecorderSession } from "./types";
import type { PromptBuilderParams, SplitDbErrorEntry } from "./v6-prompt-builder";

function sanitizeIdentifier(text: string): string {
  const sanitized = text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return sanitized || "item";
}

function formatScreenshotLink(
  snapTitle: string,
  index: number,
  eventType: string,
  sessionId: string,
  baseDir?: string,
): string {
  const seq = String(index + 1).padStart(2, "0");
  const instance = sanitizeIdentifier(eventType || "snap");
  const desc = sanitizeIdentifier(snapTitle || `step_${seq}`);
  const safeFileName = `${seq}_${instance}_${desc}.png`;
  const folder = baseDir || `.logs/recorded-bugs/${sessionId}`;
  const relativePath = `${folder}/screenshots/${safeFileName}`;

  return `[${seq}-${instance}-${desc}](file;${relativePath})`;
}

export function buildV7Prompt(params: PromptBuilderParams): string {
  const { session, summary, splitDbErrors = [], baseDir } = params;
  const effectiveSplitDbErrors =
    splitDbErrors.length > 0 ? splitDbErrors : ((session.errors || []) as SplitDbErrorEntry[]);
  const title = summary?.title || `Recorded Issue: ${session.id}`;
  const category = summary?.category || "ui_glitch";
  const expected = summary?.expectedBehavior || "N/A";
  const actual = summary?.actualBehavior || "N/A";
  const description = summary?.description || "N/A";
  const durationSec = Math.round(session.durationMs / 1000);
  const routeHistoryStr = session.routeHistory.join(" ➔ ");

  const timelineItems = session.events.map((evt, idx) => {
    const seq = String(idx + 1).padStart(2, "0");
    const elapsed = `${evt.elapsedMs}ms`;
    const xpath = (evt.details?.xpath as string) || evt.selector || "N/A";
    const coords = evt.coordinates
      ? `(${evt.coordinates.x}, ${evt.coordinates.y})`
      : "N/A";
    const bbox = evt.details?.boundingBox
      ? JSON.stringify(evt.details.boundingBox)
      : "N/A";
    const styles = evt.details?.styles
      ? JSON.stringify(evt.details.styles, null, 2)
      : null;

    const screenshotRef = evt.hasScreenshot
      ? `Evidence: ${formatScreenshotLink(
          evt.description || `event_${seq}`,
          idx,
          evt.eventType,
          session.id,
          baseDir,
        )}`
      : "Evidence: None";

    return `### [Step ${seq}] ${evt.eventType.toUpperCase()} by ${evt.actor} (${elapsed})
- **Target Component**: \`${evt.targetComponent}\`
- **XPath / Selector**: \`${xpath}\`
- **Coordinates**: \`${coords}\`
- **Bounding Box**: \`${bbox}\`
- **Route**: \`${evt.route}\`
- **Description**: ${evt.description}
- **${screenshotRef}**
${styles ? `\`\`\`json\n// Computed Styles:\n${styles}\n\`\`\`` : ""}`;
  });

  const timelineSection =
    timelineItems.length > 0
      ? timelineItems.join("\n\n")
      : "_No chronological events recorded in this session._";

  const screenshotReferences = session.screenshots.map((snap, idx) => {
    const link = formatScreenshotLink(
      snap.title,
      idx,
      snap.source || "snap",
      session.id,
      baseDir,
    );

    return `- Snapshot #${String(idx + 1).padStart(2, "0")}: ${link} [${snap.source}, +${snap.elapsedMs}ms]`;
  });

  const screenshotList =
    screenshotReferences.length > 0
      ? screenshotReferences.join("\n")
      : "_No visual screenshots recorded._";

  const errorItems = effectiveSplitDbErrors.slice(0, 10).map((err) => {
    const code = err.code || "E_APP_UNKNOWN";
    const msg = err.message || "Unknown error";
    const comp = err.triggerComponent || "Unspecified";
    const stack = err.stackTrace ? `\n    ${err.stackTrace.split("\n")[0]}` : "";

    return `- [${code}] **${msg}** (Trigger: \`${comp}\`)${stack}`;
  });

  const errorBlock =
    errorItems.length > 0
      ? errorItems.join("\n")
      : "_No Split-DB errors logged during recording session._";

  return `# [V7 Bug Remediation] ${title}

\`\`\`text
N = 400 (Total self-loop steps budget — editable top-header parameter, default: 400)
A = 3   (MANDATORY number of spawned autonomous subagents running concurrently via invoke_subagent, default: 3)
H = 2   (Operational hands per agent: dual-task batch capacity & parallel tool dispatch, default: 2)
C = 30  (Tool calls per worker before it must report, default: 30)

System Concurrency Capacity = A × H = 3 agents × 2 hands = 6 concurrent subtask operations (Capacity = 6)
Tree Hierarchy = Lead Orchestrator (Root Node) -> Branch Coordinators (Subtask Owners) -> Leaf Workers & Dynamic Joining Assistants
PHASE_1_BUDGET = 100     (Steps 1 .. 100: Planning, Discovery Subagents, Up-Front Brain & Roadmap Creation, Lean Subtasks)
PHASE_2_BUDGET = 150     (Steps 101 .. 250: Intermediate Archival, Sanitization, Prerequisite Refactoring, Intermediate Checkpoints)
PHASE_3_BUDGET = 150     (Steps 251 .. 400: Tree Swarm Parallel Execution, Dynamic Join Capacity Saturation, Targeted Quality Linting, Fleet Sync, Atomic Push)
WAVES = ceil(subtasks / (A x H))
\`\`\`

> [!IMPORTANT]
> **Prompt Version:** 7.0.0
> **Runtime:** Google Antigravity 2.0 (IDE and CLI)
> **Canonical Prompt Specification:** \`01-prompts/14-execute/02-execute-parent-task-with-n-steps-v7.md\`
> **Target Issue:** ${title} (\`${session.id}\`)
> **AI Automation Bot Identity:** \`gitmap automation bot - muse - runs autonomously <info@rgitmap.com>\`
>
> > [!IMPORTANT] Never save these diagnostic screenshots inside the codebase or assets/ directory. These artifacts exist strictly in .logs/ for AI diagnosis and ephemeral learning.

### Dual Operating Modes (Select One at Execution Time)
- **Option 1: Time-Restricted Mode (Dynamic Waiting Protocol)**
  - Active timezone awareness: weekday working window check (< 08:00 AM cutoff).
  - Dynamic adaptive ETA sleep: no tight polling loops (\`gitmap pe -t\` telemetry wait).
- **Option 2: Unrestricted Mode (Continuous Autonomous Loop)**
  - Immediate, unbounded multi-agent self-loop execution until 100% green completion.

[/goal](slashCommand;goal) Autonomously orchestrate and execute the bug remediation for "${title}" end-to-end: Enforce AI bot author identity (\`gitmap automation bot - muse - runs autonomously <info@rgitmap.com>\`), spawn A=3 subagents with H=2 hands (Capacity=6) across disjoint file boxes using GitMap telemetry as primary, enforce coding guidelines to 100%, and finish with one atomic GitMap commit (\`gitmap cpf "<module> - <summary>"\`).

## Executive Summary & Session Telemetry
- **Title**: ${title}
- **Category**: ${category}
- **Session ID**: \`${session.id}\`
- **Initial Route**: \`${session.initialRoute}\`
- **Final Route**: \`${session.finalRoute || session.initialRoute}\`
- **Route Transitions**: ${routeHistoryStr}
- **Duration**: ${durationSec}s
- **Recorded Events**: ${session.events.length}
- **Captured Screenshots**: ${session.screenshots.length}

### Expected Behavior
${expected}

### Actual Behavior
${actual}

### Description
${description}

## GitMap Telemetry & DOM Metrics
- **Viewport Dimension**: \`${typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "N/A"}\`
- **Device Pixel Ratio**: \`${typeof window !== "undefined" ? window.devicePixelRatio : 1}\`
- **User Agent**: \`${typeof navigator !== "undefined" ? navigator.userAgent : "Node/CLI Environment"}\`

## Chronological Event Timeline & Telemetry Breakdown
${timelineSection}

## Diagnostic Split-DB Error Traces & RCA Gate
${errorBlock}

## Screenshot Evidence & Local Artifact References
${screenshotList}

## GitMap Atomic Commit Directive
Finish with one hyphen-separated atomic commit:
\`\`\`pwsh
gitmap cpf "recorder - resolve ${sanitizeIdentifier(title)}"
\`\`\`

## CLI Inspection & Telemetry Commands
\`\`\`pwsh
python -m BE.cli.processing.main errors list --session-id ${session.id} --trace
gitmap pe -t
\`\`\`
`;
}
