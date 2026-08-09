# Plan 76 Step 16 - Plan 36 rescope in place

Date: 2026-07-18
Version: v3.522.0
Subtask: SS-03

## Action

Edited `.lovable/plans/pending/36-ui-app-shell-and-src-v3-port.md` frontmatter to insert a "Rescope note (2026-07-18, Plan 76 SS-03)" block after the existing Revision note. The note documents:

- `src_v3/` removed under Plan 75 (issue 14 closed); frozen manifest prep step obsolete.
- Titlebar / dock / breadcrumb / menubar shipped under Plans 67 and 75.
- App-mode switching under Plan 43; global error dialog under Plan 71.
- Seed / bundle facade under Plan 72 (issue 26 closed).
- Residual scope is umbrella-only, delegated to Plans 61 (slice-1 shell), 62 (theme tokens), 63 (nav sidebar). Do not execute steps 4-50 directly under Plan 36; open a fresh slice plan for any residual work.

Plan 36 itself is NOT moved or deleted; it remains the umbrella pointer for 61/62/63 as SS-03 specified.

## Verification

`grep -n "Rescope note (2026-07-18, Plan 76 SS-03)" .lovable/plans/pending/36-ui-app-shell-and-src-v3-port.md` => hit at line ~13. Original 50-step body preserved intact below the note.

## Impact

Downstream slice plans (61/62/63) now inherit an accurate umbrella context. The next triage pass over `.lovable/plans/pending/` will not misread Plan 36 as "50 steps to execute".
