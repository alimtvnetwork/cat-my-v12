# Subtask 02: Automated V6 and V7 Letterly Prompt Builders

- **Task**: `cat-product-recording-feature-enhancement - Task 02`
- **Owner**: Worker 2
- **Status**: READY FOR IMPLEMENTATION
- **Specification Reference**: [`02-spec/21-app/87-cat-product-recording-feature-enhancement/03-v6-v7-letterly-prompt-engine-spec.md`](file;02-spec/21-app/87-cat-product-recording-feature-enhancement/03-v6-v7-letterly-prompt-engine-spec.md)
- **Target Files**:
  - `src/lib/recorder/types.ts`
  - `src/lib/recorder/prompt-common.ts`
  - `src/lib/recorder/v6-prompt-builder.ts`
  - `src/lib/recorder/v7-prompt-builder.ts`
  - `src/lib/recorder/__tests__/prompt-builders.test.ts`

---

## 1. Executive Summary & Objective

Implement dedicated prompt formatting engines for **V6 and V7 Letterly prompts** that transform captured recording sessions, DOM telemetry, active Split-DB errors, and binary-adjacent screenshots into standardized, copyable Markdown documents for AI pair programming sessions.

The generated markdown prompts must strictly enforce:
1. **Non-Asset Ephemeral Learning Invariant**: Explicit instructions that snapshots are for visual understanding only and must never be saved into codebase assets or git tracking.
2. **Turn-1 AI Comprehension & Understood Gate**: Instructions requiring the target AI to articulate its diagnosis, blast radius, and root cause hypothesis in visible chat before touching code.
3. **IDE Image Encapsulation Standard**: `[<sequence>_<instance>_<what>](file:;<absolute_path>)` (and `[<sequence>_<instance>_<what>](file;<absolute_path>)`).
4. **V6 vs V7 Architectural Fidelity**:
   - V6: Tree Swarm Hierarchy (`A=3, H=2, Capacity=6`), 5 Mandatory Pillars, 6-part task verification schema, GitMap atomic hyphen commits.
   - V7: Dual Operating Modes (`isTimeRestricted: true | false`), target timezone resolution hierarchy, weekday morning window `< 08:00 AM`, and AI automation bot governance.

---

## 2. Step-by-Step Implementation Roadmap

### Phase 1: Data Contracts & Type Extensions (`src/lib/recorder/types.ts`)
- Define `LetterlyPromptVersion` enum (`V6 = "V6"`, `V7 = "V7"`).
- Define `PromptImageRef` interface:
  ```typescript
  export interface PromptImageRef {
    sequenceNumber: number;
    instanceId: string;
    actionDescriptor: string;
    absolutePath: string;
    relativePath?: string;
    dataUrl?: string;
  }
  ```
- Define `TelemetryStepSummary` interface capturing step number, elapsed time, action type, target component, XPath, bounding rect, padding, margin, computed colors, and spring indicator number.
- Define `SplitDbErrorSummary` interface capturing error code, message, trigger component, correlation ID, and stack trace snippet.
- Define `BuildPromptParams` options struct to comply with coding guidelines parameter constraints.

### Phase 2: Common Prompt Serialization Utilities (`src/lib/recorder/prompt-common.ts`)
- Implement `formatNonAssetWarning()`: Renders the standard markdown alert forbidding saving images into `assets/`, `src/assets/`, or `public/assets/`.
- Implement `formatAiComprehensionGate()`: Generates the mandatory Turn-1 AI understanding requirements and clarification protocol.
- Implement `formatIdeImageLink(ref: PromptImageRef)`: Produces `[<sequence>_<instance>_<what>](file:;<absolute_path>)`.
- Implement `formatTelemetryTable(steps: TelemetryStepSummary[])`: Formats markdown table with escaped characters (`|`, `<`).
- Implement `formatSplitDbErrors(errors: SplitDbErrorSummary[])`: Serializes active Split-DB errors or clean fallback message.
- Implement `formatCliDiagnosticCommand(sessionId: string)`: Renders `python -m BE.cli.processing.main errors list --session-id <id> --trace`.

