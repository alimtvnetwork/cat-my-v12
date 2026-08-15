# Plan 98 — Architecture Decisions

**Plan:** 98 — Architecture Consolidation  
**Created:** 2026-08-13

Record decisions here as subtasks land. Do not implement SS-05 without a row in this file.

---

## Decision Log

| ID | Date | Title | Decision | Rationale | Subtask |
|----|------|-------|----------|-----------|---------|
| D-001 | — | Rule engine ownership | *Pending SS-05* | — | SS-05 |
| D-002 | 2026-08-16 | Shared kernel layout | Option A — Shared package | Extracts rule_kernel to root so BE and worker share identical predicate math | SS-05 |

---

## Templates

### D-002 — Shared kernel layout

**Context:** Rule evaluation logic existed in both `app/rules/` and `BE/app/rules/`, leading to drift between the editor preview and worker runtime.  
**Options considered:** Option A (Shared package at root), Option B (BE owns kernel), Option C (Generated parity tests).  
**Decision:** **Option A — Shared package (recommended)**. Extracted `rule_kernel/` at the repository root. `BE/app/rules/` and `app/rules/` will import from this shared package.  
**Consequences:** Eliminates duplication of predicate math. A single test suite covers evaluators for both paths.  
**Verification:** pytest paths, parity fixtures
