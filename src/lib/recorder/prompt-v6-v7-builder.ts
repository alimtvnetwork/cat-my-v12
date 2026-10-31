import type {
  BugReportSummary,
  CapturedScreenshot,
  ElementTelemetry,
  RecorderEvent,
  RecorderSession,
} from "./types";

export type RecordingSession = RecorderSession;

export enum LetterlyPromptVersion {
  V6 = "V6",
  V7 = "V7",
}

export interface PromptImageRef {
  sequenceNumber: number;
  instanceId: string;
  actionDescriptor: string;
  absolutePath: string;
  relativePath?: string;
  dataUrl?: string;
}

export interface TelemetryStepSummary {
  stepNumber: number;
  elapsedMs: number;
  actionType: string;
  targetComponent: string;
  selector: string;
  xpath?: string;
  coordinates?: { x: number; y: number };
  bounds?: { x: number; y: number; width: number; height: number };
  padding?: { top: string; right: string; bottom: string; left: string };
  margin?: { top: string; right: string; bottom: string; left: string };
  distanceFromEdges?: { top: number; right: number; bottom: number; left: number };
  color?: string;
  backgroundColor?: string;
  springNumber?: number;
  navigationPath?: { fromRoute: string; toRoute: string };
  screenshotRef?: PromptImageRef;
}

export interface SplitDbErrorSummary {
  code?: string;
  message?: string;
  triggerComponent?: string;
  correlationId?: string;
  stackTrace?: string;
  stackTraceSnippet?: string;
}

export interface PromptOptions {
  summary?: BugReportSummary;
  splitDbErrors?: SplitDbErrorSummary[];
  baseDir?: string;
  isTimeRestricted?: boolean;
  targetTimezone?: string;
  botAgentName?: string;
}

export interface BuildPromptParams {
  version: LetterlyPromptVersion;
  session: RecorderSession;
  options?: PromptOptions;
}

function sanitizeIdentifier(text: string): string {
  const sanitized = text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return sanitized || "item";
}

function escapeTableCell(text: string | null | undefined): string {
  if (!text) {
    return "-";
  }

  return text.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ").trim();
}

export function formatIdeImageLink(ref: PromptImageRef): string {
  const seq = String(ref.sequenceNumber).padStart(2, "0");
  const instance = sanitizeIdentifier(ref.instanceId || "inst01");
  const desc = sanitizeIdentifier(ref.actionDescriptor || "snapshot");
  const tagLabel = `${seq}_${instance}_${desc}`;
  const path = ref.absolutePath || ref.relativePath || `${tagLabel}.png`;

  return `[${tagLabel}](file:;${path})`;
}

function formatNonAssetWarning(): string {
  return `> [!CRITICAL]
> **Ephemeral Visual Learning Only (Strict Non-Asset Rule):**
> IMPORTANT: The attached snapshot images are for learning purposes only to understand UI behavior and geometry. NEVER save or commit these images into codebase assets or git repository. Analyze the bug, understand it, formulate your fix, and forget the images. Leave image artifacts strictly in their local binary-adjacent runtime directory (\`.logs/recorded-bugs/<session_id>/\` or \`bug-reports/<seq>-<date>/\`).`;
}

function formatAiComprehensionGate(): string {
  return `> [!IMPORTANT]
> **Mandatory Turn-1 AI Comprehension Gate (Zero Code Edits Without Prior Proof):**
> In your VERY FIRST response turn upon receiving this prompt, you MUST output a comprehensive comprehension block in visible chat before executing any code changes or tool modifications:
> 1. **Visual & Telemetry Diagnosis**: State what you observed across the step sequence, element geometries, and visual diffs.
> 2. **Root Cause Hypothesis**: Articulate why the failure occurred based on the bundled Split-DB errors and DOM state.
> 3. **Exact Remediation Plan**: Detail which source files will be touched and what logic will change.
> 4. **Clarification Protocol**: If any telemetry point or user action is ambiguous, ASK clarifying questions immediately before taking action.
> Code editing is STRICTLY FORBIDDEN until this comprehension block is articulated.`;
}

