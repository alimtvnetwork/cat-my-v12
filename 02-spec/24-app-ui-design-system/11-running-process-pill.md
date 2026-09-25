# 11 - Running Process Pill (Google-Meet-style dockable indicator)

**Version:** 1.0 (draft)
**Owner:** Plan 64 (UI v2), steps 65-66
**Depends on:** `10-navigation-shell.md`, `01-foundations.md`

---

## Purpose

A long-running operation (validate against image, capture, project run, export) must not pin the user to its source page. Instead it registers a pill that lives in the header slot by default and can be dragged to any of the four screen corners, exactly like the Google Meet screen-share indicator.

## States

| State     | Visual                                               | Actions                                                                                    |
| --------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Idle      | Slot empty. No pill rendered.                        | -                                                                                          |
| Running   | Rounded pill, spinner, op title, elapsed timer.      | Click title -> jump to source page. Click Stop -> `cancel()`. Drag anywhere -> free-float. |
| Paused    | Same pill, spinner replaced by pause glyph.          | Resume, Stop.                                                                              |
| Completed | Pill turns success tint for 4s, then auto-dismisses. | Click -> jump to results.                                                                  |
| Failed    | Pill turns danger tint, sticky until dismissed.      | Click -> jump to error details. Dismiss -> remove.                                         |

## Data model

```ts
// src/lib/running-ops.functions.ts (server-fn) + src/hooks/use-running.ts (client store)
type RunningOp = {
  id: string; // uuid
  kind: "ValidateImage" | "CaptureRun" | "ProjectRun" | "ExportBundle" | "ImportBundle";
  title: string; // UI Title Case, e.g. "Validating Rectangle OCR against test.png"
  href: string; // route to jump back to
  startedAt: number; // Date.now()
  progress?: number; // 0..1 when known
  status: "Running" | "Paused" | "Completed" | "Failed";
  error?: { code: string; message: string };
};
```

A Zustand store keyed by `id` holds active ops. Backend workers publish progress via server-sent events on `/api/public/running/stream` (webhook-style read; signed URL bound to the tab session). Subscription is opened at app boot in `src/routes/__root.tsx` inside a `<ClientOnly>` gate.

## Placement + drag model

- Default parent: `<RunningPillPortalRoot>` inside the header (see `10-navigation-shell.md`).
- When the user drags the pill outside the header bounds, the pill re-parents to `document.body` inside a floating layer with `position: fixed` and snaps to the nearest corner on drop.
- Corners: `TopRight`, `BottomRight`, `BottomLeft`, `TopLeft`. Persisted per user in `layout_prefs.running_pill_corner`.
- Double-click the pill body: dock back to the header slot. Escape while dragging: cancel drag.
- Multiple ops: stack vertically at the chosen corner with 8px gap. Q17 (parallel-run ambiguity) is closed by "always allow stacking; UI supports N".

## Accessibility

- Pill root is `role="status" aria-live="polite"`. On completion the live region announces `"<title> completed"`.
- Stop button is a proper `<button>` with `aria-label="Stop <title>"`.
- Keyboard: `Tab` reaches the pill after the last header item. `Enter` on the title jumps to `href`. `Delete` triggers Stop.

## API surface

```ts
// client
const { register, update, complete, fail, cancel, list } = useRunning();

// register(op: Omit<RunningOp,'id'|'startedAt'|'status'>) -> id
// update(id, patch)
// complete(id, { href? })
// fail(id, { error })
// cancel(id) -> optimistically sets Paused, calls server-fn cancelOp(id)
```

`cancelOp` is a server function that writes a `cancel_requested` flag to the backing row; the worker polls this flag between steps and exits cleanly. No `SIGKILL`.

## Failure + logging contract

- Every registered op writes a structured log line at register / update / complete / fail with `{ op_id, kind, elapsed_ms, status }`. Logs go through the standard app logger, not `console.log`.
- A failed op keeps its pill sticky until the user dismisses. Dismissal writes an audit line `{ op_id, dismissed_by, at }`.
- If the SSE stream drops, the pill switches its spinner to a "reconnecting" glyph after 5s and shows the last known progress. It does not silently disappear.

## Verification

- Playwright: register a fake op via `window.__running.register(...)`, assert the pill renders in the header slot, drag it to `BottomRight`, reload the page, assert it snaps back to `BottomRight` from persisted prefs.
- Playwright: fail an op, assert danger tint, dismiss, assert pill removed and audit log line present.
- Manual: stop a real capture run, worker exits within 2 seconds, no orphan processes.

## Open ambiguities

- None. Q17 is resolved above (allow N parallel ops).
