# Command: Start each new plan from the top of the v2 ranked backlog

Sequence: 07
Captured: 2026-07-14
Scope: Planning turns that open a new `.lovable/plans/pending/XX-*.md`.

## Verbatim

> Start Plan N by selecting the top item from `.lovable/memory/v2/01-ranked-backlog.md` and create the corresponding pending plan file.

## When it applies

- Whenever a new plan file is opened and the user has not named an explicit workstream.
- Applies to v2 workstream planning; not required for audit-only or hotfix plans.

## How to apply

1. Read `.lovable/memory/v2/01-ranked-backlog.md` first.
2. Walk the ranked table top-down; skip items whose acceptance criteria are already met (cross-check against `.lovable/plans/done/`).
3. First unmet rank becomes the new plan's workstream.
4. Cite the backlog row (`rank` + workstream name) in the plan's Context section.
5. If every rank is complete, STOP and ask the user for the next scope instead of inventing one.
