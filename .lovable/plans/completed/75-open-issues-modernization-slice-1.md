# Plan 75: Open issues modernization, granular slice (supersedes Plan 74)

Slug: open-issues-modernization-slice-1
Steps: 20
Status: pending
Created: 2026-07-18

## Context

Splits `.lovable/plans/pending/74-open-issues-modernization-sweep.md` (30 coarse steps) into a tighter 20-step plan focused on the six deferred open issues from Plan 73 closeout (`.lovable/memory/v2/plan73/44-issue-sweep.md`, `.lovable/memory/v2/plan73/90-closeout.md`):

- 09 setup UI not modern (`src/routes/setup.tsx`, `src/routes/setup.roi.tsx`, `src/routes/setup.reference.tsx`)
- 11 rule editor layers list mixed with detector controls (`RightRail.tsx`, `RuleList.tsx`, `CircleRuleEditor.tsx`, `LayersPanel.tsx`)
- 12 UI overlaps and excessive line density across screens (`HmiShell`, `Titlebar`, `TopMenuBar`, `SectionTopBar`)
- 13 home screen regression (`src/routes/index.tsx`)
- 14 src_v3 rollback regression (`src_v3/` removal)
- 15 global home navigation missing (app chrome home affordance)

Plan 74 is superseded on completion of step 20. Guideline sources to re-digest: `.lovable/coding-guidelines/coding-guidelines.md`, `spec/03-error-manage/**`, `.lovable/memory/03-error-manage.md`, `.lovable/memory/04-design-system.md` (Plan 73 closeout tokens: `--ca-on-primary`, tinted-primary pill pattern).

No new commands or issues emitted this turn (template-only header, scope answered via clarifying question).

## Steps

1. Digest guidelines + design tokens into `.lovable/memory/v2/plan75/00-guideline-digest.md` (coding-guidelines, error-manage, Plan 73 tokens).
2. Read issues 09, 11, 12, 13, 14, 15 end-to-end; write `.lovable/memory/v2/plan75/01-issue-map.md` with symptom, repro, suspect files, severity, and per-issue acceptance criteria.
3. Capture baseline screenshots (1280x1800, `comfortable` + `compact` header density) for `/`, `/setup`, `/setup/roi`, `/setup/reference`, `/setup/rules` under `/tmp/browser/plan75/baseline/`; commit inventory to `.lovable/memory/v2/plan75/02-baselines.md`.
4. Issue 13 fix: restore home launcher on `/` (Projects, Setup, Trial run, AI testing entries) per `.lovable/spec/commands/09-home-hub-top-nav.md`; keep frontend-only.
5. Issue 15 fix: add always-visible Home affordance in app chrome (Titlebar or breadcrumb root) and verify on every route.
6. Issue 14 fix: remove `src_v3/` and any residual imports; grep-verify zero references remain outside archived plans.
7. Verify 13/15/14 with Playwright: nav from `/setup`, `/projects`, `/setup/rules` back to `/` via Home affordance; screenshot each; write `.lovable/memory/v2/plan75/07-nav-verify.md`.
8. Issue 11 subtask, split layers from detector controls. See ./subtasks/75-open-issues-modernization-slice-1/SS-01-layers-vs-inspector.md.
9. Wire the new Inspector panel into the existing dock registry (`panel-registry.ts`) with `defaultFloatSize` and right-side default placement; no business logic change.
10. Vitest coverage for the split: layers panel renders without detector fields; inspector panel renders detector fields for the selected rule kind (circle, rect, ocr).
11. Issue 09 subtask, modernize setup surfaces. See ./subtasks/75-open-issues-modernization-slice-1/SS-02-setup-modernize.md.
12. Apply design-token sweep on `setup.tsx` / `setup.roi.tsx` / `setup.reference.tsx`: replace hardcoded colors with `--ca-*` tokens; enforce `--ca-on-primary` on primary surfaces.
13. Issue 12 fix pass A (chrome): deduplicate Titlebar vs TopMenuBar vs SectionTopBar stacking; enforce single nav layer + single context bar per route.
14. Issue 12 fix pass B (density): audit adjacent 1px borders on `/setup`, `/projects`, `/setup/rules`; collapse duplicates using spacing tokens (`--spacing-hmi-*`); verify at 1280x800 and 1920x1080.
15. Header-density verification: toggle `comfortable` / `compact` on all touched routes; screenshot; ensure no overlap or clipping. Write `.lovable/memory/v2/plan75/15-density-check.md`.
16. Run combined gate: `bunx tsgo --noEmit`, `bunx vitest run`, `python3 tests/e2e/axe_a11y.py`, `bun run visual:test`. Record output in `.lovable/memory/v2/plan75/16-gate.md`.
17. Regenerate Plan 69 visual baselines only if intentional diffs land in steps 4-14; document deltas in `.lovable/memory/v2/plan75/17-visual-refresh.md`.
18. Flip `Status: open` -> `Status: closed` in `.lovable/issues/{09,11,12,13,14,15}-*.md`; add a Closed-by frontmatter line pointing at Plan 75.
19. Supersede Plan 74: `mv .lovable/plans/pending/74-open-issues-modernization-sweep.md .lovable/plans/completed/` with `Status: superseded-by-plan-75`; move Plan 75 to `completed/` and flip its status; write `.lovable/memory/v2/plan75/90-closeout.md`.
20. Version bump + README pin (v3.511.0), append CHANGELOG + RELEASE_NOTES entries citing the six closed issues.

## Verification

- Step 1-3: memory files present under `.lovable/memory/v2/plan75/`.
- Step 4-7: Playwright screenshots show home launcher and global Home affordance; grep `-r "src_v3" src/` returns empty.
- Step 8-10: `bunx vitest run` includes new layers/inspector tests, all green.
- Step 11-15: visual diffs reviewed; density checks pass at both header modes; no overlap at 1280x800.
- Step 16: tsgo exit 0, vitest all passing, axe 0 violations, visual regression gate green (with refreshed baselines if step 17 fired).
- Step 18: `rg "Status: open" .lovable/issues/{09,11,12,13,14,15}-*.md` returns empty.
- Step 19: Plan 74 sits in `completed/` with `superseded-by-plan-75`; Plan 75 in `completed/` with `Status: completed`; closeout memo written.
- Step 20: `package.json`, `README.md`, `CHANGELOG.md`, `RELEASE_NOTES.md` all cite v3.511.0.

## Appended from prior pending tasks

- `.lovable/plans/pending/74-open-issues-modernization-sweep.md` (superseded by this plan at step 19).
- Other pending plans (29, 35, 36, 40, 41, 44, 49, 50, 51, 52, 58, 59, 61, 62, 63, 71, 72) remain out of scope and untouched; they are queued independently.
