# Subtask 02: SplitDB Error Architecture & Recipe Persistence Auto-Bootstrap
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/ss-02-error-management-splitdb-cli.md
# Status: COMPLETED

## Objectives
1. Fix Recipe Save failure (`Failed to save recipe: no such table: Recipe`) in `BE/repos/sqlite_rules_repo.py`:
   - Inject self-healing table verification so missing tables are created automatically without relying on external bootstrap execution.
   - Ensure `Recipe` table matches the canonical schema from `BE/db/migrations/root/0020_recipes.sql`.
2. Eliminate error swallowing across vision services and UI handlers:
   - Wrap unhandled exceptions into structured `AppError` envelopes.
   - Enforce Leaf Error Sovereignty (leaf functions return errors, never exit directly).
3. Create SplitDB error store (`data/db/errors.db` / `SystemError` table) and backend ingestion endpoints.
4. Expose CLI commands to inspect error stack traces step-by-step for AI remediation:
   - `gitmap vision error list`
   - `gitmap vision error show <id>`

## Deliverables
- `BE/repos/sqlite_rules_repo.py`
- `src/lib/error/error-logger.ts`
- `src/routes/api/errors.ts`
- `cli/cmd/vision_error.go` (or Python diagnostic CLI equivalent)
