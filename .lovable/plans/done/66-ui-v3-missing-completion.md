# UI v3 missing-row completion, 30 steps

Slug: ui-v3-missing-completion
Steps: 30
Status: done (absorbed by Plan 67, v3.415.0)
Created: 2026-07-17

## Context

Consolidates every MISSING or PARTIAL row from `spec/24-app-ui-design-system/10-UI-improvements-v3.md` into a single execution stream. One AI turn = one step, each ending with typecheck + lint + unit + e2e green per `.lovable/spec/commands/24-cicd-lint-integration.md`. UI must not visually regress: every step lands behind an incremental patch, verified via Playwright screenshot of the affected surface before moving on. The plan supersedes the still-open UI parts of plans 35, 36, 37, and 65 for the rows it covers, and pulls in unresolved threads from those plans (see appended list).

Captured this turn:

- Spec revamp: `spec/24-app-ui-design-system/10-UI-improvements-v3.md`
- Command: `.lovable/spec/commands/24-cicd-lint-integration.md`
- Ambiguities: `.lovable/ambiguity-questions/02-ui-v3-open-questions.md`

Guideline sources honored:

- `coding-guidelines/` (root), `spec/02-coding-guidelines/`, `spec/03-error-manage/`, `.lovable/coding-guidelines/coding-guidelines.md`
- Design tokens: `coding-guidelines/07-design-system/` (via `src/styles.css`)
- Existing plan artifacts under `.lovable/memory/v2/plan65/`

## Steps

1. Baseline snapshot: run `bunx tsgo --noEmit`, `bun run lint`, `bunx vitest run`, `python3 tests/e2e/playwright_home.py`, `python3 tests/e2e/playwright_smoke.py`. Record results in `.lovable/memory/v2/plan66/00-baseline.md`. Any red step is fixed here before any feature work.
2. Answer or accept defaults for ambiguities Q1, Q2, Q4, Q6, Q7, Q8, Q10 in `.lovable/ambiguity-questions/02-ui-v3-open-questions.md`. Non-blocking questions land as "default accepted".
3. SH-01: eliminate the duplicate header. Audit `AppHeader`, `HmiShell`, `SectionTopBar`. See `./subtasks/66-ui-v3-missing-completion/SS-01-single-header.md`.
4. SH-04: browser-style Back button component wired into `AppHeader` with route-parent fallback per Q4. Cover with Playwright: navigate deep, click back, assert URL.
5. SH-03: multi-segment breadcrumb component driven by TanStack Router match tree. Replace ad-hoc chips.
6. SH-05: make `RunningPill` draggable, stoppable, click-to-jump. Persist position in localStorage. See `./subtasks/66-ui-v3-missing-completion/SS-02-floating-pill.md`.
7. SH-06 + SH-07: Command palette (`Cmd/Ctrl+Shift+P`) and Window menu that reopen closed panels. Use shadcn Command per Q3. Register every route and every panel id.
8. SU-06: YAML export/import parity for project bundles. Extend `src/lib/projects/bundle.ts`; use `yaml` npm package. Round-trip test against fixture JSON.
9. SU-07: SQLite-zip decision per Q2. If (a) accepted, wire `sql.js`; if (c) accepted, emit warning zip. Ship whichever is picked; document the other in the deferred row.
10. RE-01..RE-04: unify panels under a single `DockableFrame` primitive that supports dock / float / minimize / hide. Migrate Layers, Tools, Properties, Preview in one commit. See `./subtasks/66-ui-v3-missing-completion/SS-03-dockable-frame.md`.
11. RE-08: Design Mode compile-to-SVG. Add a `compileDesignShape` util that flattens the current overlay to an SVG string. Unit test round-trip.
12. RE-09: custom-shape SVG export button in Design Mode; SVG import button on the Layers panel. Store on the rule as `shapeSvg`.
13. RE-10: image-mask primitive. New rule kind `Mask`, accepts raster or SVG, feeds ROI clipping.
14. RP-06 Flaw Detection primitive per Q7. Register rule kind, parameter form, canvas renderer, validation stub.
15. RP-07 Barcode / QR primitive per Q6. Register rule kind, decoder call, decoded-text field on the rule.
16. RP-08 Blob Detection primitive: rule kind, parameter form (min area, max area, threshold), canvas overlay.
17. RP-09 + RP-10: Edge Width and Edge Pitch primitives. Share a `LineTool` param form.
18. RP-11 Positional Adjustment primitive: reference-anchor picker + translate/rotate params.
19. RP-12 Color / Mat primitive: color-space picker + tolerance sliders.
20. FS-01: JS function library route at `/setup/functions`. List, edit (monaco), import, export. Persist in existing store; unit test the CRUD.
21. FS-02: chain-events UI on the rule inspector: pick upstream rule -> function -> downstream rule.
22. PR-02: close `.lovable/issues/16-project-section-create-flow-broken.md`. Reproduce with Playwright, patch, add regression test.
23. PR-03: AI settings placeholder card inside project detail. Cover with a smoke test.
24. PR-05: category auto-apply resolver per Q8. Unit test the resolver; integration test the project detail view.
25. RN-01..RN-05: rebuild Run picker. Multi rule-set select, override-chain view, verification-image preview, inline edit jump, expected-image-count field. See `./subtasks/66-ui-v3-missing-completion/SS-04-run-picker.md`.
26. CX-01: sweep hardcoded Tailwind color utilities. Grep `text-white|bg-black|bg-\[#`, migrate to tokens, fail lint if reintroduced (add ESLint rule).
27. CX-02: register every remaining user-facing failure code in `src/lib/errors/registry.ts`; wire toasts through the shared `reportError` bus.
28. CX-04: Playwright visual-regression suite for AppHeader, DockableFrame, RunningPill, Home, Rules editor, Run picker. Store baselines under `tests/reports/screenshots/`.
29. CX-03: CI/CD entrypoint per `.lovable/spec/commands/24-cicd-lint-integration.md`. Add `bun run ci` that runs typecheck + lint + unit + e2e. Wire chosen provider per Q10 (default GitHub Actions).
30. Closeout: bump `package.json`, update `CHANGELOG.md`, `RELEASE_NOTES.md`, `README.md`. Update `spec/24-app-ui-design-system/10-UI-improvements-v3.md` status matrix, flip every closed row to DONE, and move this plan to `.lovable/plans/done/66-ui-v3-missing-completion.md` (repo convention uses `done/` in place of `completed/`).

