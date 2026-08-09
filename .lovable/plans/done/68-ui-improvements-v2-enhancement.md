# UI Improvements V2 Enhancement — consolidated status doc

Slug: ui-improvements-v2-enhancement
Steps: 10
Status: pending
Created: 2026-07-17

## Context

Rewrite `spec/24-app-ui-design-system/09-UI-improvements-v2.md` (the V2 UI backlog the user filed originally) as a single consolidated status file: what is DONE, what is PENDING, what is AMBIGUOUS. The consolidated file lives at the END of the spec-24 sequence (highest suffix so far is `99-consistency-report.md`) and its filename ends in `-v2-enhancement` so `rg v2` finds it every time. Primary inputs:

- `spec/24-app-ui-design-system/09-UI-improvements-v2.md` — the original V2 backlog.
- `.lovable/plans/done/66-ui-v3-missing-completion.md` — first execution wave.
- `.lovable/plans/done/67-ui-fluid-modern-v2-v3-completion.md` — 50-step execution wave that closed most V2 items.
- Adjacent done plans that touched V2 items: 24, 30, 31, 34, 37, 42, 43, 45, 64, 65.
- Adjacent spec files: 10-UI-improvements-v3.md, 38-header-breadcrumb.md, 40-menu-anti-jitter.md, 41-panel-docking-model.md, 42-drag-drop-running-pill.md, 43-rule-editor-toolbar.md, 97b-ui-acceptance-checklist.md, 98-changelog.md, 99-consistency-report.md.

No new commands or issues were filed this turn (planning-only). No captured-command / captured-issue links.

## Steps

1. Read the three primary inputs (spec 09, plan 66, plan 67) end-to-end and extract every distinct UI-improvement item into a flat scratch list. See ./subtasks/68-ui-improvements-v2-enhancement/SS-01-inventory-primary-inputs.md.
2. Cross-index each scratch-list item with the plan step + version that closed it, walking every other done plan (24, 30, 31, 34, 37, 42, 43, 45, 64, 65) plus `RELEASE_NOTES.md` and `CHANGELOG.md`. See ./subtasks/68-ui-improvements-v2-enhancement/SS-02-cross-index-closures.md.
3. Classify each item as `done` (closed with plan + version + verification), `pending` (open, link to pending plan), or `ambiguous` (mentioned but no clear closer, or contradicted by a later plan). See ./subtasks/68-ui-improvements-v2-enhancement/SS-03-classify-and-flag-ambiguities.md.
4. Decide the target filename + sequence for the consolidated file. Highest suffix in `spec/24-app-ui-design-system/` today is `99-consistency-report.md`; the user wants "the next one, at the end, findable by V2". Target: `spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md`. See ./subtasks/68-ui-improvements-v2-enhancement/SS-04-target-filename-decision.md.
5. Write the consolidated file skeleton (frontmatter + sections: `Done`, `Pending`, `Ambiguities`, `Cross-refs`, `How to update this file`) at the target path.
6. Fill the `Done` section: each item cites the closing plan number, closing subtask if any, closing version tag (e.g. `v3.416.0`), and one-line verification evidence (test suite / lint / screenshot / release note anchor).
7. Fill the `Pending` section: each item links to its owning pending plan under `.lovable/plans/pending/` (e.g. 29, 32, 35, 36, 41, 43-slice-x); no orphan items.
8. Fill the `Ambiguities` section: for each ambiguity, state the original spec-09 wording, the conflicting evidence, and the concrete decision needed from the user. Zero prose without a decision hook.
9. Wire the new file into the spec index: add a one-line pointer at the top of `spec/24-app-ui-design-system/09-UI-improvements-v2.md` ("SUPERSEDED — see 99d-ui-improvements-v2-enhancement.md"), add an entry in `spec/24-app-ui-design-system/00-overview.md`, and log the addition in `spec/24-app-ui-design-system/98-changelog.md`.
10. Verify + release: `rg -l 'UI improvements v2'` returns the new file, `bunx tsgo --noEmit` clean (no code changed but confirms nothing regressed), bump minor version, add CHANGELOG + RELEASE_NOTES entries, update README pinned version. Then move THIS plan file from `.lovable/plans/pending/68-*.md` to `.lovable/plans/done/68-*.md` and flip `Status:` to `completed` in the same move.

## Verification

- Step 1: scratch list committed under the subtask file with each item tagged with its source line.
- Step 2: every scratch-list item has at least one plan/version citation OR is flagged unresolved.
- Step 3: three disjoint buckets (done / pending / ambiguous); no item appears in two buckets.
- Step 4: single-line rationale recorded in the SS-04 subtask; filename choice is `99d-ui-improvements-v2-enhancement.md` unless the subtask overrides.
- Steps 5-8: `rg -n '^##' spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md` shows the four canonical sections; every listed item under `Pending` resolves to a real file in `.lovable/plans/pending/`.
- Step 9: `rg -n '99d-ui-improvements-v2-enhancement' spec/24-app-ui-design-system` returns the pointer + overview + changelog hits.
- Step 10: `bunx tsgo --noEmit` clean; new version tag present in `package.json`, `CHANGELOG.md`, `RELEASE_NOTES.md`, `README.md`; this plan file lives under `.lovable/plans/done/` with `Status: completed`.

## Appended from prior pending tasks

None. This plan is scoped strictly to consolidating the V2 backlog status; the sixteen existing pending plans (29, 32, 35, 36, 38, 39, 40, 41, 44, 46, 49, 50, 51, 52, 57, 58, 59, 61, 62, 63) remain in `.lovable/plans/pending/` and are only referenced from step 7 for cross-linking.
