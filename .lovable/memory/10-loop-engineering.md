# Loop Engineering Architecture

**Version:** 1.0  
**Status:** Active  
**Purpose:** Defines the mechanism by which autonomous agents execute the 700+ remaining steps across 15+ pending plans in batches of 5, without requiring constant human prompt interventions.

---

## 1. Core State Files

The loop mechanism depends on three files stored in `knowledge-base/`:

1. **`loop-state.json`**: Machine-readable pointer.
   - `currentPlan`: The active `.lovable/plans/pending/*.md` file.
   - `currentStep`: The exact step or section being executed.
   - `completedSteps`: Array of all finished step IDs.
2. **`task.md`**: Human-readable checklist of the current batch.
   - Uses `[ ]` (pending), `[/]` (in-progress), and `[x]` (complete).
3. **`loop-log.md`**: Append-only audit trail of every completed batch, test results, and the git commit hash.

## 2. Batch Execution Cycle

Agents must operate in **5-step batches** to ensure atomic commits and rapid verification.

1. **Read State:** Agent reads `loop-state.json` to find where the loop left off.
2. **Stage Batch:** Agent marks the next 5 steps as `[/]` in `task.md`.
3. **Execute:** Agent writes/modifies the code for those 5 steps.
4. **Verify:** Agent runs tests (`bunx tsgo --noEmit` or `pytest -q`).
5. **Commit:** Agent runs `git add . && git commit -m "feat/fix/chore: <summary> (Plan X Steps Y-Z)"`.
6. **Update State:** Agent marks steps `[x]` in `task.md`, writes to `loop-log.md`, and updates `loop-state.json`.
7. **Reassign/Loop:** Agent schedules a background wakeup or uses `invoke_subagent` to instantly kick off the next 5 steps.

## 3. Plan Queue Order

Agents MUST execute pending plans in this strict priority order unless blocked:

1. **Plan 89** (Error resolution rules)
2. **Plan 90** (Worker/Processing CLI - finish steps 99-100)
3. **Plan 83** (UI completion + seed hardening - 42 remaining)
4. **Plan 82** (UI V4 100-step polish)
5. **Plan 80** (UI V4 polish)
6. **Plan 81** (Settings/rules polish)
7. **Plan 85** (Plan 83 residuals)
8. **Plan 44** (App-mode foundation)
9. **Plan 59** (Layers slice 3 closeout)
10. **Plan 51 / 52** (Dashboard scaffold & shadow compare)
11. **Plan 41** (Keyboard DnD)
12. **Plan 40** (Spec docs)
13. **Plan 35** (UI layers overhaul)
14. **Plan 36** (App-shell port)
15. **Plan 88** (Backend Implementation v1)

_(Plans 29, 49, 50 are BLOCKED pending telemetry export)._

## 4. Exit Conditions

The loop only pauses and awaits human intervention if:

- Tests fail.
- A step is completely blocked by external dependencies.
- True ambiguity exists that cannot be resolved safely.
- The user issues a "pause loop" command.
