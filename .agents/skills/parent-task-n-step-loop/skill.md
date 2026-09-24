---
name: parent-task-n-step-loop
description: Autonomously orchestrate and execute parent tasks via 200-step continuous self-looping, lean subtasks, and atomic git operations.
---

# Parent Task N-Step Continuous Loop & Multi-Agent Orchestration

## Overview
Autonomously orchestrates and executes complex parent tasks by decomposing them into subtasks and running a continuous N-step self-loop until completion without failure.

## Budget Allocation
- `N = 200` total self-loop step budget.
- `PHASE_1_STEPS = 100`: Planning, Detailed Spec, and Lean Subtask Generation.
- `PHASE_2_STEPS = 100`: Parallel Execution, Self-Looping, Targeted Quality Linting.

## Pipeline Architecture
1. **Phase 1A: Verbatim Capture, Task Extraction & Chat Output Gate (Step 0)**
   - Verbatim prompt capture in planning spec.
   - Actionable deliverables extraction (`Task-01`, `Task-02`).
   - Emit confirmed task breakdown in chat before proceeding.
2. **Phase 1B: Planning Mode, Master Spec & Lean Subtasks (Steps 1..100)**
   - Master architectural plan in `.ai-memory/plans/pending/xx-<slug>.md`.
   - Lean subtask decomposition in `.ai-memory/plans/subtasks/xx-<slug>/`.
   - Subtasks must contain strictly unique, domain-specific requirements (no universal boilerplate).
   - Automatic transition into Phase 2 execution without stopping.
3. **Phase 2: Execution Mode & Targeted Verification (Steps 101..200)**
   - Execute subtasks in bounded batches.
   - Total ban on test running (`pytest`, `go test`, runner scripts) and build checking (`npm run build`, `go build`).
   - Fast targeted file linters only (`exit 0`).
4. **Phase 3: Task Consolidation & Atomic Git Push (End of Loop)**
   - Consolidate subtasks into `.ai-memory/plans/completed/xx-<slug>.md`.
   - Remove completed granular subtask files and pending spec.
   - Update `.ai-memory/plans/01-index.md`.
   - Atomic final commit and push to remote git branch.
