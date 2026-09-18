# Acceptance rows: plan 31 (remaining HMI primitives)

Evidence artifacts:

- artifacts/setup.png (Playwright, 1280x1800, /setup, step 31)
- artifacts/run.png (Playwright, 1280x1800, /run, step 31)

## SS-01 SettingsDialog adoption

| #   | Criterion                                                         | Evidence                                                                                                                 | Verdict |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------- |
| A1  | settings.camera renders via hmi/SettingsDialog                    | src/routes/settings.camera.tsx uses `<SettingsDialog>` shell (notes-step-17)                                             | PASS    |
| A2  | settings.trigger renders via hmi/SettingsDialog                   | src/routes/settings.trigger.tsx (notes-step-18)                                                                          | PASS    |
| A3  | settings.lighting renders via hmi/SettingsDialog                  | src/routes/settings.lighting.tsx (notes-step-19)                                                                         | PASS    |
| A4  | Escape closes via router.history.back(), focus returns to invoker | src/components/hmi/SettingsDialog.tsx onOpenChange -> router.history.back(); Radix Dialog restores focus (notes-step-16) | PASS    |
| A5  | Form fields and submit handlers preserved                         | Diff scope in notes-step-17/18/19 limited to chrome/header/footer                                                        | PASS    |

## SS-02 Setup tool tile migration

| #   | Criterion                                                   | Evidence                                                                          | Verdict |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- | ------- |
| B1  | src/routes/setup.tsx tiles use hmi/ToolTile                 | notes-step-21-setup-tooltile.md; ToolRibbon renders ToolTile with role="radio"    | PASS    |
| B2  | Selection binding preserved                                 | ToolTile `selected` prop wired to setupStore active tool (notes-step-21)          | PASS    |
| B3  | Keyboard nav preserved (Arrow / Home / End / Space / Enter) | radiogroup roving tabindex in ToolRibbon (notes-step-22)                          | PASS    |
| B4  | Disabled tile aria treatment correct                        | ToolTile disabled -> aria-disabled + tabIndex=-1; not aria-hidden (notes-step-22) | PASS    |
| B5  | Muted text contrast >= 4.5:1 (no opacity-40 leaks)          | notes-step-25-contrast-verify.md computed values                                  | PASS    |
| B6  | No hardcoded color utilities in tile                        | text-white removed, replaced with text-ca-ink on selected (notes-step-26)         | PASS    |
| B7  | axe: no critical/serious on /setup                          | notes-step-27 (5 -> 1), step-28 landmarks, step-29 nested-interactive, step-30 h1 | PASS    |
| B8  | axe: no critical/serious on /run                            | notes-step-27 (/run 1 -> 0 after step-28)                                         | PASS    |

## Cross-cutting

| #   | Criterion                                     | Evidence                                                        | Verdict |
| --- | --------------------------------------------- | --------------------------------------------------------------- | ------- |
| C1  | Single visible h1 per route inside a landmark | step-31 snapshots: /setup=["Program 01"], /run=["Run"]; mains=1 | PASS    |
| C2  | Focus-visible token unified as --ca-focus     | notes-step-23, step-24 sweep                                    | PASS    |
| C3  | Zero console/pageerror on /setup and /run     | step-31 harness output                                          | PASS    |