### Phase 3: V6 Letterly Prompt Builder (`src/lib/recorder/v6-prompt-builder.ts`)
- Implement `buildV6LetterlyPrompt(params: BuildPromptParams): string`.
- Emits V6 Header:
  - Budget parameters: `N = 400`, `A = 3`, `H = 2`, `C = 30`.
  - Tree Swarm Hierarchy: `Lead Orchestrator -> Branch Coordinators -> Leaf Workers`.
  - Concurrency Capacity: `6`.
- Embeds Phase 1A Turn 1 5 Mandatory Pillars:
  - Pillar 1: Strategic Intent & Systems Reasoning.
  - Pillar 2: Explicit Scope Boundaries.
  - Pillar 3: Non-Negotiable Constraints & Negative Guardrails.
  - Pillar 4: Blast Radius & Dependency Topology.
  - Pillar 5: Multi-Agent Concurrency Topology.
- Embeds 6-part task verification schema requiring `- **Understood / AI Comprehension:** [YES] — ...`.
- Emits atomic hyphen commit instructions: `gitmap cpf "<module> - <summary>"`.

### Phase 4: V7 Letterly Prompt Builder (`src/lib/recorder/v7-prompt-builder.ts`)
- Implement `buildV7LetterlyPrompt(params: BuildPromptParams): string`.
- Emits V7 Header:
  - Dual Operating Mode selector: Option 1 (Time-Restricted) vs Option 2 (Unrestricted).
  - Target timezone resolution hierarchy: Flag -> Preamble -> Split-DB `commit_timezone` -> Host local.
  - Weekday `< 08:00 AM` morning commit window rule with `--auto-window`.
  - Weekend 24-hour unconstrained rule.
  - AI automation bot identity locking: `gitmap login set ai-auto <agent-name>`.
- Injects full telemetry, Split-DB errors, IDE image links, and CLI command.

### Phase 5: Verification & Unit Tests (`src/lib/recorder/__tests__/prompt-builders.test.ts`)
- Test V6 builder produces expected Tree Swarm blocks, 5 pillars, non-asset warnings, and IDE links.
- Test V7 builder produces expected Dual Mode sections, bot identity tokens, and non-asset warnings.
- Test empty events/errors/screenshots resilience without markdown formatting corruption.
- Test escaping of special characters (`|`, `<`) in telemetry rows.

---

## 3. Strict Coding Constraints & Enforcement

- **Positive Booleans Only**: Use `isTimeRestricted`, `hasScreenshots`, `hasErrors`, `isSuccess`. Ban `can`, `should`, `was`.
- **Parameter Structs**: All builder functions accept a single parameter object (`BuildPromptParams`).
- **Vertical Line Gaps**: Blank line before `if`, after `}`, before `return`/`throw`.
- **Compound Keyboard Keys**: If hotkeys are bound, use `KeyboardKeyType.isEnterOrSpace(e.key)`.
- **Zero Builds / Tests Rule**: Do not run full test suites unless explicitly requested.

---

## 4. Acceptance Criteria Checklist

- [ ] `LetterlyPromptVersion`, `BuildPromptParams`, `PromptImageRef` exported in `types.ts`.
- [ ] `formatIdeImageLink` outputs `[<seq>_<inst>_<what>](file:;<path>)`.
- [ ] V6 Letterly prompt includes non-asset disclaimer, comprehension gate, Tree Swarm header, 5 Pillars, and hyphen commits.
- [ ] V7 Letterly prompt includes dual operating mode config, timezone hierarchy, bot governance, and non-asset disclaimer.
- [ ] Split-DB errors and DOM telemetry table serialize cleanly into the single markdown output.
- [ ] Unit tests pass with 100% coverage of prompt builder branches.
