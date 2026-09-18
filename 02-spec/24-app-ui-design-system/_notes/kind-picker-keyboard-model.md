# Kind picker keyboard model (plan 30 step 30)

**Version:** 1.0.0 (2026-07-14, v3.33.0)
**Owner spec:** `05-rule-controller.md`
**Consumer components:** `RuleKindPicker` (step ~48), `RuleController` shell.

## Component contract

The picker is a **radiogroup**, not a combobox. Options are the 5 rule kinds `C | R | K | S | E` in that fixed order. Rendered as a horizontal segmented control on desktop, vertical list on narrow layouts.

- Root: `role="radiogroup"`, `aria-label="Rule kind"`, `aria-activedescendant` reflects the focused option.
- Each option: `role="radio"`, `aria-checked={selected}`, `tabindex={selected ? 0 : -1}` (roving tabindex).
- Disabled option: `aria-disabled="true"` and skipped by arrow nav.

## Keyboard model

| Key                                       | Action                                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Tab` into group                          | Focus lands on the currently selected option (roving tabindex).                                                                                              |
| `ArrowRight` / `ArrowDown`                | Move focus to next non-disabled option; wraps from last to first.                                                                                            |
| `ArrowLeft` / `ArrowUp`                   | Previous; wraps from first to last.                                                                                                                          |
| `Home`                                    | Focus first non-disabled option.                                                                                                                             |
| `End`                                     | Focus last non-disabled option.                                                                                                                              |
| `Enter` or `Space`                        | Commit the focused option: fires `onKindChange(kind)`. If the focused option is already selected, no-op (no history entry, no log line).                     |
| `Escape`                                  | Cancel: restore focus to the trigger that opened the picker (if any) and revert `aria-activedescendant` to the currently selected option. No `onKindChange`. |
| Letter key `c/r/k/s/e` (case-insensitive) | Focus AND commit that kind in one keypress (typeahead shortcut).                                                                                             |

Focus trap: only while the picker is in a popover form. In inline segmented form (default in Rule Controller), the group participates in normal tab order without a trap.

## State events (must emit exactly one log line per user action)

- Commit (kind actually changes): `I_UI_RULE_KIND_CHANGED` with `rule_id`, `from`, `to`. Also pushes exactly 1 history entry `rule.kind-switch` (fixture F-UNDO-04).
- Commit on same kind: no log, no history.
- ESC cancel: `I_UI_KIND_PICKER_CANCELLED` with `rule_id`. No history.
- Attempt to focus a disabled option via typeahead: `W_UI_KIND_DISABLED` with `rule_id`, `kind`.

## Acceptance rows (fold into `97-acceptance-criteria.md` at step 100)

- **K-KBD-01** Arrow nav wraps and skips disabled options.
- **K-KBD-02** Enter/Space commits; same-kind commit is a no-op.
- **K-KBD-03** ESC restores focus AND fires `I_UI_KIND_PICKER_CANCELLED`.
- **K-KBD-04** Typeahead `c/r/k/s/e` commits directly.
- **K-KBD-05** Axe passes with 0 color-contrast and 0 role violations on the picker.

## Regression guards

- Component must not use native `<select>` (no OS-picker rendering; visual diff would fail at 1440x900 and 1024x768).
- No `onClick` handler may commit without also being reachable via keyboard (`onKeyDown` must produce equivalent behavior; Playwright asserts both paths).
- `tabindex` values must be exactly one `0` and rest `-1` at all times.

## Unblocks

Rule Controller implementation (step ~48) has an unambiguous a11y target, and ship-gate steps 94 (Axe) and 95 (keyboard-only pass) can lift these rows verbatim. Without this, keyboard support gets bolted on after the visual and fails ship gates.
