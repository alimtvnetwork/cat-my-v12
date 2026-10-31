# Subtask 03: Authentic GitMap Letterly Prompt Engine (V6 & V7)

- **Parent Task**: Task 88 (`snap-24-event-20-ui-and-functionality-issues`)
- **Subtask ID**: Subtask-03
- **Owner**: Subtask Worker 3
- **Status**: COMPLETED
- **Specification Reference**: [`02-spec/21-app/88-snap-24-event-20-ui-and-functionality-issues/03-authentic-letterly-prompt-engine-spec.md`](file;02-spec/21-app/88-snap-24-event-20-ui-and-functionality-issues/03-authentic-letterly-prompt-engine-spec.md)
- **Target Files Owned**:
  - `src/lib/recorder/prompt-v6-v7-builder.ts`
  - `src/lib/recorder/v6-prompt-builder.ts`
  - `src/lib/recorder/v7-prompt-builder.ts`
  - `src/lib/recorder/__tests__/prompt-v6-v7-builder.test.ts`

---

## 1. Executive Summary & Objective

Re-architect the prompt generators in `src/lib/recorder/` to output authentic **GitMap Letterly Prompt formats** (matching `01-prompts/22-letterly/03-execute-n-steps-letterly.md` and `01-prompts/22-letterly/14-execute-recommit-time-restricted-letterly.md`). 

The previous implementation emitted bloated pseudo-prompts with arbitrary code fence blocks (`# [V6 Bug Remediation]`) that omitted route navigation paths, lacked proper task and slug metadata, omitted canonical skill triggers, and crucially failed to prevent AI assistants from copying bug report screenshots into codebase assets.

The refactored prompt engine will generate pure, non-negotiable markdown instructions suitable for immediate pasting into autonomous AI coding agents.

---

## 2. Key Architecture & Deliverables

1. **Letterly Standard Header**:
   - Line 1: `# <Task Title>: high priority instruction, non-negotiable task`
   - Line 2..N: Verbatim user context with step-by-step navigation path with directional arrows (`From /routeA -> /routeB -> /routeC`).
   - Line N+1: `## task: <Task Title>`
   - Line N+2: `## slug: <task-slug>` (pure lowercase-hyphenated slug without numeric prefix).
2. **Actionable Items Section**:
   - Header: `# Actionable Items Must Follow Non-Negotiable`
   - Fixed foundation items:
     - Item 1: `Git pull BEFORE starting any work — first try gitmap pull <repo path>...`
     - Item 2: `Write spec under 02-spec/21-app/XX-<slug>/ and enqueue plan task in .ai-memory/plans/pending/XX-<slug>.md...`
     - Item 3: `Search codebase exclusively via GitMap... TOTAL BAN on rg, ripgrep, grep, git grep, Select-String.`
     - Item 4: `Strictly use relative Git paths (02-spec/..., .ai-memory/..., src/...)...`
     - Item 5: **Anti-Asset Ephemeral Learning Invariant**:
       `"IMPORTANT: The attached snapshot images are for learning purposes only to understand UI behavior and geometry. NEVER save, copy, move, or commit snapshot images into codebase assets (assets/, src/assets/, public/assets/). Leave image artifacts strictly in runtime logs (.logs/recorded-bugs/<session_id>/). Analyze the bug, formulate your fix, and discard/forget the images."`
     - Item 6: `Enforce SQL repository pattern and enum-driven actions per @[sql-repository-pattern-and-enum-actions]...`
   - Discrete technical directives extracted from session telemetry (items 7..N):
     - Chronological event timeline with step sequence, elapsed time, actor, event type, target component, XPath, coordinates, bounding box, styles, and diagnostic evidence screenshot links (`[XX-instance-desc](file;.logs/recorded-bugs/<session_id>/screenshots/<file>.png)`).
     - Active Split-DB errors with codes, trigger components, messages, and stack traces.
3. **Canonical Skill Invocations**:
   - `## Must follow and spawn agent using`
     - V6: `@[execute-parent-task-with-n-steps-v6](file;.agents/skills/execute-parent-task-with-n-steps-v6)`
     - V7: `@[execute-parent-task-with-n-steps-v7](file;.agents/skills/execute-parent-task-with-n-steps-v7)`
4. **Standard Letterly Additional Instructions**:
   - `## Additional Instructions`
     - `[/plan](slashCommand;plan) first before doing work...`
     - `[/learn](slashCommand;learn) from @[gitmap](file;.agents/skills/gitmap) skill...`
     - `Track in-flight file touches and prevent write collisions using GitMap RC Heatmap...`
     - `Only add relative paths, never add absolute paths during work...`

