# Command: "read memory" onboarding sequence

Sequence: 13
Captured: 2026-07-16
Scope: Any turn where the user says "read memory".

## Verbatim intent

Saying "read memory" triggers the full onboarding sequence: read core `.lovable/` context files, every file referenced in `.lovable/memory/index.md`, all consolidated guidelines under `spec/17-consolidated-guidelines/` (project uses 17, not 12), and `spec/01-spec-authoring-guide/`. Then read task-relevant spec folders per the Phase 4 lookup table. Finally reply with the fixed completion-confirmation block and stop.

## Rules

- Memory folder is `.lovable/memory/` (never `memories/`).
- Never invent rules; specs override training data; cite file + section when enforcing.
- Any code change bumps the minor version (see `scripts/bump_minor.py`).
- Read every CI/CD issue under `.lovable/cicd-issues/` (if the folder exists) before shipping pipeline changes.

## Notes on this project's actual layout (differences from the generic prompt)

- Consolidated guidelines live at `spec/17-consolidated-guidelines/`, not `spec/12-consolidated-guidelines/`.
- Completed plans live in `.lovable/plans/done/`, not `.lovable/plans/completed/` (see command 08).
- Per user memory: do NOT create per-invocation archive files under `.lovable/prompts/`. Do not mirror this prompt as `.lovable/prompts/xx-read-memory.md`.