function formatMandatoryPillars(params: {
  title: string;
  sessionId: string;
  initialRoute: string;
  finalRoute: string;
  eventCount: number;
  screenshotCount: number;
  targetComponents: string[];
}): string {
  const targets = params.targetComponents.length > 0
    ? params.targetComponents.slice(0, 5).join(", ")
    : "Active UI viewports and interactive elements";

  return `### 🧠 Deep Comprehension & Understood Mandate (Phase 1A Turn 1)

#### Pillar 1: Strategic Intent & Systems Reasoning
- Overarching architectural goal: Isolate the root cause of reported defect "${params.title}" in session \`${params.sessionId}\`, rectify faulty component logic or state transitions, and restore verified expected behavior.
- System reasoning: Telemetry reveals interaction sequence from route \`${params.initialRoute}\` to \`${params.finalRoute}\` with ${params.eventCount} user actions and ${params.screenshotCount} snapshots. Downstream event handlers and state slices must be synchronized without introducing regressions.

#### Pillar 2: Explicit Scope Boundaries (In-Scope vs. Excluded / Deferred)
- **In-Scope:** Remediation of failing components identified in telemetry (targets: \`${targets}\`), Split-DB error resolution, and local verification.
- **Excluded / Deferred:** Unrelated routing rewrites, global styling overhauls, or premature external API modifications.

#### Pillar 3: Non-Negotiable Constraints & Negative Guardrails Ingestion
- Ephemeral snapshot invariant: NEVER copy, move, import, or commit diagnostic screenshots into codebase assets (\`assets/\`, \`src/assets/\`, \`public/assets/\`).
- Zero builds & tests: No full build runs (\`go build\`, \`npm run build\`, \`vite build\`) or general test suites (\`pytest\`, \`npm test\`) unless explicitly commanded.
- Strict relative Git paths: All referenced codebase files must use relative paths from repository root.
- GitMap hyphen commit: Single atomic commit using \`gitmap cpf "<module> - <summary>"\`.
- Zero raw searches: Strictly avoid \`rg\`, \`ripgrep\`, \`grep\`, \`Select-String\`.

#### Pillar 4: Blast Radius & Dependency Topology
- Impacted Subsystems: Components and hooks registered under telemetry actions (\`${targets}\`), state stores (\`useRecorderStore\`, \`useErrorStore\`, \`useRulesStore\`), and backend endpoints (\`/bug-reports\`).
- Containment Strategy: Disjoint file modifications with micro-batching (5-8 files), verifying each change without cross-component contamination.

#### Pillar 5: Multi-Agent Concurrency Topology
- Tree Swarm Structure: Lead Orchestrator (Root Node) -> Branch Coordinators (Subtask Owners) -> Leaf Workers & Dynamic Assistants.
- Concurrency Parameters: \`A = 3\` agents, \`H = 2\` hands, System Concurrency Capacity = 6 operations.`;
}

function resolveImageRefs(
  session: RecorderSession,
  baseDir?: string,
): PromptImageRef[] {
  const folder = baseDir || `.logs/recorded-bugs/${session.id}`;

  return session.screenshots.map((snap, idx) => {
    const seq = idx + 1;
    const instance = sanitizeIdentifier(snap.source || "inst01");
    const desc = sanitizeIdentifier(snap.title || `step_${seq}`);
    const fileName = `${String(seq).padStart(2, "0")}_${instance}_${desc}.png`;
    const relPath = `${folder}/screenshots/${fileName}`;

    return {
      sequenceNumber: seq,
      instanceId: instance,
      actionDescriptor: desc,
      absolutePath: relPath,
      relativePath: relPath,
      dataUrl: snap.dataUrl,
    };
  });
}

