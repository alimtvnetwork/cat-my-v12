# Plan 76 Step 13 - Issue 16 triage memo (project-section-create-flow-broken)

Date: 2026-07-18
Version: v3.523.0

## Status snapshot

Issue 16 (`.lovable/issues/16-project-section-create-flow-broken.md`) remains the sole `Status: open` entry across `.lovable/issues/`. It is parked on user answers to `.lovable/ambiguity-questions/01-ui-v2-open-questions.md`.

## Blocking questions (Q1..Q19 in the ambiguity file)

The following questions from `01-ui-v2-open-questions.md` directly gate any create-flow rebuild:

- Q1 (top-level noun: Rule Set vs Rule vs Recipe) and Q2 (default name pattern) drive form field labels and default values in the New Project + New Rule Set flows.
- Q3 (Setup as route vs dropdown) drives where the "New" affordance lives.
- Q5, Q6, Q7 (Category Rule vs Task-Based Rule; Reference vs Snapshot override semantics) drive the schema fields the create form must collect.
- Q13 (SQLite vs Lovable Cloud) drives the persistence facade choice: whether the create-flow calls the IDB facade (`src/lib/projects/facade.ts`) only, or must round-trip through a server function.
- Q16 (project zip embedding vs referencing) drives asset field validation.

Q4, Q8-Q12, Q14, Q15, Q17-Q19 are adjacent but not gating for the create flow specifically.

## Code paths involved

Once questions are answered, the create flow rebuild touches these files:

- `src/routes/projects.index.tsx` (list + hero + "New Project" trigger).
- `src/routes/projects.tsx` (layout wrapper).
- `src/routes/projects.$projectId.tsx` and `projects.$projectId.index.tsx` (post-create landing surface).
- `src/lib/projects/facade.ts` (IDB persistence facade; SDK-swap boundary).
- `src/lib/projects/seed.ts` (idempotent sample projects; shape must match create-flow output).
- `src/stores/*` zustand stores for projects (whichever binds the facade to UI).

## Verdict

Not fixable this plan. Do NOT attempt a partial rebuild while Q1/Q2/Q5/Q6/Q13 are unanswered: any schema decision made now will be re-litigated. Recommended next action: user answers Q1, Q2, Q3, Q5, Q6, Q7, Q13, Q16, then open a dedicated slice plan targeting issue 16 only.

## Impact

Documents the exact gate for Plan 77 planning. Prevents a fast, shallow rebuild attempt that would waste a full loop.
