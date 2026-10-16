# Spec: GitMap Merge and Release Enhancement

**Slug:** gitmap-merge-and-release-enhancement
**Date:** 2026-10-17
**Repos:** cat-my-v12 (merge + release), gitmap-v28 (new `space PR-merge` command)

## User Request (Verbatim)

Merge PR #10 on the user's behalf into main with a regular merge (all commits, NOT squash). Then: gitmap should have this merge ability — new command `gitmap space PR-merge`. If run in a branch, `gitmap space PR-merge main` merges into main; with no target given it finds the default branch and merges into it. Flags: `--squash`, `--single-commit` (flat), `--flat`; squash with PR details — if the PR has markdown details, embed them nicely into the squash message, plus a short heatmap of changed filenames. Write the spec for this gitmap command, then implement it. Include this conversation in gitmap as a planned mode. Release in Cat Malaysia, CI green, test installation speed; improve if slow.

## Confirmed Task Breakdown

| ID | Task | State |
|----|------|-------|
| Task-01 | Merge PR #10 (regular merge, all commits) | DONE — 2b338ad3 on origin/main |
| Task-02 | Release v4.112.19 in cat-my-v12 (draft publish) | IN PROGRESS — workflow run 38958888242 dispatched on main |
| Task-03 | Verify CI green on main after merge | QUEUED |
| Task-04 | Test installation speed; improve if slow | QUEUED — aria2c already in installers; measure download |
| Task-05 | Spec for `gitmap space PR-merge` | IN PROGRESS |
| Task-06 | Implement `gitmap space PR-merge` in Go | QUEUED |
| Task-07 | Record conversation in gitmap (planned mode) | QUEUED |

## `gitmap space PR-merge` — command contract (for the gitmap-repo spec)

- `gitmap space PR-merge [target]` — merge the current branch into `target`.
  No target → resolve the default branch (origin/HEAD or `main`/`master` fallback) and merge into it.
- `--squash` — squash-merge; the squash message embeds the PR's markdown
  details (title + body) when a PR exists for the branch, plus a short
  heatmap of changed files (top-N files by change size).
- `--single-commit` / `--flat` — flat single-commit merge variant.
- Refuses on dirty tree; never rewrites published history (merge commits only, no rebase).