## Verification

- Every step ends with a CI line: "CI: green (typecheck / lint / unit / e2e)". Missing means the step reopens.
- Every UI-affecting step (3-7, 10-25, 28) attaches a Playwright screenshot under `tests/reports/screenshots/plan66/<step>/`.
- Every new primitive (14-19) ships with a unit test on parameter validation and a canvas smoke test.
- Final step 30 confirms the status matrix in the v3 spec matches the code and that no row moved backwards.

## Appended from prior pending tasks

Pulled from `.lovable/plans/pending/` scan (rows this plan touches, ordered):

- 35 UI/UX Photoshop layers overhaul: layers/properties split -> steps 10, 12.
- 36 App shell + src v3 port: header + shell -> steps 3, 5.
- 37 Home Dexter UI repair: home content -> already DONE per HM-01..HM-05; only HM-04 copy pass remains, folded into step 5.
- 40 Tools images spec docs: tool tile imagery -> deferred; not in this plan.
- 41 Keyboard/DND/code-quality pass -> step 26 (lint sweep) + step 10 (DND under DockableFrame).
- 42 Rule conditions and validation order -> step 21 (chain events).
- 65 Photoshop panels + Window menu + command palette -> steps 7 and 10 supersede.
- Plans 44, 46, 49, 50, 51, 52, 57, 58, 59, 61, 62, 63 are execution slices of prior plans and remain their own streams; this plan does not fold them in.

Ambiguity list controls whether a row proceeds: any question flagged blocking in `.lovable/ambiguity-questions/02-ui-v3-open-questions.md` gates its step until answered.
