# Loop Engineering Master Plan

This repository contains ~676 pending steps spread across 18 plan files in `.lovable/plans/pending/`. We use a **Loop Engineering** protocol to autonomously execute these steps in batches, committing regularly, and tracking state.

## Core Protocol

Any AI agent taking over execution MUST follow this loop:

1. **Read State:** Check `knowledge-base/loop-state.json`. If `currentPlan` is null, pick the next plan from the priority queue below, update `loop-state.json` to point to it, and start at step 1.
2. **Execute Batch:** Read the active plan file. Find the next `batchSize` (default: 5) steps that do not have `[DONE]` or `[/]`.
3. **Stage Work:** Update `knowledge-base/task.md` with the current batch's steps.
4. **Implement:** Write code, update specs, add tests. **IMPORTANT: Never rewrite pushed git history (per `AGENTS.md`). Keep the branch working.**
5. **Commit:** `git add .` and `git commit -m "feat(module): implement Plan X S<start>-S<end>"`.
6. **Log & Advance:** Append to `knowledge-base/loop-log.md`. Update `loop-state.json` with the newly completed step numbers and advance `currentStep`.
7. **Repeat:** Continue until the plan is done. When done, move the plan to `.lovable/plans/completed/`, commit the move, and reset `currentPlan` to null.

## Priority Queue (Pending Plans)

Execute these plans in order:

1. [DONE] `29-denial-burst-threshold-tuning.md` (Already done, UI implemented)
2. [DONE] `35-ui-ux-photoshop-layers-overhaul.md` (Already done)
3. [DONE] `36-ui-app-shell-and-src-v3-port.md` (Already done)
4. [DONE] `40-tools-images-spec-docs.md` (Done just now)
5. `41-keyboard-dnd-and-code-quality-pass.md` (41 steps remaining)
6. `44-plan43-execution-slice-1.md` (21 steps remaining)
7. `49-plan29-threshold-derivation.md` (8 steps remaining)
8. `50-plan29-rollout-and-observability.md` (10 steps remaining)
9. `51-plan50-dashboard-and-alert-scaffold.md` (9 steps remaining)
10. `52-plan50-shadow-compare-and-closeout.md` (9 steps remaining)
11. `59-plan35-layers-slice-3-and-closeout.md` (15 steps remaining)
12. `79-ui-improvements-v4.md` (36 steps remaining)
13. `80-ui-improvements-v4-polish.md` (15 steps remaining)
14. `81-settings-rules-and-misc-polish.md` (20 steps remaining)
15. `82-plan100-ui-v4-100steps.md` (95 steps remaining)
16. `83-plan50-ui-completion-and-seed-hardening.md` (22 steps remaining)
17. `85-plan83-residual-shepherd.md` (12 steps remaining)
18. `88-backend-implementation-v1-150-steps.md` (143 steps remaining)
19. `89-error-manage-01-error-resolution.md` (143 steps remaining)

_Note: Plan 90 (`90-worker-and-processing-cli.md`) has been fully completed and moved to `completed/`._

## Starting the Engine

If a human user says "Start the loop" or "Continue", the AI must load this file, read `knowledge-base/loop-state.json`, pick the next pending plan from the queue if necessary, and execute the next batch of 5 steps autonomously.
