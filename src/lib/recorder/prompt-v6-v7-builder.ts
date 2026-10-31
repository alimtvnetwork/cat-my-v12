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

export interface SplitDbErrorEntry {
  code?: string;
  message?: string;
  triggerComponent?: string;
  correlationId?: string;
  stackTrace?: string;
  stackTraceSnippet?: string;
}

export type SplitDbErrorSummary = SplitDbErrorEntry;

export interface LetterlyPromptOptions {
  summary?: BugReportSummary;
  splitDbErrors?: SplitDbErrorEntry[];
  baseDir?: string;
  isTimeRestricted?: boolean;
  targetTimezone?: string;
  botAgentName?: string;
}

export type PromptOptions = LetterlyPromptOptions;

export interface PromptBuilderParams {
  session: RecorderSession;
  options?: LetterlyPromptOptions;
  summary?: BugReportSummary;
  splitDbErrors?: SplitDbErrorEntry[];
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

export function sanitizeIdentifier(text: string): string {
  const sanitized = text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return sanitized || "item";
}

export function sanitizeSlug(title: string): string {
  const withoutPrefix = title
    .toLowerCase()
    .replace(/^(\d{1,3}[-_.\s]+)+/, "");

  const cleaned = withoutPrefix
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return cleaned || "task";
}

export function formatRouteNavigationPath(routes: readonly string[]): string {
  if (!routes || routes.length === 0) {
    return "From /";
  }

  const filtered = routes.filter((r) => Boolean(r && r.trim()));

  if (filtered.length === 0) {
    return "From /";
  }

  if (filtered.length === 1) {
    return `From ${filtered[0]}`;
  }

  return `From ${filtered.join(" -> ")}`;
}

export function formatDiagnosticEvidenceLink(
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

export function formatIdeImageLink(ref: PromptImageRef): string {
  const seq = String(ref.sequenceNumber).padStart(2, "0");
  const instance = sanitizeIdentifier(ref.instanceId || "inst01");
  const desc = sanitizeIdentifier(ref.actionDescriptor || "snapshot");
  const tagLabel = `${seq}-${instance}-${desc}`;
  const path = ref.relativePath || ref.absolutePath || `${tagLabel}.png`;

  return `[${tagLabel}](file;${path})`;
}

export function resolveImageRefs(
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

function escapeTableCell(text: string | null | undefined): string {
  if (!text) {
    return "-";
  }

  return text.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ").trim();
}

export function formatTelemetryTable(
  session: RecorderSession,
  imageRefs: PromptImageRef[],
  baseDir?: string,
): string {
  if (session.events.length === 0) {
    return "_No user interaction events recorded in this session._";
  }

  const rows = session.events.map((evt, idx) => {
    const stepNum = idx + 1;
    const seq = String(stepNum).padStart(2, "0");
    const elapsed = `${evt.elapsedMs}ms`;
    const targetComp = escapeTableCell(evt.targetComponent || "N/A");
    const actionTarget = `${evt.eventType.toUpperCase()} on \`${targetComp}\``;

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
      } else {
        snapshotLink = formatDiagnosticEvidenceLink(
          evt.description || `event_${seq}`,
          idx,
          evt.eventType,
          session.id,
          baseDir,
        );
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

export function formatSplitDbErrors(errors?: SplitDbErrorEntry[]): string {
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

export function formatScreenshotsSection(imageRefs: PromptImageRef[]): string {
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
  options?: LetterlyPromptOptions,
): string {
  const summary = options?.summary || session.summary;
  const title = summary?.title || `Recorded Issue: ${session.id}`;
  const slug = sanitizeSlug(title);
  const expected = summary?.expectedBehavior || "Expected normal operation without visual or logical glitches.";
  const actual = summary?.actualBehavior || "Unexpected defect observed during user interaction.";
  const description = summary?.description || "Session recorded with interaction steps and diagnostic evidence.";
  const baseDir = options?.baseDir;
  const finalRoute = session.finalRoute || session.initialRoute;

  const routes = session.routeHistory && session.routeHistory.length > 0
    ? session.routeHistory
    : [session.initialRoute, finalRoute];
  const navPath = formatRouteNavigationPath(routes);

  const imageRefs = resolveImageRefs(session, baseDir);
  const telemetryTable = formatTelemetryTable(session, imageRefs, baseDir);
  const effectiveSplitDbErrors =
    options?.splitDbErrors && options.splitDbErrors.length > 0
      ? options.splitDbErrors
      : ((session.errors || []) as SplitDbErrorEntry[]);
  const errorBlock = formatSplitDbErrors(effectiveSplitDbErrors);
  const screenshotsBlock = formatScreenshotsSection(imageRefs);

  const actionableItems: string[] = [
    `1. Git pull BEFORE starting any work — first try \`gitmap pull <repo path>\` (or run \`gitmap pull\` in repository folder); if that fails, fall back to regular \`git pull\` and resolve merge conflicts so the repository is up to date and clean before starting.`,
    `2. Write spec under 02-spec/21-app/XX-${slug}/ and enqueue plan task in .ai-memory/plans/pending/XX-${slug}.md (subtasks in .ai-memory/plans/subtasks/XX-${slug}/) first (XX is sequence 01, 02).`,
    `3. Search codebase exclusively via GitMap (gitmap aum search, gitmap find, gitmap cat, gitmap ps, gitmap py, gitmap llm train); TOTAL BAN on rg, ripgrep, grep, git grep, Select-String.`,
    `4. Strictly use relative Git paths (02-spec/..., .ai-memory/..., src/...); only add relative paths, never add absolute paths during work or on the release page and in release notes.`,
    `5. IMPORTANT: The attached snapshot images are for learning purposes only to understand UI behavior and geometry. NEVER save, copy, move, or commit snapshot images into codebase assets (assets/, src/assets/, public/assets/). Leave image artifacts strictly in runtime logs (.logs/recorded-bugs/${session.id}/). Analyze the bug, formulate your fix, and discard/forget the images.`,
    `6. Enforce SQL repository pattern and enum-driven actions per @[sql-repository-pattern-and-enum-actions](file;.agents/skills/sql-repository-pattern-and-enum-actions): all SQL isolated behind repository interfaces, operations dispatched by exhaustive enum switch with complete util methods (String, Parse, IsValid, All), and strongly-typed AppError envelopes.`,
  ];

  let currentItemIndex = 7;

  session.events.forEach((evt, idx) => {
    const seq = String(idx + 1).padStart(2, "0");
    const elapsed = `+${evt.elapsedMs}ms`;
    const actor = evt.actor;
    const eventType = evt.eventType.toUpperCase();
    const target = evt.targetComponent || "N/A";
    const route = evt.route || session.initialRoute;
    const xpathVal = (evt.telemetry?.xpath || evt.xpath || (evt.details?.xpath as string) || evt.selector || "N/A").replace(/\|/g, "\\|");
    const coordsVal = evt.coordinates ? `(${evt.coordinates.x}, ${evt.coordinates.y})` : "-";
    const evidenceLink = evt.hasScreenshot
      ? formatDiagnosticEvidenceLink(evt.description || `event_${seq}`, idx, evt.eventType, session.id, baseDir)
      : "None";

    let extraDetails = "";

    if (evt.telemetry?.boundingRect) {
      extraDetails += ` Bounds: ${evt.telemetry.boundingRect.width}x${evt.telemetry.boundingRect.height}.`;
    }

    if (evt.telemetry?.componentDetails?.color) {
      extraDetails += ` Color: ${evt.telemetry.componentDetails.color}.`;
    }

    actionableItems.push(
      `${currentItemIndex}. Interaction Step ${seq} (${elapsed}): ${actor} performed ${eventType} on \`${target}\` at route \`${route}\`. XPath: \`${xpathVal}\`. Coords: ${coordsVal}.${extraDetails} Diagnostic Evidence: ${evidenceLink}.`,
    );

    currentItemIndex += 1;
  });

  if (effectiveSplitDbErrors.length > 0) {
    const errSummaries = effectiveSplitDbErrors
      .slice(0, 5)
      .map((e) => `[${e.code || "ERR"}] ${e.message || "Unknown"} (Trigger: ${e.triggerComponent || "N/A"})`)
      .join("; ");

    actionableItems.push(
      `${currentItemIndex}. Resolve active runtime and Split-DB errors recorded during session: ${errSummaries}.`,
    );

    currentItemIndex += 1;
  }

  actionableItems.push(
    `${currentItemIndex}. Commit and finalize all verified fixes atomically via GitMap: \`gitmap cpf "recorder - resolve ${slug}"\`.`,
  );

  return `# ${title}: high priority instruction, non-negotiable task

${description}

**Navigation Path:** ${navPath}
**Observed Behavior:** ${actual}
**Expected Behavior:** ${expected}

## task: ${title}
## slug: ${slug}

# Actionable Items Must Follow Non-Negotiable

${actionableItems.join("\n")}

## Sequential Event Timeline & UI Telemetry

${telemetryTable}

## Visual Evidence & Diagnostic Screenshots

${screenshotsBlock}

## Active Split-DB & Runtime Diagnostics

${errorBlock}

## CLI Telemetry Command

\`\`\`pwsh
python -m BE.cli.processing.main errors list --session-id ${session.id} --trace
\`\`\`

## Must follow and spawn agent using

@[execute-parent-task-with-n-steps-v6](file;.agents/skills/execute-parent-task-with-n-steps-v6)

## Additional Instructions

- [/plan](slashCommand;plan) first before doing work for improved work or less friction, faster execution for AI and coding without errors and following Coding Guidelines.
- [/learn](slashCommand;learn) from @[gitmap](file;.agents/skills/gitmap) skill to leverage GitMap high-speed search, toolchain discovery, and caching.
- Track in-flight file touches and prevent write collisions using GitMap RC Heatmap (\`gitmap rc heatmap status\` / \`gitmap rc heatmap tree\` / \`gitmap rc heatmap live\` / \`gitmap rc heatmap sync\`).
- Only add relative paths, never add absolute paths during work; this must be respected on release page and in release notes as well.
`;
}

export function generateV7LetterlyPrompt(
  session: RecorderSession,
  options?: LetterlyPromptOptions,
): string {
  const summary = options?.summary || session.summary;
  const title = summary?.title || `Recorded Issue: ${session.id}`;
  const slug = sanitizeSlug(title);
  const expected = summary?.expectedBehavior || "Expected normal operation without visual or logical glitches.";
  const actual = summary?.actualBehavior || "Unexpected defect observed during user interaction.";
  const description = summary?.description || "Session recorded with interaction steps and diagnostic evidence.";
  const baseDir = options?.baseDir;
  const finalRoute = session.finalRoute || session.initialRoute;

  const isTimeRestricted = Boolean(options?.isTimeRestricted);
  const resolvedTimezone = options?.targetTimezone || "UTC";
  const botAgentName = options?.botAgentName || "muse";

  const routes = session.routeHistory && session.routeHistory.length > 0
    ? session.routeHistory
    : [session.initialRoute, finalRoute];
  const navPath = formatRouteNavigationPath(routes);

  const imageRefs = resolveImageRefs(session, baseDir);
  const telemetryTable = formatTelemetryTable(session, imageRefs, baseDir);
  const effectiveSplitDbErrors =
    options?.splitDbErrors && options.splitDbErrors.length > 0
      ? options.splitDbErrors
      : ((session.errors || []) as SplitDbErrorEntry[]);
  const errorBlock = formatSplitDbErrors(effectiveSplitDbErrors);
  const screenshotsBlock = formatScreenshotsSection(imageRefs);

  const operatingModeName = isTimeRestricted
    ? "Option 1: Time-Restricted Mode (Dynamic Waiting Protocol)"
    : "Option 2: Unrestricted Mode (Continuous Autonomous Loop)";

  const actionableItems: string[] = [
    `1. Git pull BEFORE starting any work — first try \`gitmap pull <repo path>\` (or run \`gitmap pull\` in repository folder); if that fails, fall back to regular \`git pull\` and resolve merge conflicts so the repository is up to date and clean before starting.`,
    `2. Write spec under 02-spec/21-app/XX-${slug}/ and enqueue plan task in .ai-memory/plans/pending/XX-${slug}.md (subtasks in .ai-memory/plans/subtasks/XX-${slug}/) first (XX is sequence 01, 02).`,
    `3. Search codebase exclusively via GitMap (gitmap aum search, gitmap find, gitmap cat, gitmap ps, gitmap py, gitmap llm train); TOTAL BAN on rg, ripgrep, grep, git grep, Select-String.`,
    `4. Strictly use relative Git paths (02-spec/..., .ai-memory/..., src/...); only add relative paths, never add absolute paths during work or on the release page and in release notes.`,
    `5. IMPORTANT: The attached snapshot images are for learning purposes only to understand UI behavior and geometry. NEVER save, copy, move, or commit snapshot images into codebase assets (assets/, src/assets/, public/assets/). Leave image artifacts strictly in runtime logs (.logs/recorded-bugs/${session.id}/). Analyze the bug, formulate your fix, and discard/forget the images.`,
    `6. Use \`gitmap\` AI agents to enter data.`,
    `7. Task completion includes committing and pushing to Git.`,
    `8. Give every Task-NN in confirmed task breakdown a \`Slug:\` sub-item derived from root slug (\`${slug} - Task NN\`) so GitMap can create and verify subtasks.`,
    `9. Execute via V7 Master Engine per @[execute-parent-task-with-n-steps-v7](file;.agents/skills/execute-parent-task-with-n-steps-v7): Option 1 (Time-Restricted commits before 08:00 AM weekdays/anytime weekends via \`--tz\`, \`--schedule\`, \`--auto-window\`) or Option 2 (Unrestricted commits); configure bot identity via \`gitmap autobot\` when commanded.`,
    `10. Enforce time-restricted recommits per @[gitmap-time-restriction](file;.agents/skills/gitmap-time-restriction) using \`gitmap\` semantic commit verbs without polluting git history.`,
    `11. Enforce SQL repository pattern and enum-driven actions per @[sql-repository-pattern-and-enum-actions](file;.agents/skills/sql-repository-pattern-and-enum-actions): all SQL isolated behind repository interfaces, operations dispatched by exhaustive enum switch with complete util methods (String, Parse, IsValid, All), and strongly-typed AppError envelopes.`,
  ];

  let currentItemIndex = 12;

  session.events.forEach((evt, idx) => {
    const seq = String(idx + 1).padStart(2, "0");
    const elapsed = `+${evt.elapsedMs}ms`;
    const actor = evt.actor;
    const eventType = evt.eventType.toUpperCase();
    const target = evt.targetComponent || "N/A";
    const route = evt.route || session.initialRoute;
    const xpathVal = (evt.telemetry?.xpath || evt.xpath || (evt.details?.xpath as string) || evt.selector || "N/A").replace(/\|/g, "\\|");
    const coordsVal = evt.coordinates ? `(${evt.coordinates.x}, ${evt.coordinates.y})` : "-";
    const evidenceLink = evt.hasScreenshot
      ? formatDiagnosticEvidenceLink(evt.description || `event_${seq}`, idx, evt.eventType, session.id, baseDir)
      : "None";

    let extraDetails = "";

    if (evt.telemetry?.boundingRect) {
      extraDetails += ` Bounds: ${evt.telemetry.boundingRect.width}x${evt.telemetry.boundingRect.height}.`;
    }

    if (evt.telemetry?.componentDetails?.color) {
      extraDetails += ` Color: ${evt.telemetry.componentDetails.color}.`;
    }

    actionableItems.push(
      `${currentItemIndex}. Interaction Step ${seq} (${elapsed}): ${actor} performed ${eventType} on \`${target}\` at route \`${route}\`. XPath: \`${xpathVal}\`. Coords: ${coordsVal}.${extraDetails} Diagnostic Evidence: ${evidenceLink}.`,
    );

    currentItemIndex += 1;
  });

  if (effectiveSplitDbErrors.length > 0) {
    const errSummaries = effectiveSplitDbErrors
      .slice(0, 5)
      .map((e) => `[${e.code || "ERR"}] ${e.message || "Unknown"} (Trigger: ${e.triggerComponent || "N/A"})`)
      .join("; ");

    actionableItems.push(
      `${currentItemIndex}. Resolve active runtime and Split-DB errors recorded during session: ${errSummaries}.`,
    );

    currentItemIndex += 1;
  }

  actionableItems.push(
    `${currentItemIndex}. Commit and finalize all verified fixes atomically via GitMap: \`gitmap cpf "recorder - resolve ${slug}"\`.`,
  );

  return `# ${title}: high priority instruction, non-negotiable task

${description}

**Navigation Path:** ${navPath}
**Observed Behavior:** ${actual}
**Expected Behavior:** ${expected}

## task: ${title}
## slug: ${slug}

# Actionable Items Must Follow Non-Negotiable

${actionableItems.join("\n")}

## Operating Mode & Bot Identity

- **Active Mode**: ${operatingModeName} (\`isTimeRestricted: ${isTimeRestricted}\`)
- **Configured Timezone**: \`${resolvedTimezone}\`
- **AI Automation Bot Persona**: \`gitmap automation bot - ${botAgentName} - runs autonomously <info@rgitmap.com>\`

## Sequential Event Timeline & UI Telemetry

${telemetryTable}

## Visual Evidence & Diagnostic Screenshots

${screenshotsBlock}

## Active Split-DB & Runtime Diagnostics

${errorBlock}

## CLI Telemetry Command

\`\`\`pwsh
python -m BE.cli.processing.main errors list --session-id ${session.id} --trace
gitmap pe -t
\`\`\`

## Must follow and spawn agent using

@[execute-parent-task-with-n-steps-v7](file;.agents/skills/execute-parent-task-with-n-steps-v7)

## Additional Instructions

- [/plan](slashCommand;plan) first before doing work for improved work or less friction, faster execution for AI and coding without errors and following Coding Guidelines.
- [/learn](slashCommand;learn) from @[gitmap](file;.agents/skills/gitmap) skill to leverage GitMap high-speed search, toolchain discovery, and caching.
- Track in-flight file touches and prevent write collisions using GitMap RC Heatmap (\`gitmap rc heatmap status\` / \`gitmap rc heatmap tree\` / \`gitmap rc heatmap live\` / \`gitmap rc heatmap sync\`).
- Only add relative paths, never add absolute paths during work; this must be respected on release page and in release notes as well.
`;
}

// Aliases for compatibility
export const buildV6LetterlyPrompt = generateV6LetterlyPrompt;
export const buildV7LetterlyPrompt = generateV7LetterlyPrompt;

export const buildV6Prompt = (params: PromptBuilderParams): string => {
  return generateV6LetterlyPrompt(params.session, {
    summary: params.summary || params.options?.summary,
    splitDbErrors: params.splitDbErrors || params.options?.splitDbErrors,
    baseDir: params.baseDir || params.options?.baseDir,
    isTimeRestricted: params.isTimeRestricted || params.options?.isTimeRestricted,
    targetTimezone: params.targetTimezone || params.options?.targetTimezone,
    botAgentName: params.botAgentName || params.options?.botAgentName,
  });
};

export const buildV7Prompt = (params: PromptBuilderParams): string => {
  return generateV7LetterlyPrompt(params.session, {
    summary: params.summary || params.options?.summary,
    splitDbErrors: params.splitDbErrors || params.options?.splitDbErrors,
    baseDir: params.baseDir || params.options?.baseDir,
    isTimeRestricted: params.isTimeRestricted || params.options?.isTimeRestricted,
    targetTimezone: params.targetTimezone || params.options?.targetTimezone,
    botAgentName: params.botAgentName || params.options?.botAgentName,
  });
};
