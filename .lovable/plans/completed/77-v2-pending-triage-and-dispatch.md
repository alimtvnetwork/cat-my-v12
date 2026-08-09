# V2 pending triage and ambiguity dispatch

Slug: v2-pending-triage-and-dispatch
Steps: 12
Status: completed
Created: 2026-07-18

## Context

Plan 76 closed all resolvable open issues. Remaining V2 scope is the 9 "Pending" items in `spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md` (L189-198) plus open issue 16. Every remaining item is blocked on a written ambiguity: A-01..A-05, DEC-04, or the worker-process build. This plan does not ship code. It records ownership, ties each item to its blocking question, and produces a single dispatch document so the user can unblock the queue in one turn.

Related:

- `spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md`
- `.lovable/ambiguity-questions/03-v2-enhancement-open-decisions.md`
- `.lovable/issues/16-project-section-create-flow-broken.md`

## Steps

1. Snapshot V2 pending table into a memo (`.lovable/memory/v2/plan77/01-pending-snapshot.md`) with per-item blocker.
2. Cross-reference each item to its ambiguity ID (A-01..A-05, DEC-04) or external gate (worker build).
3. Identify any item whose block is stale (i.e., decision already recorded elsewhere) and mark for immediate work.
4. Author `.lovable/ambiguity-questions/04-plan77-dispatch.md` consolidating every open question into one numbered list.
5. Include Issue 16 questions (Q1-Q3, Q5-Q7, Q13, Q16) verbatim in the dispatch.
6. Add "expected answer format" hints per question to reduce follow-up rounds.
7. Update `03-v2-enhancement-open-decisions.md` header to point to the dispatch memo.
8. Add a "Plan 77 dispatch" row to the V2 matrix section 2 (Pending) so each pending row references the dispatch memo.
9. Verify no code changes: `git status` shows only docs/memos.
10. Run tsgo (fast sanity check that doc edits didn't accidentally touch code).
11. Move Plan 77 to `completed/` when the dispatch memo is authored and matrix updated.
12. Bump minor version, changelog, release notes, README pin.

## Exit criteria

- Single dispatch memo lists every question needed to unblock all 9 pending V2 items + issue 16.
- V2 matrix rows in section 2 each reference the dispatch memo.
- No source-code changes.
