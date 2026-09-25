# 04 — Rule Layers

**Version:** 1.0 (draft)  
**Owner:** Plan 30  
**Depends on:** `01-foundations.md`, `02-layout.md`, `03-canvas.md`

---

## Purpose

Define the right-rail **Rule List** — the Photoshop-style layer stack that owns visibility, lock, order, rename, and selection semantics for every rule in the active program. This file is the contract `05-rule-controller.md` reads for selection state.

---

## Data source

- Store: `src/lib/editor/store.ts` (Zustand, impl step 71).
- Slice: `rulesByProgram[activeProgramId]: Rule[]` in stack order (index 0 = bottom).
- Selection: `selection: string[]` (rule ids). While the Rule Controller is open, `selection.length === 1` — multi-select is disabled the moment the controller mounts (see "Selection contract" below).

---

## Row anatomy (36 px tall)

```text
┌──┬──────────┬────────────────────────────────────┬──┬──┐
│▤ │ [thumb]  │ Rule name              [kind pill] │👁 │🔒│
└──┴──────────┴────────────────────────────────────┴──┴──┘
 ^   ^         ^                       ^             ^  ^
 │   │         │                       │             │  └─ lock toggle
 │   │         │                       │             └──── visibility toggle
 │   │         │                       └──────────────────  kind badge (lucide icon + label)
 │   │         └───────────────────────────────────────────  inline-editable name (dbl-click)
 │   └─────────────────────────────────────────────────────  16×16 thumbnail rendered from shape bbox
 └─────────────────────────────────────────────────────────  drag handle (grip icon)
```

- Idle background: `--ca-panel`; selected: `--ca-select` at 12% alpha; hover: `--ca-panel-2`.
- Kind pill: rounded-full badge with the lucide icon from `01-foundations.md` iconography table + short label ("Presence", "OCR", …).
- Thumbnail: cached SVG snapshot of the shape geometry against `--canvas-bg`; regenerated on shape edit, throttled to 120 ms.
- Locked rules: dim body to 60% alpha, lock icon becomes `Lock`; visibility off: overlay + row body drop to 40% alpha, icon becomes `EyeOff`.

## Actions

| Action              | Trigger                           | Effect                                                     |
| ------------------- | --------------------------------- | ---------------------------------------------------------- |
| Select              | Click row                         | `setSelection([id])`, opens Rule Controller                |
| Range select        | Shift+click                       | Extends selection along list order; closes Rule Controller |
| Toggle in selection | Ctrl/Cmd+click                    | Adds/removes; closes Rule Controller if `> 1`              |
| Rename              | Double-click name, or `F2`        | Inline `<input>`; Enter commits, Esc cancels               |
| Reorder             | Drag row by grip                  | Live preview line between rows; drop commits               |
| Toggle visibility   | Click `Eye` / `EyeOff`, or `H`    | Flips `visible` on the rule                                |
| Toggle lock         | Click `Lock` / `LockOpen`, or `L` | Locked rules ignore canvas hit-testing                     |
| Duplicate           | `Ctrl/Cmd+D`                      | Clone below source, name suffix ` copy`                    |
| Delete              | `Del` / `Backspace`               | Removes rule; if last selected, clears selection           |
| Move up / down      | `Alt+↑` / `Alt+↓`                 | Reorder by one; wraps disabled                             |

Every action dispatches one structured log line with `correlation_id` per user gesture. Reorder drags coalesce with the shape-drag undo policy (`06-state-persistence.md`).

## Keyboard focus

- List root has `role="listbox"`, each row `role="option"` with `aria-selected`.
- `↑` / `↓`: move roving focus + selection to prev/next row.
- `Home` / `End`: jump to first/last.
- `Enter`: focus moves into the Rule Controller.
- `Escape`: clear selection, return focus to workspace.

## Selection contract (read by `05-rule-controller.md`)

- Rule Controller mounts iff `selection.length === 1`.
- Any multi-select action (Shift+click, Ctrl/Cmd+click adding a second, Ctrl/Cmd+A) closes the controller and shows a "Select a single rule to edit" empty state.
- Selection is mirrored on the canvas: selected rules render `--rule-selected`; visibility-off rules hide their overlay entirely; locked rules render outline only and skip hit-testing.

## Drag-to-reorder

- Uses pointer events; no third-party DnD library. Threshold: 4 canvas-px before drag starts (avoids accidental drags on click).
- Live drop indicator: 2 px line in `--ca-primary` between rows.
- Cancel with `ESC`; commit on pointerup.
- Emits `moveRule(id, toIndex)`.

## Empty state

If `rulesByProgram[activeProgramId]` is empty, show a 240 × 80 dashed panel: "No rules yet. Draw a shape on the canvas or press R / C / P."

## Acceptance

| #    | Behavior           | Expected                                          |
| ---- | ------------------ | ------------------------------------------------- |
| R-1  | Click row          | Single select + Controller opens                  |
| R-2  | Shift+click        | Range select + Controller closes                  |
| R-3  | Drag row           | Live indicator + reorder commit                   |
| R-4  | `F2`               | Inline rename input focused with text selected    |
| R-5  | `H` on focused row | Visibility toggles, overlay updates same frame    |
| R-6  | `L` on focused row | Lock toggles, canvas hit-test skips locked shapes |
| R-7  | `Del` on selection | Rules removed; if all deleted, empty state shows  |
| R-8  | `Ctrl/Cmd+D`       | Duplicate below source with `" copy"` suffix      |
| R-9  | Reorder with ESC   | Original order restored, no log line for move     |
| R-10 | 200 rows, scroll   | Virtualization keeps frame ≤ 16 ms                |

Every row corresponds to a test in `08-testing.md`.
