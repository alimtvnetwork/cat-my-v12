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
- Uninstall: added this session (packaging/desktop/uninstall.ps1, uninstall.sh, install.ps1 -Uninstall switch; release.yml ships + validates both).
- PR #10 ("Fix/15 oct 26 joy release workflow") already exists and is OPEN for this branch — the "create a PR" requirement is satisfied by it; no duplicate PR needed.
- `gitmap pa` (2026-10-17) pulled remote changes; merged origin/main into the branch conflict-free (6cb433bb) — now 0 behind.

## Pattern-finding image glitches — diagnosed and fixed

| Cause                                                                                                                  | Status     | Fix                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uploaded/captured images stretched to 16:9 (`readImageFile`/`readImageUrl` forced `drawImage(bitmap, 0, 0, 960, 540)`) | **FIXED**  | New `drawImageLetterboxed` helper in src/lib/vision/white-box-marking.ts (black fill + centered contained draw); both ingest paths use it                                                                |
| Workpiece path: stretched cached pixels vs letterboxed display → misaligned overlays                                   | **FIXED**  | `cacheLoadedPixels` (VisualToolWorkpieceCanvas.tsx) and the PNG file-decode path (workpiece-rule-analyzer.ts) now letterbox via `getContainedDimensions`, matching `renderCanvas`/`handleDetectElements` |
| `hasOverlays` flipped base image raw↔thresholded (regression from 15b476cd)                                            | **FIXED**  | PatternCanvas.tsx: base image always `toThresholdPreviewRgba`; `hasOverlays === false` only skips overlay drawing                                                                                        |
| Canvas backing store reset on every redraw (flicker)                                                                   | **FIXED**  | `drawRgbaToCanvas` only reassigns `canvas.width`/`height` when they changed                                                                                                                              |
| Backend `result.rgba` silently discarded                                                                               | LEFT AS-IS | Client-side threshold + `detectedBoxes` overlays are the intended display; the `props.result` fallback only applies pre-load                                                                             |
