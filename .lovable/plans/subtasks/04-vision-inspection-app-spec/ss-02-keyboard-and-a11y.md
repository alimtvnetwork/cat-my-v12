# SS-02 — Keyboard & Accessibility Contract

**Status:** Locked (Plan 04 Step 36 subtask). Cross-cuts every UI screen in `spec/21-app/30..39-*`.

Anchors: 30 (UI overview), 31 (rule setup), 35 (zoom & pan), 37 (run monitor), 38 (results), 39 (settings), SS-01 (shape interactions).

## 1. Scope

Every interactive control the operator or engineer can reach with a pointer MUST be reachable with the keyboard and MUST be announced by a screen reader with a stable, human-readable name. No exceptions for "advanced" tools — the industrial floor uses gloves, mis-clicks are safety-relevant, and keyboard is the fallback.

## 2. Focus Model

1. Focus order follows document order within a screen region (TitleBar → ActionHeader → main → BottomBar), never a custom `tabindex` above 0.
2. Every interactive element has a visible focus ring drawn from the HMI token palette (memory: HMI design tokens). Removing the ring is `E_A11Y_NO_FOCUS_RING`.
3. Focus never disappears. When a dialog opens, focus moves into it and returns to the trigger on close. Loss of focus (focus on `<body>`) after any interaction is `E_A11Y_FOCUS_LOST`.
4. Modal dialogs trap focus; non-modal panels do not. The Instruction-Bundle viewer (38 §6) is non-modal.

## 3. Global Keys

| Key                       | Action                                   | Scope     |
| ------------------------- | ---------------------------------------- | --------- |
| `Tab` / `Shift+Tab`       | Move focus forward/back                  | all       |
| `Esc`                     | Close top-most dialog / cancel drag      | all       |
| `Ctrl+S`                  | Save (Rule Setup, Settings)              | 31, 39    |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo geometry (Rule Setup only)   | 31, SS-01 |
| `F1`                      | Open contextual help for focused control | all       |
| `Alt+1..9`                | Jump to numbered top-level nav item      | all       |

Global keys MUST NOT be shadowed by screen-local keys. A collision is `E_A11Y_KEY_COLLISION` at load time.

## 4. Viewport Keys (Rule Setup, Run Monitor, Results DetailPane)

| Key                         | Action                                                                          |
| --------------------------- | ------------------------------------------------------------------------------- |
| `+` / `-`                   | Zoom in / out one discrete step (35 §Steps)                                     |
| `0`                         | `ONE_HUNDRED`                                                                   |
| `F`                         | `FIT`                                                                           |
| `Arrow keys`                | Pan by `UI.Viewport.KeyPanPx` (27); disabled on Run Monitor (FIT-locked, 37 §2) |
| `Enter` on selected region  | Enter edit mode (SS-01)                                                         |
| `Delete` on selected region | Delete region (Rule Setup only; confirmation dialog)                            |

Run Monitor rejects pan/zoom-mode-change keys with a silent no-op — surfacing `E_UI_MODE_MISMATCH` for every ignored keystroke would spam the log. Log once per session at `INFO`.

## 5. Screen-Reader Semantics

- Every button, link, and input has an accessible name derived from visible text or an explicit `aria-label`. Icon-only controls without a label are `E_A11Y_UNNAMED_CONTROL`.
- Verdict badges (37 §4, 38 §4) expose their state via `aria-label="Verdict: FAIL — reason PRESENCE_MISSING"` — the reason enum (33) is spelled out, not abbreviated.
- The viewport canvas is `role="application"` with a live-region status node that announces zoom changes and the currently selected region.
- Tables (Results, Audit) use native `<table>` semantics; virtualization MUST preserve row/column headers for AT (`aria-rowindex` / `aria-colindex` on rendered rows).

## 6. Color & Contrast

- Text over any surface hits WCAG 2.2 AA (4.5:1 body, 3:1 large). Verdict colors additionally carry a text label and a shape cue (checkmark / cross) — color is never the only signal. Violations are `E_A11Y_COLOR_ONLY`.
- The HMI token palette (memory) is the only allowed source of color; hard-coded hex in components is a lint failure, not an a11y one — see design system rules.

## 7. Motion

- Animations respect `prefers-reduced-motion`. The Run Monitor overlay pulse (37 §5) is suppressed to a static color under reduced motion.
- No animation exceeds 400ms. Blocking animations that delay operator input are `E_A11Y_MOTION_BLOCKING`.

## 8. Testing Hooks (not user-facing but required)

- Every screen exposes a `data-screen="run-monitor" | "results" | "settings" | ...` on its root for automated a11y sweeps.
- CI runs axe-core on each screen route; any violation at `serious` or `critical` fails the build (wired in 45 §Testing Strategy).

## 9. Failure Taxonomy (UI-local)

| Code                     | When                                            |
| ------------------------ | ----------------------------------------------- |
| `E_A11Y_NO_FOCUS_RING`   | Focused element renders no visible ring.        |
| `E_A11Y_FOCUS_LOST`      | Focus lands on `<body>` after an interaction.   |
| `E_A11Y_KEY_COLLISION`   | Screen-local key overrides a §3 global key.     |
| `E_A11Y_UNNAMED_CONTROL` | Interactive element without an accessible name. |
| `E_A11Y_COLOR_ONLY`      | State conveyed by color alone.                  |
| `E_A11Y_MOTION_BLOCKING` | Animation blocks input > 400ms.                 |

## 10. Cross-References

- Screen layouts referencing this contract: 31, 37, 38, 39.
- Zoom & pan model whose keys are bound here: 35.
- Shape interaction model whose selection/edit keys are bound here: SS-01.
- Reason-code enum spoken by screen readers: 33.
