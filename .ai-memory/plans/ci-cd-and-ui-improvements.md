# Plan: CI/CD and UI Improvements

**Spec:** 02-spec/21-app/ci-cd-and-ui-improvements/readme.md
**Branch:** fix/15-oct-26-joy-release-workflow
**Status:** IN PROGRESS
**Subtasks dir:** .ai-memory/plans/subtasks/ci-cd-and-ui-improvements/

## Objective

Branch `fix/15-oct-26-joy-release-workflow` fully green in CI, no pending conflicts vs `origin/main`, remaining spec UI issues fixed, uninstall support added alongside the existing aria2c-accelerated install, pattern-finding image glitches fixed, then PR opened for morning merge.

## Subtasks

| #   | File                                                                  | Goal                                         | Status          |
| --- | --------------------------------------------------------------------- | -------------------------------------------- | --------------- |
| 1   | subtasks/ci-cd-and-ui-improvements/01-ci-conflict-audit.md            | CI run audit + conflict inventory            | RUNNING (agent) |
| 2   | subtasks/ci-cd-and-ui-improvements/02-pattern-glitch-investigation.md | Locate pattern-match view, diagnose glitches | RUNNING (agent) |
| 3   | subtasks/ci-cd-and-ui-improvements/03-ui-fixes.md                     | Apply UI fixes/improvements                  | QUEUED          |
| 4   | subtasks/ci-cd-and-ui-improvements/04-uninstall-support.md            | Add uninstall.ps1 / uninstall.sh paths       | QUEUED          |
| 5   | subtasks/ci-cd-and-ui-improvements/05-ci-green-conflict-resolve.md    | Fix red workflows, resolve conflicts         | QUEUED          |
| 6   | subtasks/ci-cd-and-ui-improvements/06-pr.md                           | Commit, push, create PR                      | QUEUED          |

## Guardrails (from AGENTS.md + user standing rules)

- gitmap-only codebase search (`gitmap aum search` etc.); TOTAL BAN on rg/grep/git grep/Select-String.
- Relative paths only — in files, specs, commits, release notes.
- No history rewriting (Lovable-linked repo): plain commits and pushes only, never force-push or rebase pushed commits. Conflict resolution via merge commits.
- Commit everything into Git; no routine test/build runs without the owner's word.
- Strict Boolean Standard (`is`/`has` only), vertical line gaps, no bare void in Go.
