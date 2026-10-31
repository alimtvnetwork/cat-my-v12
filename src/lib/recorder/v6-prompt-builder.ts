import type { BugReportSummary, RecorderEvent, RecorderSession } from "./types";

export interface SplitDbErrorEntry {
  code?: string;
  message?: string;
  triggerComponent?: string;
  stackTrace?: string;
}

export interface PromptBuilderParams {
  session: RecorderSession;
  summary?: BugReportSummary;
  splitDbErrors?: SplitDbErrorEntry[];
  baseDir?: string;
}

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

export function buildV6Prompt(params: PromptBuilderParams): string {
  const { session, summary, splitDbErrors = [], baseDir } = params;
  const effectiveSplitDbErrors =
    splitDbErrors.length > 0 ? splitDbErrors : ((session.errors || []) as SplitDbErrorEntry[]);
  const title = summary?.title || `Recorded Issue: ${session.id}`;
  const category = summary?.category || "ui_glitch";
  const expected = summary?.expectedBehavior || "N/A";
  const actual = summary?.actualBehavior || "N/A";
  const description = summary?.description || "N/A";
  const durationSec = Math.round(session.durationMs / 1000);

  const eventTableRows = session.events.map((evt, idx) => {
    const seq = String(idx + 1).padStart(2, "0");
    const elapsed = `${evt.elapsedMs}ms`;
    const actor = evt.actor;
    const eventType = evt.eventType;
    const target = (evt.targetComponent || "N/A").replace(/\|/g, "\\|");
    const selectorOrXpath = (
      (evt.details?.xpath as string) ||
      evt.selector ||
      "N/A"
    ).replace(/\|/g, "\\|");
    const coords = evt.coordinates
      ? `(${evt.coordinates.x}, ${evt.coordinates.y})`
      : "-";

    const styleSnippet = evt.details?.styles
      ? JSON.stringify(evt.details.styles).slice(0, 30)
      : "-";

    const screenshotRef = evt.hasScreenshot
      ? formatScreenshotLink(
          evt.description || `event_${seq}`,
          idx,
          evt.eventType,
          session.id,
          baseDir,
        )
      : "-";

    return `| ${seq} | ${elapsed} | ${actor} | ${eventType} | ${target} | \`${selectorOrXpath}\` | ${coords} | ${styleSnippet} | ${screenshotRef} |`;
  });

  const sequentialTable =
    eventTableRows.length > 0
      ? [
          "| # | Elapsed | Actor | Event | Target Component | Selector / XPath | Coords | Styles / Telemetry | Diagnostic Evidence |",
          "|---|---|---|---|---|---|---|---|---|",
          ...eventTableRows,
        ].join("\n")
      : "_No events captured in timeline._";

  const screenshotReferences = session.screenshots.map((snap, idx) => {
    const link = formatScreenshotLink(
      snap.title,
      idx,
      snap.source || "snap",
      session.id,
      baseDir,
    );

    return `- **Snapshot #${String(idx + 1).padStart(2, "0")}**: ${link} (Source: \`${snap.source}\`, Elapsed: ${snap.elapsedMs}ms)`;
  });

  const screenshotList =
    screenshotReferences.length > 0
      ? screenshotReferences.join("\n")
      : "_No visual screenshots recorded._";

  const errorItems = effectiveSplitDbErrors.slice(0, 8).map((err) => {
    const code = err.code || "E_APP_UNKNOWN";
    const msg = err.message || "Unknown error";
    const comp = err.triggerComponent || "Unspecified";
    const stack = err.stackTrace ? `\n    Stack: ${err.stackTrace.split("\n")[0]}` : "";

    return `- [${code}] **${msg}** (Trigger: \`${comp}\`)${stack}`;
  });

  const errorBlock =
    errorItems.length > 0
      ? errorItems.join("\n")
      : "_No Split-DB errors logged during recording session._";

  const telemetryStyles = session.events
    .filter((e) => e.details?.styles || e.details?.xpath || e.details?.boundingBox)
    .slice(0, 10)
    .map((e, idx) => {
      const xpath = (e.details?.xpath as string) || e.selector;
      const styles = e.details?.styles ? JSON.stringify(e.details.styles, null, 2) : "N/A";
      const bbox = e.details?.boundingBox ? JSON.stringify(e.details.boundingBox) : "N/A";

      return `#### Event #${idx + 1}: ${e.eventType} on \`${e.targetComponent}\`
- **XPath**: \`${xpath}\`
- **Bounding Box**: \`${bbox}\`
- **CSS Computed Styles**:
\`\`\`json
${styles}
\`\`\``;
    })
    .join("\n\n");

  const telemetrySection =
    telemetryStyles.length > 0
      ? telemetryStyles
      : "_No deep DOM telemetry attributes recorded._";

  return `# [V6 Bug Remediation] ${title}

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
> **Prompt Version:** 6.0.0
> **Runtime:** Google Antigravity 2.0 (IDE and CLI)
> **Canonical Prompt Specification:** \`01-prompts/14-execute/02-execute-parent-task-with-n-steps-v6.md\`
> **Session ID:** \`${session.id}\`
> **Category:** \`${category}\`
> **Initial Route:** \`${session.initialRoute}\`
> **Final Route:** \`${session.finalRoute || session.initialRoute}\`
>
> > [!IMPORTANT] Never save these diagnostic screenshots inside the codebase or assets/ directory. These artifacts exist strictly in .logs/ for AI diagnosis and ephemeral learning.

[/goal](slashCommand;goal) Autonomously diagnose, isolate root cause, and resolve the reported bug "${title}" across components observed during session \`${session.id}\`. Author an up-front Brain roadmap in \`.ai-memory/plans/\`, spawn A=3 subagents with H=2 hands (Capacity=6) across disjoint file boundaries, verify fix against the recorded timeline, and finish with one atomic GitMap commit (\`gitmap cpf "<module> - <summary>"\`).

## Executive Summary
- **Title**: ${title}
- **Category**: ${category}
- **Session Duration**: ${durationSec}s
- **Events Captured**: ${session.events.length}
- **Diagnostic Screenshots**: ${session.screenshots.length}

### Expected Behavior
${expected}

### Actual Behavior
${actual}

### Description
${description}

## Brain Roadmap & Subtask Allocation (Tree Swarm A=3, H=2, Capacity=6)
1. **Worker 1 (Lead Discovery & Root Cause Analysis)**: Inspect event timeline, reproduce issue against DOM metrics, and trace Split-DB errors.
2. **Worker 2 (Core Logic & UI Remediation)**: Surgical code fix in affected components without introducing regressions.
3. **Worker 3 (Verification & Hygiene)**: Re-verify against recorded timeline, check style tokens, ensure zero asset pollution, and prepare GitMap commit.

## Sequential Event Timeline
${sequentialTable}

## CSS Computed Styles, Metrics & XPaths
${telemetrySection}

## Diagnostic Split-DB Error Traces
${errorBlock}

## Diagnostic Screenshots & Artifact References
${screenshotList}

## GitMap Atomic Commit Directive
Finish with one hyphen-separated atomic commit:
\`\`\`pwsh
gitmap cpf "recorder - resolve ${sanitizeIdentifier(title)}"
\`\`\`

## CLI Inspection Command
\`\`\`pwsh
python -m BE.cli.processing.main errors list --session-id ${session.id} --trace
\`\`\`
`;
}
