# Command: Spec vs code audit, 15-step maximal enforcement

Captured: 2026-07-13
Scope: recurring spec-vs-code audit at any snapshot, condensed to 15 steps.

Verbatim intent:

- Audit spec set vs implemented codebase per spec.
- Score each spec on the 6-dim rubric (Completeness 25, Consistency 25, Alignment 20, Clarity 15, Maintainability 10, Test Coverage 5).
- Output findings with severity + impact to `spec/25-app-audit/latest/`, fold useful conclusions into the current audit bundle, and delete processed duplicates.
- Use 15-step plan enforcement (shared rules in `.lovable/spec/commands/01-plan-50-workflow.md`; count = 15 here).

Applies to: this project, whenever the user re-issues the audit prompt with a 15-step header.
