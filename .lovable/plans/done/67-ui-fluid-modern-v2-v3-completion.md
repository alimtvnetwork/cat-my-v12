# UI fluid + modern completion (v2/v3 pending rows)

Slug: ui-fluid-modern-v2-v3-completion
Steps: 50
Status: done
Created: 2026-07-17

## Context

User asked to check `spec/24-app-ui-design-system/09-UI-improvements-v2.md`
and, since v2 is superseded by `10-UI-improvements-v3.md`, plan every row
still marked MISSING or PARTIAL there, plus the docking / dragging / header
/ breadcrumb / editor-menu polish captured this session. Priority is
"fluid + modern": rule creation, project creation, connecting projects
with rules, and the full editor panel system.

Related, still-open specs and issues:

- `spec/24-app-ui-design-system/09-UI-improvements-v2.md` (history, kept)
- `spec/24-app-ui-design-system/10-UI-improvements-v3.md` (source of truth)
- `.lovable/plans/pending/66-ui-v3-missing-completion.md` (parent stream; this plan is the fluid-polish + connect-flow slice of it, does not replace it)
- `.lovable/issues/09-setup-ui-not-modern.md`
- `.lovable/issues/16-project-section-create-flow-broken.md`
- `.lovable/issues/21-panels-not-draggable-floatable.md`
- `.lovable/issues/22-duplicate-header-still-present.md`

Execution rule: one AI turn = one step. Each step ends with typecheck +
lint + unit + relevant e2e green per `.lovable/spec/commands/24-cicd-lint-integration.md`,
plus a Playwright screenshot for any UI-affecting step under
`tests/reports/screenshots/plan67/<step>/`. Version bumps + CHANGELOG +
RELEASE_NOTES + README pin land at step 50, not per step, unless the user
says "slice it".

## Steps

