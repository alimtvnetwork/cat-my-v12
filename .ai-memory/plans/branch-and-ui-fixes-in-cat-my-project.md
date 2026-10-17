# Plan: Branch and UI Fixes in CAT MY Project

**Spec:** 02-spec/21-app/branch-and-ui-fixes-in-cat-my-project/readme.md
**Branch:** fix/15-oct-26-joy-release-workflow (YeasinKabirJoy)
**Status:** IN PROGRESS
**Subtasks dir:** .ai-memory/plans/subtasks/branch-and-ui-fixes-in-cat-my-project/

## Objective

Audit Yasin's latest branch (12 commits ahead of origin/main: 10 installer/release-workflow fixes + 2 UI titlebar fixes), classify every item from the requested UI-fix spec (02-spec/24-app-ui-design-system) as FIXED or PENDING, confirm installer improvements (area2C, Gitmap/AGM package parity), ensure Windows Start menu pinning, fix what is addressable, then commit and push.

## Subtasks

| # | File | Goal | Status |
|---|------|------|--------|
| 1 | subtasks/branch-and-ui-fixes-in-cat-my-project/01-ui-investigation.md | UI change audit + fixed/pending matrix vs fix spec | RUNNING (agent) |
| 2 | subtasks/branch-and-ui-fixes-in-cat-my-project/02-installer-investigation.md | Installer area2C + Gitmap/AGM parity + Start-menu pin audit | RUNNING (agent) |
| 3 | subtasks/branch-and-ui-fixes-in-cat-my-project/03-spec-finalization.md | Fill spec fixed/pending tables with evidence | QUEUED |
| 4 | subtasks/branch-and-ui-fixes-in-cat-my-project/04-fixes-and-commit.md | Apply addressable fixes, commit + push | QUEUED |

## Guardrails (from AGENTS.md + user standing rules)

- gitmap-only codebase search (`gitmap aum search` etc.); TOTAL BAN on rg/grep/git grep/Select-String.
- Relative paths only — in files, specs, commits, release notes.
- No history rewriting (Lovable-linked repo): plain commits and pushes only, never force-push or rebase pushed commits.
- Commit everything into Git; no routine test/build runs without the owner's word.
- Strict Boolean Standard (`is`/`has` only), vertical line gaps, no bare void in Go.