---

## 3. Step-by-Step Implementation Roadmap

### Phase 1: Ingest Canonical Letterly Contracts & Helpers (`prompt-v6-v7-builder.ts`)
- Review canonical templates `01-prompts/22-letterly/03-execute-n-steps-letterly.md` and `14-execute-recommit-time-restricted-letterly.md`.
- Implement `formatRouteNavigationPath(routeHistory: readonly string[]): string` to produce formatted route transitions (`From /inspection -> /analysis -> /validation`).
- Implement `formatDiagnosticEvidenceLink(snapTitle, index, eventType, sessionId, baseDir)` ensuring strict relative paths into `.logs/recorded-bugs/<session_id>/screenshots/`.
- Ensure all option structs comply with parameter guidelines (max 2-3 loose parameters; use `PromptBuilderParams`).

### Phase 2: Refactor V6 Prompt Builder (`src/lib/recorder/v6-prompt-builder.ts`)
- Update `buildV6Prompt` to construct the full authentic Letterly grammar.
- Insert the Anti-Asset Invariant block at the core of actionable items.
- Format sequential event table with XPaths, coordinates, and screenshot evidence links.
- Append `## Must follow and spawn agent using` linking to `@[execute-parent-task-with-n-steps-v6]`.
- Append `## Additional Instructions` with `/plan`, `/learn from @[gitmap]`, and GitMap Heatmap instructions.
- Eliminate outer markdown code block wrapping.

### Phase 3: Refactor V7 Prompt Builder (`src/lib/recorder/v7-prompt-builder.ts`)
- Update `buildV7Prompt` to implement V7 Letterly prompt structure.
- Add V7 Dual Operating Mode directives: Option 1 (Time-Restricted commits before 08:00 AM weekdays/anytime weekends via `--tz`, `--schedule`, `--auto-window`) and Option 2 (Unrestricted).
- Add AI automation bot identity governance (`gitmap autobot`) and recommit time restrictions per `@[gitmap-time-restriction]`.
- Append `## Must follow and spawn agent using` linking to `@[execute-parent-task-with-n-steps-v7]`.
- Append `## Additional Instructions`.

### Phase 4: Synchronize Dispatcher Facade (`src/lib/recorder/prompt-v6-v7-builder.ts`)
- Export `generateV6LetterlyPrompt(session, options)` and `generateV7LetterlyPrompt(session, options)`.
- Ensure backwards compatibility with existing consumers in `RecorderExportDropdown.tsx`.
- Standardize all boolean flags to positive framing (`hasScreenshot`, `isTimeRestricted`).

### Phase 5: Verification & Unit Tests (`src/lib/recorder/__tests__/prompt-v6-v7-builder.test.ts`)
- Add tests validating that generated V6 and V7 prompts start with `# <Title>: high priority instruction, non-negotiable task`.
- Verify presence of directional arrow navigation path (`From ... -> ...`).
- Verify presence of Anti-Asset Ephemeral Learning Invariant.
- Verify presence of `## Must follow and spawn agent using` and `## Additional Instructions`.
- Verify relative screenshot paths and zero absolute path leakage.

---

## 4. Coding Constraints & Compliance Checklist

- [x] **Strict Boolean Standard**: Positive booleans only (`hasScreenshot`, `isTimeRestricted`, `isSuccess`).
- [x] **Parameter Structs**: All builder functions accept a single parameter object (`PromptBuilderParams`).
- [x] **Vertical Line Gaps**: Mandatory blank lines before `if`, after `}`, and before `return`.
- [x] **Compound Keyboard Keys**: Use `KeyboardKeyType` helpers if keyboard shortcuts are configured.
- [x] **Anti-Asset Invariant**: Strictly forbidden from writing screenshots to codebase `assets/`.
- [x] **Relative Git Paths**: All emitted markdown links use `.logs/recorded-bugs/<session_id>/...`.
- [x] **Zero Full Builds & Tests**: Micro-batching without uncommanded background test suites.

---

## 5. Verification & Acceptance Criteria

- [x] `generateV6LetterlyPrompt` output strictly conforms to `01-prompts/22-letterly/03-execute-n-steps-letterly.md`.
- [x] `generateV7LetterlyPrompt` output strictly conforms to `01-prompts/22-letterly/14-execute-recommit-time-restricted-letterly.md`.
- [x] Anti-Asset Ephemeral Learning Invariant is prominently displayed in both V6 and V7 outputs.
- [x] Navigation path is rendered as `From <RouteA> -> <RouteB>`.
- [x] Unit tests pass cleanly with zero linting or syntax errors.