1. Baseline: run tsgo, lint, vitest, playwright_home, playwright_smoke; record in `.lovable/memory/v2/plan67/00-baseline.md`.
2. Drag initiator: move `DockableFrame` drag start from full titlebar to the `GripVertical` handle only; cursor `grab` to `grabbing`; keep keyboard focus intact.
3. Drop-zone overlay: render top, left, right, bottom, center hit regions with token-based highlight while a panel is dragged; snap preview rectangle before drop.
4. Snap + settle spring animation on dock (framer-motion) with `prefers-reduced-motion` guard.
5. Panel-mobility fix: docked panels keep a visible grip so they can be redragged (closes `.lovable/issues/21`).
6. Panel state model: dock, float, minimize, hide persisted per-workspace in `palette-store`; restore on reload.
7. Window menu wiring: `TopMenuBar` Window submenu lists every registered panel with checkmarks; toggling reopens.
8. Command palette: shadcn Command dialog on `Cmd/Ctrl+Shift+P`; index routes, panels, rule kinds.
9. Editor-mode menu gating: menu hides Window/Panel entries outside editor routes; shows them only when a `DockableFrame` host is mounted.
10. Header rebuild: `Titlebar` 3-column grid (menu, breadcrumb, window controls); `min-w-0`, `shrink-0`, `truncate`; single `<header>` guaranteed.
11. Breadcrumb polish: multi-segment breadcrumb driven by TanStack match tree; project/ruleset names resolved from store not URL id.
12. Back / Forward: browser-style buttons in header with route-parent fallback (SH-04); Playwright deep-nav test.
13. Running pill drag: `RunningPill` becomes draggable, position persisted, click-to-jump to source route (SH-05).
14. Menu anti-jitter: fixed padding and hit-box on hover; no reflow (verify with `topnav_no_cls`).
15. Setup landing polish: three-tile animated hover (Camera, Rules, Lighting) with token-only colors.
16. Lighting setup surface (SU-04): controls scaffold (exposure, gain, enhance, darken) wired to store; backend TBD.
17. Rule editor shell: remove leftover Program panel + left-chevron arrow; layers row full-width; chevron on the right.
18. Layers panel: dock, float, minimize with header grip; count badge; keyboard reorder.
19. Tools ribbon: dock, float, minimize; tool tiles keep aria-hidden when disabled.
20. Properties panel: dock, float; per-rule-kind form.
21. Preview panel: minimize / maximize toggle; keeps aspect ratio; screenshot capture button.
22. Rule creation UX: New Rule / Category Rule / Task Rule chooser with default-name sequence "Rule Set 01".
23. Reference vs Copy clone: visual chain badge on cloned rulesets; hover shows source ruleset name.
24. Design Mode SVG compile (RE-08): `compileDesignShape` util; round-trip unit test; toolbar Compile button.
25. Custom-shape SVG export button (RE-09) on the editor toolbar; SVG import on Layers header.
26. Image-mask primitive (RE-10): rule kind `Mask`, accepts raster or SVG, clips ROI in canvas.
27. Circular ROI parameter form (RP-02): radius + center; validation guard.
28. OCR primitive wiring (RP-04): text-region form + validate-against-image happy path (mock backend ok).
29. Flaw Detection primitive (RP-06): rule kind, parameter form, canvas renderer, validation stub.
30. Barcode / QR primitive (RP-07): decoder call, decoded-text field on the rule, expose to chain events.
31. Blob Detection primitive (RP-08): min area / max area / threshold; canvas overlay.
32. Edge Width primitive (RP-09) + shared LineTool form.
33. Edge Pitch primitive (RP-10) reusing LineTool form.
34. Positional Adjustment primitive (RP-11): anchor picker + translate / rotate params.
35. Color / Mat primitive kind wiring (RP-12): color-space picker + tolerance sliders in a picker UI.
36. JS function library route (FS-01): `/setup/functions` with list, Monaco edit, JSON import/export; wire to existing library store.
37. Chain events inspector (FS-02): pick upstream rule, function, downstream rule; sandboxed invoker.
38. Project create flow fix (PR-02): reproduce `.lovable/issues/16`, patch dead ends, regression test.
39. Project detail AI settings placeholder card (PR-03).
40. Category auto-apply resolver (PR-05): pure function + integration test; project detail shows resolved rules.
41. Rules to Project connect UI: multi-select rule sets on project detail, override chain preview.
42. Run picker rebuild (RN-01..05): multi rule-set select, override-chain view, verification-image preview, inline edit-jump, expected-image-count field.
43. Validate Against Image dialog polish: image thumbnail strip + last-result badge.
44. Color-token sweep (CX-01): grep `text-white|bg-black|bg-\[#`; migrate + add ESLint rule to block regressions.
45. Error registry wiring (CX-02): every user-facing failure code registered + toasted via `reportError` bus.
46. Playwright visual-regression baselines (CX-04) for AppHeader, DockableFrame, RunningPill, Home, Rules editor, Run picker.
47. Accessibility pass: axe 0 serious/critical on /, /setup, /setup/rules, /projects, /projects/$id, /run.
48. CI entrypoint (CX-03): `bun run ci` runs typecheck + lint + unit + e2e; GitHub Actions workflow.
49. Update v3 status matrix in `spec/24-app-ui-design-system/10-UI-improvements-v3.md`; flip every row this plan closed to DONE.
50. Closeout: bump `package.json` minor, update `CHANGELOG.md`, `RELEASE_NOTES.md`, `README.md` pin; `mv` this file to `.lovable/plans/done/67-ui-fluid-modern-v2-v3-completion.md` and flip `Status:` to `done`.

## Verification

- Every step ends with a CI line: "CI: green (typecheck / lint / unit / e2e)".
- Every UI-affecting step attaches a Playwright screenshot under `tests/reports/screenshots/plan67/<step>/`.
- Every new primitive (steps 26-35) ships with a unit test on parameter validation plus a canvas smoke test.
- Step 49 confirms the v3 status matrix matches code.

## Appended from prior pending tasks

Rows still open in `.lovable/plans/pending/` that this plan touches directly:

- 35 UI/UX Photoshop layers overhaul: steps 17-21.
- 36 App shell + src v3 port: steps 10-12.
- 37 Home Dexter UI repair (HM-04 copy): folded into step 11 breadcrumb + step 47 axe pass.
- 41 Keyboard / DND / code-quality pass: steps 2-6 (DND) + step 44 (lint).
- 42 Rule conditions and validation order: step 37 (chain events).
- 65 Photoshop panels + Window menu + command palette: steps 6-8.
- 66 UI v3 missing-completion: parent stream; this plan is its fluid-polish slice, no rows dropped.

Plans 29, 32, 43-52, 57-63, 64 remain their own streams and are not folded in.

## Ambiguity

If any row in `.lovable/ambiguity-questions/02-ui-v3-open-questions.md` is
flagged blocking, the corresponding step waits until answered; unblocked
rows proceed with the default recorded in that file.
