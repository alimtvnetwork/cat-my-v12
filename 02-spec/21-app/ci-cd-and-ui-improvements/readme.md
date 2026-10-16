# Spec: CI/CD and UI Improvements

**Slug:** ci-cd-and-ui-improvements
**Branch:** fix/15-oct-26-joy-release-workflow (YeasinKabirJoy)
**Baseline after `gitmap pa` (2026-10-17):** c3b39060 "Merge remote changes into fix/15-oct-26-joy-release-workflow"; branch is 17 ahead / 3 behind origin/main
**Repo:** cat-my-v12
**Date:** 2026-10-17

## User Request (Verbatim)

Make sure the CI/CD is green and all the UI issues that is in the spec and the other new improvements are done, and installations can be done within a very short period of time, let's say one minute, using the area 2C (aria2c), and make sure that we can also install/uninstall the stuff. And there are some glitches in the image that is given when it tries to find the pattern. It has some glitches. Look into that. Once done, fix the CI/CD green, make sure it's a conflict resolved, there is nothing pending on that branch. Create a PR so the user can merge in the morning.

## Confirmed Task Breakdown

| ID      | Task                                                 | State                                                                                                                   |
| ------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Task-01 | `gitmap pa` (local work set)                         | DONE — 13 pulled (1 active, 12 up-to-date); Antigravity-Manager has uncommitted background-program changes (left alone) |
| Task-02 | Spec + plan + subtasks                               | IN PROGRESS                                                                                                             |
| Task-03 | CI/CD green on the branch                            | QUEUED — check workflow runs, fix red                                                                                   |
| Task-04 | Conflict resolution (nothing pending vs origin/main) | QUEUED — 17 ahead / 3 behind; merge or rebase plan after CI audit                                                       |
| Task-05 | Remaining UI issues from spec + new improvements     | QUEUED                                                                                                                  |
| Task-06 | Sub-minute install via aria2c                        | DONE (previous session: cd20af53) — verify path unchanged; aria2c = the speed win                                       |
| Task-07 | Install AND uninstall support                        | QUEUED — uninstall path was spec-noted as missing                                                                       |
| Task-08 | Pattern-finding image glitches                       | QUEUED — locate pattern-match view, fix visual glitches                                                                 |
| Task-09 | Commit + push                                        | QUEUED                                                                                                                  |
| Task-10 | Create PR (base: main) for morning merge             | QUEUED                                                                                                                  |

## Notes

- aria2c acceleration was already added to packaging/desktop/install.ps1 and install.sh in the prior session (commit cd20af53). This spec's install-time target (≤1 min) rides on that + zip size.
- Uninstall: currently no uninstall path exists in packaging/desktop/* (spec gap noted in prior session vs 02-spec/21-app/77-cli-powershell-and-release.md). To be added.
- Pattern glitch: area under investigation — candidate is src/components/vision/white-box/PatternCanvas.tsx and the pattern-search preview path.
