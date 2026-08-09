# Plan 75 - Step 18 (Issue closures)

Date: 2026-07-18
Version: v3.519.0

Flipped `Status: open` -> `Status: closed` and stamped `Closed-by: Plan 75` / `Closed-on: 2026-07-18` on the six issues that were Plan 75 scope:

| Issue | Title                               | Closed by (Plan 75 step)                                |
| ----- | ----------------------------------- | ------------------------------------------------------- |
| 09    | setup-ui-not-modern                 | Step 12 (setup hub restructure)                         |
| 11    | layers-mixed-with-detector-controls | Steps 9-10 (Inspector/Layers split + registry defaults) |
| 12    | ui-overlap-and-density              | Steps 13-15 (chrome dedup + density verification)       |
| 13    | home-screen-regression              | Step 4 (Home launcher verify)                           |
| 14    | src-v3-rollback-regression          | Steps 5-6 (src_v3 removal)                              |
| 15    | global-home-menu-missing            | Steps 7-8 (`GlobalHomeAffordance`)                      |

Green gate cited: `bun run visual:test` 36/36, `bunx tsgo --noEmit` clean, `bunx vitest run` 722/722, axe 0 violations.
