# 07 — Errors + Logging

**Version:** 1.0 (draft)  
**Owner:** Plan 30  
**Depends on:** `06-state-persistence.md` (correlation-id lifecycle)  
**Cross-linked from:** `spec/03-error-manage/03-error-code-registry/01-registry.md` — this file is the authoring source for the codes below; the registry appends them, never forks them.

---

## Purpose

Every state transition in the editor emits exactly one structured log line. Every user-visible failure maps to a typed code. Route boundaries catch what escapes. No silent failure.

---

## Log line format

Single line, `key=value` pairs, space-separated, keys stable. Emitted via `src/lib/log.ts` (existing) and mirrored to console at `debug` in dev.

```
ts=2026-07-14T09:12:03.412Z level=info code=I_UI_RULE_UPDATED correlation_id=8f3a1b2c9d40 rule_id=r_01H… kind=ocr field=expectedText program_id=prg_01H…
```

Required keys on every line: `ts`, `level`, `code`, `correlation_id`. Optional depending on code: `rule_id`, `kind`, `field`, `program_id`, `error`, `reason`, `from`, `to`.

`correlation_id` lifecycle is owned by `06-state-persistence.md` (`beginGesture` / `endGesture`). If a code fires outside a gesture (e.g. persistence timer flush), the writer synthesizes a one-shot id and logs `correlation_id=sys_<12hex>`.

## Codes (register in `spec/03-error-manage/03-error-code-registry/`)

### Info (`I_`)

| Code                      | When                   | Keys                       |
| ------------------------- | ---------------------- | -------------------------- |
| `I_UI_RULE_UPDATED`       | `updateRule` commits   | `rule_id`, `kind`, `field` |
| `I_UI_RULE_ADDED`         | `addRule` commits      | `rule_id`, `kind`          |
| `I_UI_RULE_REMOVED`       | `removeRule` commits   | `rule_id`, `kind`          |
| `I_UI_RULE_KIND_CHANGED`  | Kind picker switch     | `rule_id`, `from`, `to`    |
| `I_UI_RULE_REORDERED`     | `moveRule` commits     | `rule_id`, `from`, `to`    |
| `I_UI_SELECTION_CHANGED`  | `setSelection`         | `count`                    |
| `I_UI_UNDO` / `I_UI_REDO` | Undo/redo applied      | `label`, `remaining`       |
| `I_CAM_LIGHTING_APPLIED`  | Lighting slider commit | `field`, `value`           |

### Warn (`W_`)

| Code                      | When                                                     | Keys                                   |
| ------------------------- | -------------------------------------------------------- | -------------------------------------- |
| `W_UI_RULE_INVALID`       | Field validation fails (regex, math parse, out-of-range) | `rule_id`, `kind`, `field`, `reason`   |
| `W_UI_RULE_UNSAVED`       | Route unmount with pending debounced write               | `program_id`, `pending_ms`             |
| `W_UI_STALE_LOAD`         | On-load `updatedAt` older than in-memory                 | `program_id`                           |
| `W_UI_LIGHT_OUT_OF_RANGE` | Lighting value fails local validation                    | `field`, `value`, `min`, `max`, `step` |

### Error (`E_`)

| Code                      | When                                      | Keys                                 | UI action                                      |
| ------------------------- | ----------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| `E_UI_RULE_INVALID`       | Commit attempted with invalid state       | `rule_id`, `kind`, `field`, `reason` | Field `--rule-error`, no commit                |
| `E_UI_CANVAS_LOAD`        | Image load or program read failure        | `program_id`, `error`                | Toast + empty program fallback                 |
| `E_UI_LIGHTING_APPLY`     | Camera settings write failure             | `field`, `error`                     | Toast + revert to previous value               |
| `E_CAM_LIGHT_UNAVAILABLE` | Camera or lighting capability unavailable | `program_id`, `field`, `error`       | Disable drawer controls + retry                |
| `E_UI_RULE_SAVE_FAILED`   | `saveJson` throws / rejects               | `program_id`, `error`                | Toast + keep in-memory; retry on next mutation |

Never swallow. `try/catch` is only for classifying the throw into one of the codes above, then re-throwing to the nearest boundary if the code is fatal (see below).

## Route boundaries

Every editor route sets both:

```ts
// src/routes/setup.tsx, setup.roi.tsx, setup.reference.tsx
createFileRoute("/setup")({
  component: SetupPage,
  errorComponent: EditorErrorBoundary,
  notFoundComponent: EditorNotFound,
});
```

- `EditorErrorBoundary` (impl step 90): shows the code, correlation-id (copy button), a "Reload editor" button that runs `router.invalidate()` and `reset()`, and a link to the memory doc. Body of the boundary logs `E_UI_CANVAS_LOAD` (or the caught code) so the boundary itself is observable.
- `EditorNotFound`: renders the same shell with a "Program not found" message; logs `W_UI_STALE_LOAD` when the URL carried a `program_id` that no longer exists.
- Root `__root.tsx` retains its own `notFoundComponent` for unmatched URLs; the editor boundaries only apply under `/setup*`.

## Log volume policy

- Slider drag: one `I_UI_RULE_UPDATED` on release (coalesced), not one per frame.
- Typing in text fields: one on blur.
- Kind switch: one `I_UI_RULE_KIND_CHANGED` + zero or more `I_UI_RULE_UPDATED` for defaulted fields.
- Selection: one `I_UI_SELECTION_CHANGED`, throttled to 60 fps during marquee drag.
- Undo/redo: one line per invocation.

Rate-cap: no code emits more than 5 lines/sec per correlation_id (excess dropped with one `W_UI_RATE_CAPPED` at the end of the gesture — this warn is reserved and does not need its own registry row until an impl gate needs it).

## Registry cross-link (plan step 15)

Append the codes above to `spec/03-error-manage/03-error-code-registry/01-registry.md` under a new `## Plan 30 — App UI (rule editor)` section. Do NOT edit `error-codes-master.json` here — the registry file is the source of truth; the JSON is regenerated by `spec/03-error-manage/03-error-code-registry/08-linter-scripts/`.

## Acceptance

| #    | Trigger                       | Expected line                                                        |
| ---- | ----------------------------- | -------------------------------------------------------------------- |
| E-1  | Rect drag commit              | `I_UI_RULE_UPDATED field=shape correlation_id=<same as pointerdown>` |
| E-2  | Regex syntax error            | `W_UI_RULE_INVALID reason=regex_syntax` + no commit                  |
| E-3  | `saveJson` throws             | `E_UI_RULE_SAVE_FAILED error=<message>` + toast                      |
| E-4  | Camera setting rejected       | `E_UI_LIGHTING_APPLY error=<message>` + revert                       |
| E-5  | `/setup/roi` throws in loader | `EditorErrorBoundary` renders + logs `E_UI_CANVAS_LOAD`              |
| E-6  | Kind switch OCR → Math        | `I_UI_RULE_KIND_CHANGED from=ocr to=math` + one undo entry           |
| E-7  | 300 slider ticks in 3s        | Rate-capped, ≤ 15 lines                                              |
| E-8  | Route unmount pending write   | `W_UI_RULE_UNSAVED pending_ms=<n>` + flushed                         |
| E-9  | Missing program id in URL     | `EditorNotFound` renders + `W_UI_STALE_LOAD`                         |
| E-10 | Boundary "Reload editor"      | `router.invalidate()` + `reset()` both fire; new correlation_id      |
