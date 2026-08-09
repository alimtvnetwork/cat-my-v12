# 25 - Run Flow

**Version:** 1.0
**Owner:** Plan 64 step 27
**Depends on:** `16-project-lifecycle.md`, `22-override-modes.md`, `11-running-process-pill.md`, endpoint rows 27, 28, 46, 47.

---

## Purpose

Define how a user goes from a configured Project to a graded Run, including multi-RuleSet override preview, test-image drop, live progress, cancel, and result inspection.

## Entry points

- Project detail page, top-right primary action `Run`. Disabled with tooltip when Project.status != `Ready`.
- Keyboard: `Ctrl+Enter` from anywhere on the Project page.
- Recent Projects chip (`23-recent-projects-home.md`) opens the Project page; user hits Run.

## Pre-run summary panel

Before the Run kicks off, the button opens an inline drawer showing:

1. Wired RuleSets in order (drag-to-reorder disabled while the drawer is open; reorder happens in the Project editor).
2. The Override chain table (see `22-override-modes.md`).
3. Camera Setting summary + Lighting Setting summary.
4. Test-image dropzone (accepts jpg/png/tiff, one or more). If empty, Run uses the live camera via `captureTestFrame` per capture cycle.
5. Confirm button `Start run`. Cancel button `Close`.

## Start

- Frontend calls `startProjectRun({ project_id, test_image_refs? })` -> returns `{ run_id, op_id }`.
- The Running Pill is registered with kind `ProjectRun`, label = Project name, target route = `/projects/$projectId/runs/$runId`.
- The page navigates to the run detail route (`/projects/$projectId/runs/$runId`) which subscribes to the SSE stream from row 36 (`/api/public/running/stream`) for progress deltas keyed by `op_id`.

## During the run

- Run detail view shows:
  - Header: status pill (Queued / Running / Stopping / Completed / Failed / Cancelled).
  - Progress bar: `captures_pass + captures_fail` of `captures_total` (unknown total renders as an indeterminate bar).
  - Live capture strip: latest 8 captures with per-rule verdicts.
  - Stop button top-right; calls `stopProjectRun({ run_id })`. Confirmation modal.
- Cancel semantics: `cancelOp` sets `cancel_requested`; workers exit between captures. Any capture in-flight completes and is recorded.

## After the run

- Status transitions to `Completed` / `Failed` / `Cancelled` via the SSE stream; the query for `getRun` is invalidated.
- Results table: per capture verdict, per rule verdict, timing. Row click opens the annotated capture with mask overlays from `CaptureAsset`.
- Export the run as a bundle via `previewExport({ scope: 'run', id: run_id, format })` -> `startExport`.

## Error paths

- `startProjectRun` returns `NotAuthorized` -> toast + inline error on the drawer, do not navigate.
- `startProjectRun` returns `ValidationFailed` (e.g. no camera setting on the Project) -> drawer stays open with the failing field highlighted.
- SSE stream drops -> the client falls back to polling `getOpStatus({ op_id })` every 2 s; a small yellow badge "Reconnecting" appears next to the status pill; on reconnect the badge disappears.
- Backend audit line MUST fire for every start, stop, and terminal transition. Missing audit line is treated as a bug per the observability rule.

## Verification

- Playwright happy path: drop one test image, click Run, wait for `Completed`, assert per-rule verdicts render, assert Export button enabled.
- Playwright cancel path: kick a run against 20 test images, click Stop after 3 completed, assert status becomes `Cancelled` with `captures_total = 3`.
- SSE fallback test: kill the SSE endpoint mid-run; assert the client polls `getOpStatus` and terminal status still lands correctly.
