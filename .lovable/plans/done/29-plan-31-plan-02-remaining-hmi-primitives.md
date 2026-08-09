# Plan 02 remaining: HMI primitives, nav-lock finish, token sweep

Slug: plan-02-remaining-hmi-primitives
Steps: 50
Status: done
Completed: 2026-07-15
Created: 2026-07-15

## Context

Plan 02 (Control Automation redesign) subtasks SS-01..SS-14 are partially
landed. Shell, GlobalNav lock, Titlebar, Viewport, StatusLog, Counter, and
route redirects for /setup and /settings while running are done. Remaining
work: missing primitives (ToolTile, RunButton, SettingsDialog), ToolRibbon
read-only mode during running, palette + type + oklch verification passes
(SS-01, SS-02), routes conformance (SS-04), elevation/focus tokens (SS-09),
and token-verify/compile linter passes (SS-10, SS-11).

Sources scanned: .lovable/plans/pending/28-30, .lovable/plans/subtasks/02-_,
spec/24-app-ui-design-system, spec/21-app/30-ui-overview.md, src/components/hmi/_,
src/routes/\*.

Related pending plans (not merged here, tracked separately):

- .lovable/plans/pending/29-denial-burst-threshold-tuning.md
- .lovable/plans/pending/30-app-ui-rule-editor-revamp.md
- .lovable/plans/pending/28-chromium-shell-spec.md (also in completed/, needs dedupe)

Coding guidelines consulted: .lovable/memory/01-code-red.md,
spec/coding-guidelines/typescript.md, spec/03-error-manage/,
spec/24-app-ui-design-system/07-errors-logging.md.

## Steps

1. Dedupe 28-chromium-shell-spec.md: confirm completed copy is authoritative, remove pending duplicate.
2. Read spec/24-app-ui-design-system/01-foundations.md and record delta vs current src/styles.css palette.
3. Read .lovable/plans/subtasks/02-control-automation-redesign/ss-01-palette-lock.md, confirm --ca-\* tokens present in styles.css.
4. Read ss-01-palette-options.md, mark accepted variant in a comment at top of styles.css.
5. Read ss-02-tokens-oklch.md, list any non-oklch color declarations under @theme.
6. Read ss-02-type-stack-lock.md, verify Inter + JetBrains Mono <link> tags in src/routes/\_\_root.tsx.
7. Read ss-03-component-inventory.md, list HMI primitives missing from src/components/hmi/.
8. Read ss-04-routes.md, diff against src/routes/ file list.
9. Read ss-05-nav-lock.md acceptance and confirm current setup.tsx/settings.tsx redirect landed.
10. Read ss-09-elevation-focus.md, list focus-ring token requirements.
11. Read ss-10-token-verify.md and ss-11-token-compile.md, note the linter scripts they call.
12. Create src/components/hmi/ToolTile.tsx primitive per SS-03 (48-64px tile, selected bg-ca-select).
13. Add ToolTile export to src/components/hmi/index.ts.
14. Create src/components/hmi/RunButton.tsx primitive: primary blue, disabled while running.
15. Add RunButton export to src/components/hmi/index.ts.
16. Create src/components/hmi/SettingsDialog.tsx: modal shell reusable by Camera/Trigger/Lighting.
17. Add SettingsDialog export to src/components/hmi/index.ts.
18. Refactor src/routes/settings.camera.tsx to wrap its body in SettingsDialog. See ./subtasks/31-plan-02-remaining-hmi-primitives/SS-01-settings-dialog-adoption.md
19. Refactor src/routes/settings.trigger.tsx to use SettingsDialog.
20. Refactor src/routes/settings.lighting.tsx to use SettingsDialog.
21. Refactor src/routes/run.tsx Run/Stop control to use RunButton primitive.
22. Refactor src/routes/setup.tsx tool tiles to consume ToolTile primitive. See ./subtasks/31-plan-02-remaining-hmi-primitives/SS-02-setup-tool-tile-migration.md
23. Extend ToolRibbon.tsx to accept an isReadOnly prop; render disabled state when true.
24. Wire ToolRibbon isReadOnly from useRunStore status === 'running' in setup.tsx.
25. Add pointer-events-none + aria-disabled on ribbon children when isReadOnly.
26. Add focus-visible ring token --ca-focus to styles.css per SS-09.
27. Apply focus-visible:outline utility to Button, ToolTile, RunButton, GlobalNav Link.
28. Verify contrast of --ca-focus against --ca-panel and --ca-panel-2 (WCAG 3:1 non-text).
29. Add missing dark-theme parity variables where SS-01 palette diff flagged gaps.
30. Run linter-scripts/check-forbidden-strings.py on src/components and src/routes.
31. Fix any hardcoded hex reported by the linter under src/components/hmi.
32. Fix any hardcoded hex reported under src/routes.
33. Add axe smoke test entry for /setup covering ToolTile disabled state contrast.
34. Add axe smoke test entry for /run covering RunButton disabled state contrast.
35. Regenerate tests/reports/a11y-axe.json and confirm zero color-contrast violations.
36. Add Playwright screenshot for /run at 1440x900 to visual snapshot suite.
37. Add Playwright screenshot for /setup at 1440x900.
38. Add Playwright screenshot for /settings/camera at 1440x900.
39. Update spec/24-app-ui-design-system/97-acceptance-criteria.md rows for R-\* covering new primitives.
40. Update spec/24-app-ui-design-system/00-overview.md hardcoded-hits table with post-sweep counts.
41. Update .lovable/plans/subtasks/02-control-automation-redesign/ss-03-component-inventory.md status to completed.
42. Update ss-05-nav-lock.md status to completed and note verification result.
43. Update ss-09, ss-10, ss-11 status to completed once linter passes.
44. Bump minor version via scripts/bump_minor.py per project convention.
45. Update .lovable/memory/04-design-system.md if primitive list changed.
46. Run tsgo typecheck across src/.
47. Run bunx vitest run for touched components.
48. Capture /run, /setup, /settings/camera screenshots via Playwright, save under /tmp/browser/plan-31/.
49. Attach screenshot references to this plan's Verification section.
50. Move this plan from pending/ to completed/ and flip Status frontmatter.

## Verification

- tsgo clean, vitest green for hmi/\* and route tests.
- linter-scripts/check-forbidden-strings.py exits 0 on src/components + src/routes.
- tests/reports/a11y-axe.json shows zero violations on /, /setup, /run, /errors, /ops, /settings/\*.
- Playwright screenshots under /tmp/browser/plan-31/ show ToolRibbon disabled during run, RunButton disabled while running, SettingsDialog shell on all three settings routes.
- Devtools: setState({status:'running'}) redirects /setup and /settings to /run; GlobalNav non-run items disabled; ToolRibbon read-only.

## Appended from prior pending tasks

- ss-01-palette-options, ss-01-palette-lock, ss-02-tokens-oklch, ss-02-type-stack-lock, ss-03-component-inventory, ss-04-routes, ss-05-nav-lock (final verification), ss-09-elevation-focus, ss-10-token-verify, ss-11-token-compile from .lovable/plans/subtasks/02-control-automation-redesign/.
