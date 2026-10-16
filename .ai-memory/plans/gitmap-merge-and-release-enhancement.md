# Plan: GitMap Merge and Release Enhancement

**Spec:** 02-spec/21-app/gitmap-merge-and-release-enhancement/readme.md
**Status:** IN PROGRESS
**Subtasks dir:** .ai-memory/plans/subtasks/gitmap-merge-and-release-enhancement/

## Objective

PR #10 merged (done). Release v4.112.19 cut in cat-my-v12, CI verified green, install speed tested. New `gitmap space PR-merge` command spec'd and implemented in gitmap-v28. Conversation recorded in gitmap.

## Subtasks

| # | File | Goal | Status |
|---|------|------|--------|
| 1 | subtasks/gitmap-merge-and-release-enhancement/01-pr-merge.md | Merge PR #10 (no squash) | COMPLETE — 2b338ad3 |
| 2 | subtasks/gitmap-merge-and-release-enhancement/02-release.md | Release v4.112.19, verify CI, test install speed | IN PROGRESS — run 38958888242 |
| 3 | subtasks/gitmap-merge-and-release-enhancement/03-pr-merge-spec.md | Spec for `gitmap space PR-merge` in gitmap-v28 | IN PROGRESS |
| 4 | subtasks/gitmap-merge-and-release-enhancement/04-pr-merge-impl.md | Implement the command in Go | QUEUED |
| 5 | subtasks/gitmap-merge-and-release-enhancement/05-conversation.md | Record conversation in gitmap | QUEUED |

## Guardrails

- gitmap-only codebase search; TOTAL BAN on rg/grep/git grep/Select-String.
- Relative paths only.
- No history rewriting: merge commits only, never force-push.
- Commit everything into Git.
