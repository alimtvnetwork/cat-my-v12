# Step 33: hardcoded hits ledger

Root cause: SS status flips require an explicit exception ledger for every remaining raw color literal in `src/`, and that ledger was missing.

Files read:

- `spec/coding-guidelines/typescript.md:16-20`, token rule.
- `src/lib/error-page.ts:1-30`, standalone fallback HTML and inline CSS.
- `linter-scripts/forbidden-strings.toml:1-118`, current forbidden-string rules.
- `linter-scripts/forbidden-strings-summary.py:197-239`, summary output behavior.
- `.lovable/plans/subtasks/31-plan-02-remaining-hmi-primitives/acceptance.md:17-36`, current SS-02 and cross-cutting acceptance rows.
- `.lovable/plans/subtasks/31-plan-02-remaining-hmi-primitives/notes-step-11-linter-scripts.md:27-41`, named verification gates.

Before signal:

- `test -f .lovable/plans/subtasks/31-plan-02-remaining-hmi-primitives/hardcoded-hits.md`: missing.
- `rg -n "#[0-9A-Fa-f]{3,8}|rgba?\(|hsla?\(" src`: 4 matching lines, all in `src/lib/error-page.ts:9,12,15,16`.
- `python3 linter-scripts/check-forbidden-strings.py`: PASS.

Fix:

- Created `.lovable/plans/subtasks/31-plan-02-remaining-hmi-primitives/hardcoded-hits.md` with one row for each remaining raw-color line and a bootstrap-fallback justification.

After signal:

- To be verified immediately after file creation: ledger exists and the raw color sweep still reports only the documented fallback lines.

Next 1 Step: Step 34 - flip SS-01 and SS-02 status files to completed.

- Reasoning: Acceptance rows and the hardcoded-hits ledger now exist, so the two SS files can be marked complete without skipping required evidence.
- Time estimate: 10 min.
- What it unblocks: Remaining SS status flips and release bookkeeping.

Remaining after Step 34:

- Flip remaining SS status files backed by existing notes.
- Minor version bump.
- Changelog update.
- Release notes update.
- README version pin if the root README has a version pin location.
- Memory update if project-level rules changed.
- `bunx tsgo --noEmit`.
- `bunx vitest run` or existing targeted test command.
- Final verification.
- Move plan 31 to completed.