function formatTelemetryTable(session: RecorderSession, imageRefs: PromptImageRef[]): string {
  if (session.events.length === 0) {
    return "_No user interaction events recorded in this session._";
  }

  const rows = session.events.map((evt, idx) => {
    const stepNum = idx + 1;
    const seq = String(stepNum).padStart(2, "0");
    const elapsed = `${evt.elapsedMs}ms`;
    const actionTarget = `${evt.eventType.toUpperCase()} on \`${escapeTableCell(evt.targetComponent || "N/A")}\``;

    const nav = evt.telemetry?.navigationPath
      ? `${evt.telemetry.navigationPath.fromRoute} -> ${evt.telemetry.navigationPath.toRoute}`
      : `${session.initialRoute} -> ${evt.route || session.finalRoute || session.initialRoute}`;

    const xpathVal = evt.telemetry?.xpath || evt.xpath || (evt.details?.xpath as string) || evt.selector || "-";
    const escapedXpath = `\`${escapeTableCell(xpathVal)}\``;

    let coordsAndDist = "-";

    if (evt.coordinates) {
      coordsAndDist = `(${evt.coordinates.x}, ${evt.coordinates.y})`;
    }

    if (evt.telemetry?.distanceFromEdges) {
      const d = evt.telemetry.distanceFromEdges;
      coordsAndDist += ` [T:${d.top} R:${d.right} B:${d.bottom} L:${d.left}]`;
    }

    let boxAndPad = "-";

    if (evt.telemetry?.boundingRect) {
      const b = evt.telemetry.boundingRect;
      boxAndPad = `${b.width}x${b.height}`;
    }

    if (evt.telemetry?.padding) {
      const p = evt.telemetry.padding;
      boxAndPad += ` (pad: ${p.top}/${p.right}/${p.bottom}/${p.left})`;
    }

    let colors = "-";

    if (evt.telemetry?.componentDetails) {
      const c = evt.telemetry.componentDetails;
      colors = `${c.color || "-"} / ${c.backgroundColor || "-"}`;
    }

    let snapshotLink = "-";

    if (evt.hasScreenshot) {
      const matchedRef = imageRefs.find((r) => r.sequenceNumber === stepNum) || imageRefs[idx];

      if (matchedRef) {
        snapshotLink = formatIdeImageLink(matchedRef);
      }
    }

    return `| ${seq} | ${elapsed} | ${actionTarget} | \`${escapeTableCell(nav)}\` | ${escapedXpath} | ${escapeTableCell(coordsAndDist)} | ${escapeTableCell(boxAndPad)} | ${escapeTableCell(colors)} | ${snapshotLink} |`;
  });

  return [
    "| Step | Elapsed | Action & Target | Navigation | XPath | Coordinates & Distance | Box & Padding | Text / Bg Color | Snapshot Link |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function formatSplitDbErrors(errors?: SplitDbErrorSummary[]): string {
  if (!errors || errors.length === 0) {
    return "> [OK] No runtime or Split-DB errors logged during this recording.";
  }

  const items = errors.slice(0, 10).map((err, idx) => {
    const code = err.code || "E_APP_UNKNOWN";
    const msg = err.message || "Unknown error";
    const comp = err.triggerComponent || "Unspecified";
    const corr = err.correlationId ? ` (Correlation: \`${err.correlationId}\`)` : "";
    const rawStack = err.stackTraceSnippet || err.stackTrace;
    const stack = rawStack ? `\n    Stack: \`${rawStack.split("\n")[0].trim()}\`` : "";

    return `${idx + 1}. [${code}] **${msg}** (Trigger: \`${comp}\`)${corr}${stack}`;
  });

  return items.join("\n");
}

function formatScreenshotsSection(imageRefs: PromptImageRef[]): string {
  if (imageRefs.length === 0) {
    return "> No visual snapshots recorded for this session.";
  }

  const lines = imageRefs.map((ref) => {
    const ideLink = formatIdeImageLink(ref);

    return `- **Snapshot #${String(ref.sequenceNumber).padStart(2, "0")}**: ${ideLink} (Descriptor: \`${ref.actionDescriptor}\`)`;
  });

  return lines.join("\n");
}

export function generateV6LetterlyPrompt(
  session: RecorderSession,
  options?: PromptOptions,
): string {
  const summary = options?.summary || session.summary;
  const title = summary?.title || `Recorded Issue: ${session.id}`;
  const category = summary?.category || "ui_glitch";
  const expected = summary?.expectedBehavior || "Expected normal operation without visual or logical glitches.";
  const actual = summary?.actualBehavior || "Unexpected defect observed during user interaction.";
  const description = summary?.description || "Session recorded with interaction steps and diagnostic evidence.";
  const durationSec = Math.round(session.durationMs / 1000);
  const finalRoute = session.finalRoute || session.initialRoute;

  const targetComponents = Array.from(
    new Set(
      session.events
        .map((e) => e.targetComponent)
        .filter((c): c is string => Boolean(c) && c !== "User Annotation"),
    ),
  );

  const imageRefs = resolveImageRefs(session, options?.baseDir);
  const telemetryTable = formatTelemetryTable(session, imageRefs);
  const effectiveSplitDbErrors =
    options?.splitDbErrors && options.splitDbErrors.length > 0
      ? options.splitDbErrors
      : ((session.errors || []) as SplitDbErrorSummary[]);
  const errorBlock = formatSplitDbErrors(effectiveSplitDbErrors);
  const screenshotsBlock = formatScreenshotsSection(imageRefs);
  const nonAssetWarning = formatNonAssetWarning();
  const comprehensionGate = formatAiComprehensionGate();
  const mandatoryPillars = formatMandatoryPillars({
    title,
    sessionId: session.id,
    initialRoute: session.initialRoute,
    finalRoute,
    eventCount: session.events.length,
    screenshotCount: session.screenshots.length,
    targetComponents,
  });

  const titleSlug = sanitizeIdentifier(title);

  return `# [V6] Bug Remediation & UI Telemetry Diagnostic Task: ${title}

\`\`\`text
N = 400 (Total self-loop steps budget — editable top-header parameter, default: 400)
A = 3   (MANDATORY number of spawned autonomous subagents running concurrently via invoke_subagent, default: 3)
H = 2   (Operational hands per agent: dual-task batch capacity & parallel tool dispatch, default: 2)
C = 30  (Tool calls per worker before it must report, default: 30)

System Concurrency Capacity = A × H = 3 agents × 2 hands = 6 concurrent subtask operations
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
> **Final Route:** \`${finalRoute}\`
>
> **Top-Instruction Priority Mandate (Above Precedence / Preamble Precedence):**
> Whatever directives, constraints, checklists, or user instructions are given ABOVE this prompt (including in the user preamble, header blocks, or incoming user request above) are HIGHEST PRIORITY and MUST BE FOLLOWED as strictly NON-NEGOTIABLE. They supersede and strictly override any conflicting general advice, default conventions, or lower-level guidelines below.

${nonAssetWarning}

${comprehensionGate}

[/goal](slashCommand;goal) Autonomously diagnose, isolate root cause, and resolve the reported bug "${title}" across components observed during session \`${session.id}\`. Author an up-front Brain roadmap in \`.ai-memory/plans/\`, spawn A=3 subagents with H=2 hands (Capacity=6) across disjoint file boundaries, verify fix against the recorded timeline, and finish with one atomic GitMap commit (\`gitmap cpf "<module> - <summary>"\`).

${mandatoryPillars}

### 📋 Verified Task Breakdown (6-Part Schema)
- **Task-01: Root Cause Isolation & Diagnostic Analysis**
  - **Understood / AI Comprehension:** \`[YES]\` — Deep analysis of captured events, element geometries, and error traces.
  - **Azure AI / Model Runtime Context:** N/A — Local CLI/GitMap
  - **Intent & Technical Deliverables:** Isolate failure mechanism in observed UI components.
  - **Scope Boundaries:** Affected UI components vs unaffected parent shells.
  - **Active Constraints:** Non-asset ephemeral learning, zero full builds/tests, relative paths.
  - **Verification Strategy:** Targeted file checks and exit 0 validation.

- **Task-02: Surgical UI & State Remediation**
  - **Understood / AI Comprehension:** \`[YES]\` — Precise bugfix without introducing state regressions.
  - **Azure AI / Model Runtime Context:** N/A — Local CLI/GitMap
  - **Intent & Technical Deliverables:** Apply minimal surgical diff to resolve defect.
  - **Scope Boundaries:** Bounded 5-8 files micro-batch.
  - **Active Constraints:** Positive booleans, compound keys, vertical line gaps.
  - **Verification Strategy:** File-scoped linters and syntax verification.

- **Task-03: Verification, Hygiene & GitMap Atomic Commit**
  - **Understood / AI Comprehension:** \`[YES]\` — Verify zero asset pollution and stage atomic commit.
  - **Azure AI / Model Runtime Context:** N/A — Local CLI/GitMap
  - **Intent & Technical Deliverables:** Finalize changes and execute GitMap commit.
  - **Scope Boundaries:** Modified repository files only.
  - **Active Constraints:** Single atomic hyphen commit, zero raw git commands.
  - **Verification Strategy:** Git diffstat and clean working tree check.

## 1. Incident Overview
- **Session ID**: \`${session.id}\`
- **Category**: \`${category}\`
- **Duration**: ${durationSec}s (${session.durationMs}ms)
- **Initial Route**: \`${session.initialRoute}\`
- **Final Route**: \`${finalRoute}\`
- **Total Events**: ${session.events.length}
- **Total Screenshots**: ${session.screenshots.length}

## 2. Problem Statement
### Description
${description}

### Expected Behavior
${expected}

### Actual Behavior
${actual}

## 3. Visual Evidence & Screenshots (IDE Encapsulation Standard)
All screenshots are encapsulated using IDE file links located adjacent to the runtime binary:
${screenshotsBlock}

## 4. UI Telemetry & Step Action Matrix
${telemetryTable}

## 5. Active Diagnostic Errors (Split-DB SQLite & Runtime)
${errorBlock}

## 6. CLI Verification Command
\`\`\`pwsh
python -m BE.cli.processing.main errors list --session-id ${session.id} --trace
\`\`\`

## 7. Execution Directives
- Commit changes using GitMap atomic hyphen format:
\`\`\`pwsh
gitmap cpf "recorder - fix ${titleSlug}"
\`\`\`
- Ephemeral Visual Invariant: Never save screenshots into \`assets/\` or source tree.
`;
}

export function generateV7LetterlyPrompt(
  session: RecorderSession,
  options?: PromptOptions,
): string {
  const summary = options?.summary || session.summary;
  const title = summary?.title || `Recorded Issue: ${session.id}`;
  const category = summary?.category || "ui_glitch";
  const expected = summary?.expectedBehavior || "Expected normal operation without visual or logical glitches.";
  const actual = summary?.actualBehavior || "Unexpected defect observed during user interaction.";
  const description = summary?.description || "Session recorded with interaction steps and diagnostic evidence.";
  const durationSec = Math.round(session.durationMs / 1000);
  const finalRoute = session.finalRoute || session.initialRoute;
  const routeHistoryStr = session.routeHistory.length > 0
    ? session.routeHistory.join(" -> ")
    : `${session.initialRoute} -> ${finalRoute}`;

  const isTimeRestricted = Boolean(options?.isTimeRestricted);
  const resolvedTimezone = options?.targetTimezone || "UTC";
  const botAgentName = options?.botAgentName || "muse";

  const targetComponents = Array.from(
    new Set(
      session.events
        .map((e) => e.targetComponent)
        .filter((c): c is string => Boolean(c) && c !== "User Annotation"),
    ),
  );

  const imageRefs = resolveImageRefs(session, options?.baseDir);
  const telemetryTable = formatTelemetryTable(session, imageRefs);
  const effectiveSplitDbErrors =
    options?.splitDbErrors && options.splitDbErrors.length > 0
      ? options.splitDbErrors
      : ((session.errors || []) as SplitDbErrorSummary[]);
  const errorBlock = formatSplitDbErrors(effectiveSplitDbErrors);
  const screenshotsBlock = formatScreenshotsSection(imageRefs);
  const nonAssetWarning = formatNonAssetWarning();
  const comprehensionGate = formatAiComprehensionGate();
  const mandatoryPillars = formatMandatoryPillars({
    title,
    sessionId: session.id,
    initialRoute: session.initialRoute,
    finalRoute,
    eventCount: session.events.length,
    screenshotCount: session.screenshots.length,
    targetComponents,
  });

  const titleSlug = sanitizeIdentifier(title);

  const operatingModeName = isTimeRestricted
    ? "Option 1: Time-Restricted Mode (Dynamic Waiting Protocol)"
    : "Option 2: Unrestricted Mode (Continuous Autonomous Loop)";

  const windowPolicyDesc = isTimeRestricted
    ? "Weekday morning window (< 08:00 AM) enforced via --auto-window; weekend 24h unconstrained."
    : "Continuous autonomous loop without time-of-day restriction.";

  return `# [V7] Autonomous Bug Remediation Engine: ${title}

\`\`\`text
N = 400 (Total self-loop steps budget — editable top-header parameter, default: 400)
A = 3   (MANDATORY number of spawned autonomous subagents running concurrently via invoke_subagent, default: 3)
H = 2   (Operational hands per agent: dual-task batch capacity & parallel tool dispatch, default: 2)
C = 30  (Tool calls per worker before it must report, default: 30)

System Concurrency Capacity = A × H = 3 agents × 2 hands = 6 concurrent subtask operations
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
> **Session ID:** \`${session.id}\`
> **Target Issue:** ${title}
>
> **Top-Instruction Priority Mandate (Above Precedence / Preamble Precedence):**
> Whatever directives, constraints, checklists, or user instructions are given ABOVE this prompt (including in the user preamble, header blocks, or incoming user request above) are HIGHEST PRIORITY and MUST BE FOLLOWED as strictly NON-NEGOTIABLE. They supersede and strictly override any conflicting general advice, default conventions, or lower-level guidelines below.

${nonAssetWarning}

${comprehensionGate}

## 🌟 Operating Mode Configuration
- **Active Mode**: ${operatingModeName} (\`isTimeRestricted: ${isTimeRestricted}\`)
- **Timezone Hierarchy**: CLI flag \`--tz\` -> Preamble -> Split-DB \`commit_timezone\` -> Host local (\`${resolvedTimezone}\`)
- **Window Policy**: ${windowPolicyDesc}
- **AI Automation Bot Persona**: \`gitmap automation bot - ${botAgentName} - runs autonomously <info@rgitmap.com>\`

[/goal](slashCommand;goal) Autonomously orchestrate and execute the bug remediation for "${title}" end-to-end: Enforce AI bot author identity (\`gitmap automation bot - ${botAgentName} - runs autonomously <info@rgitmap.com>\`), spawn A=3 subagents with H=2 hands (Capacity=6) across disjoint file boxes using GitMap telemetry as primary, enforce coding guidelines to 100%, and finish with one atomic GitMap commit (\`gitmap cpf "<module> - <summary>"\`).

${mandatoryPillars}

### 📋 Verified Task Breakdown (6-Part Schema)
- **Task-01: Root Cause Isolation & Telemetry Verification**
  - **Understood / AI Comprehension:** \`[YES]\` — Systematic analysis of route transitions, DOM metrics, and Split-DB logs.
  - **Azure AI / Model Runtime Context:** N/A — Local CLI/GitMap
  - **Intent & Technical Deliverables:** Pinpoint failure mechanism across observed components.
  - **Scope Boundaries:** Targeted components vs untouched systems.
  - **Active Constraints:** Non-asset ephemeral learning, zero full builds/tests, relative paths.
  - **Verification Strategy:** File-scoped linters and exit 0 telemetry commands.

- **Task-02: Surgical UI & State Remediation**
  - **Understood / AI Comprehension:** \`[YES]\` — Apply minimal surgical fix adhering to positive booleans and compound keys.
  - **Azure AI / Model Runtime Context:** N/A — Local CLI/GitMap
  - **Intent & Technical Deliverables:** Apply clean fix resolving the defect.
  - **Scope Boundaries:** Micro-batch of 5-8 files.
  - **Active Constraints:** Zero asset pollution, positive booleans, vertical line gaps.
  - **Verification Strategy:** Fast file-scoped syntax and linter checks.

- **Task-03: Verification, Telemetry & GitMap Atomic Commit**
  - **Understood / AI Comprehension:** \`[YES]\` — Finalize changes and execute GitMap commit under bot identity.
  - **Azure AI / Model Runtime Context:** N/A — Local CLI/GitMap
  - **Intent & Technical Deliverables:** Atomic hyphen commit via GitMap.
  - **Scope Boundaries:** Modified repository files only.
  - **Active Constraints:** GitMap cpf format with hyphen, no colons in message argument.
  - **Verification Strategy:** GitMap status and clean working tree.

## 1. Incident Overview
- **Session ID**: \`${session.id}\`
- **Category**: \`${category}\`
- **Initial Route**: \`${session.initialRoute}\`
- **Final Route**: \`${finalRoute}\`
- **Route Transitions**: \`${routeHistoryStr}\`
- **Duration**: ${durationSec}s (${session.durationMs}ms)
- **Recorded Events**: ${session.events.length}
- **Captured Screenshots**: ${session.screenshots.length}

## 2. Problem Statement
### Description
${description}

### Expected vs. Actual
- **Expected**: ${expected}
- **Actual**: ${actual}

## 3. Visual Evidence (IDE Encapsulation Standard)
All screenshots are encapsulated using IDE file links located adjacent to the runtime binary:
${screenshotsBlock}

## 4. UI Telemetry & Step Action Matrix
${telemetryTable}

## 5. Active Diagnostic Errors (Split-DB SQLite & Runtime)
${errorBlock}

## 6. CLI Diagnostics & Telemetry Commands
\`\`\`pwsh
python -m BE.cli.processing.main errors list --session-id ${session.id} --trace
gitmap pe -t
\`\`\`

## 7. GitMap Atomic Commit Directive
Finish with one hyphen-separated atomic commit:
\`\`\`pwsh
gitmap cpf "recorder - resolve ${titleSlug}"
\`\`\`
`;
}

// Aliases for compatibility
export const buildV6LetterlyPrompt = generateV6LetterlyPrompt;
export const buildV7LetterlyPrompt = generateV7LetterlyPrompt;
export const buildV6Prompt = (params: {
  session: RecorderSession;
  summary?: BugReportSummary;
  splitDbErrors?: SplitDbErrorSummary[];
  baseDir?: string;
}): string => generateV6LetterlyPrompt(params.session, {
  summary: params.summary,
  splitDbErrors: params.splitDbErrors,
  baseDir: params.baseDir,
});
export const buildV7Prompt = (params: {
  session: RecorderSession;
  summary?: BugReportSummary;
  splitDbErrors?: SplitDbErrorSummary[];
  baseDir?: string;
}): string => generateV7LetterlyPrompt(params.session, {
  summary: params.summary,
  splitDbErrors: params.splitDbErrors,
  baseDir: params.baseDir,
});
