# Plan 77 dispatch: open decisions to unblock V2 pending queue

Created: 2026-07-18
Owner: user answers required

This document consolidates every question the user must answer to unblock the 9 remaining V2 "Pending" items and open issue 16. Answering all of them in one turn allows Plan 77's execution slice to begin without further round-trips.

## Section A: V2 ambiguities (from `03-v2-enhancement-open-decisions.md`)

**A-01. Recent Projects surface on Home (unblocks I-PR-08).**
Spec 09 L26 says "drop-down button on Home". Home currently shows workflow cards (v3.432.0).

- Answer options: (a) dropdown button, (b) dedicated "Recent" section under cards, (c) drop the requirement.
- Expected format: single letter.

**A-02. `data/<ruleset>/<ruleId>/{image, rules.json}` folder layout (unblocks I-BE-03, I-PR-07).**
Spec 09 L28 mandates a filesystem layout. Storage is currently IDB via SDK facade (v3.418.0).

- Answer options: (a) required export shape when SQLite returns, (b) obsolete now that facade owns storage, (c) required immediately as a browser-downloadable zip.
- Expected format: single letter + one-line reasoning.

**A-03. Barcode chain-event exposure (unblocks I-FS-03).**
Barcode primitive stores decoded text on rule (v3.375.0) but `/setup/chain-events` (v3.409.0) does not expose it.

- Answer options: (a) expose as `Rule.<id>.decodedText` variable, (b) publish to a named event stream, (c) both.
- Expected format: single letter.

**A-04. DEC-04 persistence envelope (unblocks I-PR-07, I-BE-02).**
No decision recorded on what a project zip envelope contains.

- Answer options: (a) IDB dump only, (b) IDB dump + rules JSON + images, (c) full SQLite when it returns.
- Expected format: single letter.

**A-05. V2 reference images relocation (unblocks I-MT-01).**
Screenshots live under `spec/24-app-ui-design-system/assets/`, not `src/assets/`.

- Answer options: (a) move to `src/assets/v2-reference/`, (b) leave in spec folder, (c) delete after V2 closeout.
- Expected format: single letter.

## Section B: Issue 16 (project create flow blockers)

From `.lovable/memory/v2/plan76/13-issue-16-triage.md`. Answer each in one line.

- Q1. What fields are required on a new project? (name, category, ruleset, camera settings, other?)
- Q2. Is category free-text with autocomplete from existing, or fixed enum?
- Q3. Must a project have at least one ruleset at creation time, or can it be empty?
- Q5. Camera settings shape (resolution, FPS, exposure, gain) or reference to a saved camera preset?
- Q6. Where does the project persist first: IDB via facade, or does it round-trip through a server function?
- Q7. What is the success state after save (redirect to project detail, stay on list, toast only)?
- Q13. Uniqueness rule for project name (per user, global, none)?
- Q16. On failure (validation or persistence), where is the error shown (inline field, top banner, GlobalErrorModal)?

## Section C: External gate (no user answer needed)

- I-BE-04 (Python endpoint mapping table) is blocked on the worker-process build landing. Not surfaced here.

## How to reply

Paste answers as `A-01: a`, `Q1: name, category, ruleset`, etc. Anything unanswered stays blocked.
