# Open issues modernization sweep (issues 09, 11, 12, 13, 14, 15)

Slug: open-issues-modernization-sweep
Steps: 30
Status: pending
Created: 2026-07-18

## Context

Plan 73 (`.lovable/plans/completed/73-ui-issues-closeout-sweep.md`) closed issues 17-26 and Plan 43 slice 3. Six open issues were explicitly deferred at Plan 73 step 44 (`.lovable/memory/v2/plan73/44-issue-sweep.md`) and re-referenced in the closeout memo (`.lovable/memory/v2/plan73/90-closeout.md`):

- 09 setup UI not modern (`src/routes/setup.tsx`, `src/routes/setup.roi.tsx`, `src/routes/setup.reference.tsx`)
- 11 rule editor layers list mixed with detector-specific controls
- 12 UI overlaps and excessive line density across screens
- 13 home screen regression
- 14 src_v3 rollback regression
- 15 global home navigation missing

Coding-guideline sources to re-digest: `.lovable/coding-guidelines/coding-guidelines.md`, `spec/03-error-manage/**`, `.lovable/memory/03-error-manage.md`, `.lovable/memory/04-design-system.md` (Plan 73 closeout tokens including `--ca-on-primary` and tinted-primary pill pattern).

## Steps

1. Read every open issue file (09, 11, 12, 13, 14, 15) end-to-end and record symptom, repro path, suspected files, and severity in `.lovable/memory/v2/plan74/01-issue-map.md`.
2. Re-digest coding + design-system guidelines into `.lovable/memory/v2/plan74/00-guideline-digest.md`; call out the `--ca-on-primary` and tinted-primary rules from Plan 73.
3. Capture baseline screenshots at 1280x1800 for `/`, `/setup`, `/setup/roi`, `/setup/reference`, `/setup/rules` under `/tmp/browser/plan74/baseline/`.
   4-6. Issue 13 (home screen regression): repro, minimum-correct fix, verify.
   7-9. Issue 15 (global home navigation missing): repro, fix, verify (blocks routing sanity for 09/11/12 flows).
   10-12. Issue 14 (src_v3 rollback regression): repro, fix, verify.
   13-16. Issue 09 (setup UI not modern): audit `setup.tsx` / `setup.roi.tsx` / `setup.reference.tsx`, apply density + token-driven modernization, verify visual diff.
   17-20. Issue 11 (layers list mixed with detector controls): split concerns in `RuleEditorDrawer.tsx` + `LayersPanel.tsx`, verify no regressions in rules flow.
   21-24. Issue 12 (UI overlaps and density): sweep affected screens; align to header-density and spacing tokens; verify at both `comfortable` and `compact`.
4. Run combined gate: `bunx tsgo --noEmit`, `bunx vitest run`, `python3 tests/e2e/axe_a11y.py`, `visual:test`.
5. Refresh Plan 69 visual baselines if intentional diffs land.
6. Move all closed issue files' frontmatter `Status: open` -> `Status: closed`.
7. Move `.lovable/plans/pending/74-*.md` -> `completed/` and flip status.
8. Closeout memo `.lovable/memory/v2/plan74/90-closeout.md`.
9. Final version bump + README pin.

## Verification

- All six issues flip to `Status: closed`.
- tsgo exit 0.
- vitest all passing.
- axe 0 violations.
- Visual baselines refreshed if diffs are intentional.
- Closeout memo written; plan moved to `completed/`.
