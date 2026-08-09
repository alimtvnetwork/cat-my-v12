# Rule modals redesign subtask

Slug: rule-modals
Parent: 81-settings-rules-and-misc-polish
Status: pending
Created: 2026-07-18

## Scope

Rebuild Create / Duplicate / Rename Rule dialogs at `src/components/rules/*Modal.tsx` to match the Projects create dialog: 2-column layout with a live preview on the right.

## Details

- Left column: name, kind (radio row with icons), category picker, appliesBefore multiselect.
- Right column: live thumbnail of default ROI for the selected kind, colored by kind token.
- Validation: name required, no duplicate slug in facade, cycle guard via detectProjectRuleConflicts on appliesBefore selection.
- Reuse `SettingsCard` header styling for section titles inside the dialog.
- Keyboard: Enter submits when valid, Esc cancels, Tab order left-to-right then footer.
- Tests: modal snapshot per kind, cycle rejection surfaces toast via error store.
